import React, {
    createContext,
    useContext,
    useRef,
    useState,
    useCallback,
    useEffect,
    ReactNode,
} from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import { getHtmlTemplate } from '../utils/htmlTemplate';

// Types for message handlers
type MessageType =
    | 'WEBVIEW_READY'
    | 'SUCCESS'
    | 'PDF_SUCCESS'
    | 'PDF_TEXT_EXTRACTED'
    | 'PROGRESS'
    | 'ERROR';

export interface ProgressData {
    step: 'image' | 'pdf' | 'extract';
    current: number;
    total: number;
    message: string;
}

interface MessageData {
    type: MessageType;
    data?: string;
    images?: string[];
    code?: string;
    step?: string;
    current?: number;
    total?: number;
    message?: string;
}

type MessageHandler = (data: MessageData) => void;

interface WebViewContextType {
    isReady: boolean;
    isConnected: boolean | null;
    sendMessage: (message: object) => void;
    registerHandler: (id: string, handler: MessageHandler) => () => void;
    restartWebView: () => void;
}

const WebViewContext = createContext<WebViewContextType | undefined>(undefined);

/**
 * Global WebView provider - renders a single shared WebView instance
 * that all components can use for handwriting generation and PDF processing.
 */
export function WebViewProvider({ children }: { children: ReactNode }) {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [webViewKey, setWebViewKey] = useState(0);

    // Handler registry - allows components to receive responses
    const handlersRef = useRef<Map<string, MessageHandler>>(new Map());
    // Queue messages until WebView is ready
    const messageQueueRef = useRef<object[]>([]);

    // Monitor connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    // Process queued messages when ready
    useEffect(() => {
        if (isReady && messageQueueRef.current.length > 0) {
            messageQueueRef.current.forEach(msg => {
                const script = `window.postMessage(${JSON.stringify(JSON.stringify(msg))}); true;`;
                webViewRef.current?.injectJavaScript(script);
            });
            messageQueueRef.current = [];
        }
    }, [isReady]);

    const sendMessage = useCallback((message: object) => {
        if (!isConnected) {
            Alert.alert(
                'No Internet Connection',
                'This feature requires an internet connection.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (webViewRef.current && isReady) {
            // Use injectJavaScript to properly trigger window.postMessage in WebView
            const script = `window.postMessage(${JSON.stringify(JSON.stringify(message))}); true;`;
            webViewRef.current.injectJavaScript(script);
        } else {
            messageQueueRef.current.push(message);
        }
    }, [isReady, isConnected]);

    const registerHandler = useCallback((id: string, handler: MessageHandler) => {
        handlersRef.current.set(id, handler);
        return () => {
            handlersRef.current.delete(id);
        };
    }, []);

    const restartWebView = useCallback(() => {
        // Clear the message queue to prevent memory leaks and stale messages
        messageQueueRef.current = [];
        setIsReady(false);
        setWebViewKey(prev => prev + 1);
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
        try {
            const data: MessageData = JSON.parse(event.nativeEvent.data);

            if (data.type === 'WEBVIEW_READY') {
                setIsReady(true);
            }

            // Notify all registered handlers
            handlersRef.current.forEach(handler => {
                handler(data);
            });
        } catch (error) {
            if (__DEV__) {
                console.error('WebView message parse error:', error);
            }
        }
    }, []);

    const handleError = useCallback((syntheticEvent: { nativeEvent: { description?: string } }) => {
        if (__DEV__) {
            console.error('WebView error:', syntheticEvent.nativeEvent);
        }
        // Show user-friendly alert
        Alert.alert(
            'Generator Error',
            'Something went wrong with the handwriting generator. Please try again.',
            [{ text: 'OK' }]
        );
    }, []);

    const handleRenderProcessGone = useCallback((event: { nativeEvent: { didCrash: boolean } }) => {
        const { didCrash } = event.nativeEvent;
        if (__DEV__) {
            console.error('WebView render process gone, didCrash:', didCrash);
        }
        Alert.alert(
            'Generator Crashed',
            'The handwriting generator encountered an issue. Restarting...',
            [{ text: 'OK', onPress: restartWebView }]
        );
    }, [restartWebView]);

    const handleContentProcessDidTerminate = useCallback(() => {
        if (__DEV__) {
            console.error('WebView content process terminated (iOS)');
        }
        Alert.alert(
            'Generator Crashed',
            'The handwriting generator encountered an issue. Restarting...',
            [{ text: 'OK', onPress: restartWebView }]
        );
    }, [restartWebView]);

    const contextValue: WebViewContextType = {
        isReady,
        isConnected,
        sendMessage,
        registerHandler,
        restartWebView,
    };

    return (
        <WebViewContext.Provider value={contextValue}>
            {children}
            {/* Hidden shared WebView */}
            <View style={styles.hiddenContainer}>
                <WebView
                    key={webViewKey}
                    ref={webViewRef}
                    source={{ html: getHtmlTemplate(), baseUrl: '' }}
                    onMessage={handleMessage}
                    onError={handleError}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['https://fonts.gstatic.com', 'https://fonts.googleapis.com', 'about:blank']}
                    mixedContentMode="compatibility"
                    allowFileAccess={false}
                    allowUniversalAccessFromFileURLs={false}
                    javaScriptCanOpenWindowsAutomatically={false}
                    cacheEnabled={true}
                    incognito={false}
                    onRenderProcessGone={Platform.OS === 'android' ? handleRenderProcessGone : undefined}
                    onContentProcessDidTerminate={Platform.OS === 'ios' ? handleContentProcessDidTerminate : undefined}
                />
            </View>
        </WebViewContext.Provider>
    );
}

