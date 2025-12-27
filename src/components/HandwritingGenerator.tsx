import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import { getHtmlTemplate } from '../utils/htmlTemplate';
import { ErrorCode } from '../utils/errorUtils';

export interface GenerationConfig {
    font?: string;
    inkColor?: string;
    paperLines?: boolean;
    paperMargin?: boolean;
    effect?: 'shadows' | 'scanner' | 'no-effect';
    fontSize?: number;
    pageSize?: string;
    topPadding?: number;
    wordSpacing?: number;
    letterSpacing?: number;
    quality?: 'low' | 'medium' | 'high';
    spellingMistakes?: 0 | 3 | 5 | 10;
}

export interface HandwritingGeneratorRef {
    updatePreview: (text: string, config: GenerationConfig) => void;
    generateImage: (text: string, config: GenerationConfig) => void;
    downloadPDF: () => void;
    // Note: PDF text extraction uses WebViewContext.usePdfOperations() instead
    isReady: () => boolean;
}

interface Props {
    onImagesGenerated: (images: string[]) => void;
    onPdfGenerated?: (base64Data: string) => void;
    onPdfTextExtracted?: (text: string) => void;
    onError?: (error: string, code?: string) => void;
    onReady?: () => void;
    style?: object;
}

interface QueuedMessage {
    message: object;
    requiresInternet?: boolean;
}

