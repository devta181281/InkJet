import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    PermissionsAndroid,
    ToastAndroid,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { WebView } from 'react-native-webview';
import { getHtmlTemplate } from '../utils/htmlTemplate';

const { width } = Dimensions.get('window');

export default function OutputScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { images } = route.params as { images: string[] };
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const webViewRef = useRef<WebView>(null);

    const saveToCache = async (base64Data: string, index: number) => {
        const fileName = `handwriting_${Date.now()}_${index}.jpg`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
        const data = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
        await RNFS.writeFile(path, data, 'base64');
        return path;
    };

    const handleShare = async (base64Data: string, index: number) => {
        try {
            const path = await saveToCache(base64Data, index);
            await Share.open({
                url: `file://${path}`,
                type: 'image/jpeg',
                title: 'Share Handwriting Image',
                failOnCancel: false,
            });
        } catch (error) {
            console.error('Share Error:', error);
        }
    };

    const handleDownload = async (base64Data: string, index: number) => {
        try {
            if (Platform.OS === 'android') {
                if (Platform.Version < 29) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert('Permission Denied', 'Cannot save image without storage permission.');
                        return;
                    }
                }
            }

            const fileName = `handwriting_${Date.now()}_${index}.jpg`;
            const downloadPath = Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                : `${RNFS.DocumentDirectoryPath}/${fileName}`;

            const data = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
            await RNFS.writeFile(downloadPath, data, 'base64');

            if (Platform.OS === 'android') {
                ToastAndroid.show(`Saved to ${downloadPath}`, ToastAndroid.LONG);
            } else {
                Alert.alert('Saved', 'Image saved to Documents');
            }

        } catch (error) {
            console.error('Download Error:', error);
            Alert.alert('Error', 'Failed to save image');
        }
    };

    const handleSavePdf = async (base64Data: string) => {
        try {
            if (Platform.OS === 'android') {
                if (Platform.Version < 29) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert('Permission Denied', 'Cannot save PDF without storage permission.');
                        return;
                    }
                }
            }

            const fileName = `handwriting_${Date.now()}.pdf`;
            const downloadPath = Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                : `${RNFS.DocumentDirectoryPath}/${fileName}`;

            const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "");
            await RNFS.writeFile(downloadPath, cleanBase64, 'base64');

            if (Platform.OS === 'android') {
                ToastAndroid.show(`Saved to ${downloadPath}`, ToastAndroid.LONG);
            } else {
                Alert.alert('Saved', `PDF saved to ${downloadPath}`);
            }
        } catch (error) {
            console.error('PDF Save Error:', error);
            Alert.alert('Error', 'Failed to save PDF');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const generatePdf = () => {
        setIsGeneratingPdf(true);
        webViewRef.current?.injectJavaScript(`
            window.postMessage(JSON.stringify({
                type: 'GENERATE_PDF',
                images: ${JSON.stringify(images)}
            }));
        `);
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'PDF_SUCCESS') {
                handleSavePdf(data.data);
            } else if (data.type === 'ERROR') {
                console.error('WebView Error:', data.data);
                setIsGeneratingPdf(false);
                Alert.alert('Error', 'PDF Generation failed');
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            setIsGeneratingPdf(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Result</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {images.map((img, index) => (
                    <View key={index} style={styles.imageCard}>
                        <Image
                            source={{ uri: img }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleDownload(img, index)}
                            >
                                <Text style={styles.actionButtonText}>Save Image</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.secondaryButton]}
                                onPress={() => handleShare(img, index)}
                            >
                                <Text style={styles.secondaryButtonText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={generatePdf}
                    disabled={isGeneratingPdf}
                >
                    {isGeneratingPdf ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.pdfButtonText}>Download as PDF</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={{ height: 0, opacity: 0 }}>
                <WebView
                    ref={webViewRef}
                    source={{ html: getHtmlTemplate(), baseUrl: '' }}
                    onMessage={handleMessage}
                    javaScriptEnabled={true}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    imageCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    image: {
        width: '100%',
        aspectRatio: 0.707, // A4 ratio
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#1a1a1a',
        fontWeight: '600',
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
    },
    secondaryButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    pdfButton: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    pdfButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