/**
 * Hook to access the shared WebView context
 */
export function useWebView() {
    const context = useContext(WebViewContext);
    if (!context) {
        throw new Error('useWebView must be used within a WebViewProvider');
    }
    return context;
}

/**
 * Hook for components that need to generate handwriting images
 */
export function useHandwritingGenerator(
    onImagesGenerated: (images: string[]) => void,
    onError?: (error: string, code?: string) => void
) {
    const { sendMessage, registerHandler, isReady } = useWebView();
    const handlerId = useRef(`handwriting-${Date.now()}`).current;

    useEffect(() => {
        const unregister = registerHandler(handlerId, (data) => {
            switch (data.type) {
                case 'SUCCESS':
                    if (data.images) {
                        onImagesGenerated(data.images);
                    }
                    break;
                case 'ERROR':
                    onError?.(data.data || 'Unknown error', data.code);
                    break;
            }
        });
        return unregister;
    }, [handlerId, registerHandler, onImagesGenerated, onError]);

    const updatePreview = useCallback((text: string, config: object) => {
        sendMessage({ type: 'UPDATE_PREVIEW', text, config });
    }, [sendMessage]);

    const generateImage = useCallback((text: string, config: object) => {
        sendMessage({ type: 'GENERATE_IMAGE', text, config });
    }, [sendMessage]);

    return { updatePreview, generateImage, isReady };
}

/**
 * Hook for PDF operations
 */
export function usePdfOperations(
    onPdfGenerated?: (base64Data: string) => void,
    onTextExtracted?: (text: string) => void,
    onError?: (error: string, code?: string) => void,
    onProgress?: (progress: ProgressData) => void
) {
    const { sendMessage, registerHandler, isReady } = useWebView();
    const handlerId = useRef(`pdf-${Date.now()}`).current;

    useEffect(() => {
        const unregister = registerHandler(handlerId, (data) => {
            switch (data.type) {
                case 'PDF_SUCCESS':
                    if (data.data) {
                        onPdfGenerated?.(data.data);
                    }
                    break;
                case 'PDF_TEXT_EXTRACTED':
                    if (data.data) {
                        onTextExtracted?.(data.data);
                    }
                    break;
                case 'PROGRESS':
                    if (data.step && data.current !== undefined && data.total !== undefined && data.message) {
                        onProgress?.({
                            step: data.step as ProgressData['step'],
                            current: data.current,
                            total: data.total,
                            message: data.message,
                        });
                    }
                    break;
                case 'ERROR':
                    onError?.(data.data || 'Unknown error', data.code);
                    break;
            }
        });
        return unregister;
    }, [handlerId, registerHandler, onPdfGenerated, onTextExtracted, onError, onProgress]);

    const downloadPDF = useCallback((images?: string[]) => {
        sendMessage({ type: 'GENERATE_PDF', images });
    }, [sendMessage]);

    const extractTextFromPDF = useCallback(async (base64Data: string) => {
        // Adaptive chunk size: smaller on Android due to lower average RAM
        // Android: 250KB chunks (more conservative for low-end devices)
        // iOS: 500KB chunks (typically better memory handling)
        const CHUNK_SIZE = Platform.OS === 'android' ? 250 * 1024 : 500 * 1024;
        const totalLength = base64Data.length;
        // Unique transfer ID to prevent interleaving if multiple transfers happen
        const transferId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (totalLength <= CHUNK_SIZE) {
            sendMessage({ type: 'EXTRACT_TEXT_FROM_PDF', data: base64Data, transferId });
            return;
        }

        // Chunked transfer for large PDFs
        const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);
        sendMessage({ type: 'PDF_DATA_START', transferId, totalChunks });

        for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
            const chunkIndex = Math.floor(i / CHUNK_SIZE);
            const chunk = base64Data.substring(i, i + CHUNK_SIZE);
            sendMessage({
                type: 'PDF_DATA_CHUNK',
                chunk,
                transferId,
                chunkIndex,
                isLast: chunkIndex === totalChunks - 1
            });
            // Allow UI thread to breathe - more delay on Android and for large documents
            const delayMs = Platform.OS === 'android'
                ? (totalChunks > 20 ? 30 : 15)
                : (totalChunks > 20 ? 20 : 10);
            await new Promise<void>(resolve => setTimeout(resolve, delayMs));
        }
        sendMessage({ type: 'PDF_DATA_END', transferId });
    }, [sendMessage]);

    return { downloadPDF, extractTextFromPDF, isReady };
}

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
    },
});