const HandwritingGenerator = forwardRef<HandwritingGeneratorRef, Props>(
    ({ onImagesGenerated, onPdfGenerated, onPdfTextExtracted, onError, onReady, style }, ref) => {
        const webViewRef = useRef<WebView>(null);
        const [isConnected, setIsConnected] = useState<boolean | null>(true);
        const [webViewReady, setWebViewReady] = useState(false);
        const [webViewKey, setWebViewKey] = useState(0); // Key to force WebView remount
        const messageQueue = useRef<QueuedMessage[]>([]);

        // Monitor network connectivity
        useEffect(() => {
            const unsubscribe = NetInfo.addEventListener(state => {
                setIsConnected(state.isConnected);
            });
            return () => unsubscribe();
        }, []);

        // Process queued messages when WebView becomes ready
        useEffect(() => {
            if (webViewReady && messageQueue.current.length > 0) {
                messageQueue.current.forEach(({ message }) => {
                    webViewRef.current?.postMessage(JSON.stringify(message));
                });
                messageQueue.current = [];
            }
        }, [webViewReady]);

        // Check connectivity and show alert if offline
        const checkConnectivity = useCallback((): boolean => {
            if (!isConnected) {
                Alert.alert(
                    'No Internet Connection',
                    'This app requires an internet connection. Please connect and try again.',
                    [{ text: 'OK' }]
                );
                return false;
            }
            return true;
        }, [isConnected]);

        // Send message to WebView with queueing support
        const sendMessage = useCallback((message: object, requiresInternet = true) => {
            // All features require internet since we use CDN
            if (requiresInternet && !isConnected) {
                checkConnectivity();
                return;
            }

            if (webViewRef.current && webViewReady) {
                webViewRef.current.postMessage(JSON.stringify(message));
            } else {
                // Queue message if WebView is not ready yet
                messageQueue.current.push({ message, requiresInternet });
            }
        }, [webViewReady, isConnected, checkConnectivity]);

        // Restart WebView (used after crash recovery)
        const restartWebView = useCallback(() => {
            setWebViewReady(false);
            setWebViewKey(prev => prev + 1);
        }, []);

        useImperativeHandle(ref, () => ({
            updatePreview: (text: string, config: GenerationConfig) => {
                sendMessage({
                    type: 'UPDATE_PREVIEW',
                    text: text || '',
                    config: config || {}
                });
            },
            generateImage: (text: string, config: GenerationConfig) => {
                sendMessage({
                    type: 'GENERATE_IMAGE',
                    text: text || '',
                    config: config || {}
                });
            },
            downloadPDF: () => {
                sendMessage({ type: 'GENERATE_PDF' });
            },
            // Note: PDF text extraction uses WebViewContext.usePdfOperations() instead
            isReady: () => webViewReady
        }));

        const handleMessage = (event: WebViewMessageEvent) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);

                switch (data.type) {
                    case 'WEBVIEW_READY':
                        setWebViewReady(true);
                        onReady?.();
                        break;
                    case 'SUCCESS':
                        onImagesGenerated(data.images || []);
                        break;
                    case 'PDF_SUCCESS':
                        onPdfGenerated?.(data.data);
                        break;
                    case 'PDF_TEXT_EXTRACTED':
                        onPdfTextExtracted?.(data.data);
                        break;
                    case 'ERROR':
                        if (__DEV__) console.error('WebView Error:', data.data, data.code);
                        onError?.(data.data, data.code);

                        // Show user-friendly error for specific cases
                        // Note: WebView sends string codes, so we compare against both enum and string
                        switch (data.code) {
                            case ErrorCode.PDF_PASSWORD_PROTECTED:
                            case 'PDF_PASSWORD_PROTECTED':
                                Alert.alert('Password Protected', 'This PDF is password protected and cannot be processed.');
                                break;
                            case ErrorCode.PDF_INVALID:
                            case 'PDF_INVALID':
                                Alert.alert('Invalid PDF', 'The PDF file appears to be invalid or corrupted.');
                                break;
                            case ErrorCode.LIBRARY_NOT_LOADED:
                            case 'LIBRARY_NOT_LOADED':
                            case 'PDFJS_NOT_LOADED':
                                Alert.alert(
                                    'Internet Required',
                                    'This feature requires an internet connection. Please connect and try again.'
                                );
                                break;
                            case 'GENERATION_ERROR':
                            case 'STYLE_ERROR':
                                Alert.alert(
                                    'Generation Failed',
                                    'Failed to generate handwriting. Please try again.'
                                );
                                break;
                            case 'PREVIEW_ERROR':
                                // Silent - preview errors are usually recoverable
                                break;
                            default:
                                if (data.code) {
                                    // Generic error for any unhandled error codes
                                    Alert.alert(
                                        'Error',
                                        'Something went wrong. Please try again.'
                                    );
                                }
                                break;
                        }
                        break;
                    default:
                        break;
                }
            } catch (error) {
                if (__DEV__) console.error('Error parsing message from WebView:', error);
            }
        };

        const handleError = (syntheticEvent: { nativeEvent: { description?: string } }) => {
            const { nativeEvent } = syntheticEvent;
            if (__DEV__) console.error('WebView error:', nativeEvent);
            onError?.(`WebView error: ${nativeEvent.description || 'Unknown error'}`, 'WEBVIEW_ERROR');
        };

        // Handle WebView render process crash (Android only)
        const handleRenderProcessGone = (event: { nativeEvent: { didCrash: boolean } }) => {
            const { didCrash } = event.nativeEvent;
            if (__DEV__) console.error('WebView render process gone, didCrash:', didCrash);

            onError?.(
                didCrash ? 'WebView crashed unexpectedly' : 'WebView was killed due to memory pressure',
                'WEBVIEW_CRASH'
            );

            // Show alert and restart WebView
            Alert.alert(
                'Generator Crashed',
                'The handwriting generator encountered an issue. Restarting...',
                [{
                    text: 'OK',
                    onPress: restartWebView
                }]
            );
        };

        // Handle content process termination (iOS only)
        const handleContentProcessDidTerminate = () => {
            if (__DEV__) console.error('WebView content process terminated (iOS)');

            onError?.('WebView process terminated', 'WEBVIEW_CRASH');

            Alert.alert(
                'Generator Crashed',
                'The handwriting generator encountered an issue. Restarting...',
                [{
                    text: 'OK',
                    onPress: restartWebView
                }]
            );
        };

        return (
            <View style={[styles.container, style]}>
                <WebView
                    key={webViewKey}
                    ref={webViewRef}
                    source={{ html: getHtmlTemplate(), baseUrl: '' }}
                    onMessage={handleMessage}
                    onError={handleError}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    // SECURITY: Only allow fonts and local content
                    originWhitelist={['https://fonts.gstatic.com', 'https://fonts.googleapis.com', 'about:blank']}
                    // SECURITY: Only allow mixed content when necessary
                    mixedContentMode="compatibility"
                    // SECURITY: Restrict file access
                    allowFileAccess={false}
                    allowUniversalAccessFromFileURLs={false}
                    javaScriptCanOpenWindowsAutomatically={false}
                    // Performance
                    cacheEnabled={true}
                    incognito={false}
                    // Crash handling
                    onRenderProcessGone={Platform.OS === 'android' ? handleRenderProcessGone : undefined}
                    onContentProcessDidTerminate={Platform.OS === 'ios' ? handleContentProcessDidTerminate : undefined}
                />
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
});

export default HandwritingGenerator;
