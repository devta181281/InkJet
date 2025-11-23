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
}

export interface HandwritingGeneratorRef {
    generate: (text: string, config: GenerationConfig) => void;
}

interface Props {
    onImagesGenerated: (images: string[]) => void;
}

const HandwritingGenerator = forwardRef<HandwritingGeneratorRef, Props>(
    ({ onImagesGenerated }, ref) => {
        const webViewRef = useRef<WebView>(null);

        useImperativeHandle(ref, () => ({
            generate: (text, config) => {
                const payload = JSON.stringify({
                    type: 'GENERATE',
                    text,
                    config,
                });
                webViewRef.current?.postMessage(payload);
            },
        }));

        const handleMessage = (event: any) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'SUCCESS') {
                    onImagesGenerated(data.images);
                }
            } catch (error) {
                console.error('Error parsing message from WebView', error);
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
