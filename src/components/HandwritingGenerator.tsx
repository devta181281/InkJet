import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { getHtmlTemplate } from '../utils/htmlTemplate';

export interface GenerationConfig {
    font?: string;
    inkColor?: string;
    paperLines?: boolean;
    paperMargin?: boolean;
    effect?: 'shadows' | 'scanner' | 'no-effect';
    fontSize?: number;
    pageSize?: string;
    resolution?: number;
    topPadding?: number;
    wordSpacing?: number;
    letterSpacing?: number;
}

export interface HandwritingGeneratorRef {
    generate: (text: string, config: GenerationConfig) => void;
    downloadPDF: () => void;
    extractTextFromPDF: (base64Data: string) => void;
}

interface Props {
    onImagesGenerated: (images: string[]) => void;
    onPdfGenerated?: (base64Data: string) => void;
    onPdfTextExtracted?: (text: string) => void;
}

const HandwritingGenerator = forwardRef<HandwritingGeneratorRef, Props>(
    ({ onImagesGenerated, onPdfGenerated, onPdfTextExtracted }, ref) => {
        const webViewRef = useRef<WebView>(null);

        useImperativeHandle(ref, () => ({
            generate: (text, config) => {
                const script = `
                    handleMessage({
                        data: JSON.stringify({
                            type: 'GENERATE',
                            text: ${JSON.stringify(text)},
                            config: ${JSON.stringify(config)}
                        })
                    });
                `;
                webViewRef.current?.injectJavaScript(script);
            },
            downloadPDF: () => {
                const script = `
                    handleMessage({
                        data: JSON.stringify({
                            type: 'GENERATE_PDF'
                        })
                    });
                `;
                webViewRef.current?.injectJavaScript(script);
            },
            extractTextFromPDF: (base64Data: string) => {
                const script = `
                    handleMessage({
                        data: JSON.stringify({
                            type: 'EXTRACT_TEXT_FROM_PDF',
                            data: '${base64Data}'
                        })
                    });
                `;
                webViewRef.current?.injectJavaScript(script);
            }
        }));

        const handleMessage = (event: any) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'SUCCESS') {
                    onImagesGenerated(data.images);
                } else if (data.type === 'PDF_SUCCESS') {
                    if (onPdfGenerated) {
                        onPdfGenerated(data.data);
                    }
                } else if (data.type === 'PDF_TEXT_EXTRACTED') {
                    if (onPdfTextExtracted) {
                        onPdfTextExtracted(data.data);
                    }
                } else if (data.type === 'ERROR') {
                    console.error('WebView Error:', data.data);
                }
            } catch (error) {
                console.error('Error parsing message from WebView:', error);
            }
        };

        return (
            <View style={styles.container}>
                <WebView
                    ref={webViewRef}
                    source={{ html: getHtmlTemplate(), baseUrl: '' }}
                    onMessage={handleMessage}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    allowFileAccess={true}
                />
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        height: 0,
        width: 0,
        position: 'absolute',
        opacity: 0, // Hidden but active
    },
    webview: {
        width: 1000, // Give it some width to render correctly
        height: 1000,
    },
});

export default HandwritingGenerator;
