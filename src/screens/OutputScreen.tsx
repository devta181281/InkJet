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
import { useTheme } from '../context/ThemeContext';


const { width } = Dimensions.get('window');

export default function OutputScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { images } = route.params as { images: string[] };

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const webViewRef = useRef<WebView>(null);

    const { colors, isDarkMode } = useTheme();

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
            if (__DEV__) console.error('Share Error:', error);
        }
    };

    const handleDownload = async (base64Data: string, index: number) => {
        try {
            if (Platform.OS === 'android' && Platform.Version < 29) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permission Denied', 'Storage permission is required to save images.');
                    return;
                }
            }

            const fileName = `handwriting_${Date.now()}_${index}.jpg`;
            const downloadPath = Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                : `${RNFS.DocumentDirectoryPath}/${fileName}`;

            const data = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

            try {
                // Ensure directory exists
                const dirPath = downloadPath.substring(0, downloadPath.lastIndexOf('/'));
                if (!(await RNFS.exists(dirPath))) {
                    await RNFS.mkdir(dirPath);
                }

                await RNFS.writeFile(downloadPath, data, 'base64');

                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Saved to Downloads/${fileName}`, ToastAndroid.LONG);
                    try {
                        await RNFS.scanFile(downloadPath);
                    } catch (_e) {
                        // Scan file failed - non-critical
                    }
                } else {
                    Alert.alert('Saved', 'Image saved to Documents');
                }
            } catch (writeError) {
                if (__DEV__) console.error('File Write Error:', writeError);
                Alert.alert(
                    'Save Failed',
                    'Could not save directly to device. Please try the "Share" button instead.',
                    [{ text: 'OK' }]
                );
            }

        } catch (error) {
            if (__DEV__) console.error('Download Error:', error);
            Alert.alert('Error', 'Failed to process image: ' + (error as Error).message);
        }
    };

    const handleSavePdf = async (base64Data: string) => {
        try {
            if (Platform.OS === 'android' && Platform.Version < 29) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permission Denied', 'Storage permission is required to save PDF.');
                    return;
                }
            }

            const fileName = `handwriting_${Date.now()}.pdf`;
            const downloadPath = Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                : `${RNFS.DocumentDirectoryPath}/${fileName}`;

            const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "");

            try {
                // Ensure directory exists
                const dirPath = downloadPath.substring(0, downloadPath.lastIndexOf('/'));
                if (!(await RNFS.exists(dirPath))) {
                    await RNFS.mkdir(dirPath);
                }

                await RNFS.writeFile(downloadPath, cleanBase64, 'base64');

                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Saved to Downloads/${fileName}`, ToastAndroid.LONG);
                    try {
                        await RNFS.scanFile(downloadPath);
                    } catch (_e) {
                        // Scan file failed - non-critical
                    }
                } else {
                    Alert.alert('Saved', 'PDF saved to Documents');
                }
            } catch (writeError) {
                if (__DEV__) console.error('File Write Error:', writeError);
                Alert.alert(
                    'Save Failed',
                    'Could not save directly to device. Please try using the "Share" button instead.',
                    [{ text: 'OK' }]
                );
            }

        } catch (error) {
            if (__DEV__) console.error('PDF Save Error:', error);
            Alert.alert('Error', 'Failed to process PDF: ' + (error as Error).message);
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
                if (__DEV__) console.error('WebView Error:', data.data);
                setIsGeneratingPdf(false);
                Alert.alert('Error', 'PDF Generation failed');
            }
        } catch (error) {
            if (__DEV__) console.error('Error parsing message:', error);
            setIsGeneratingPdf(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Result</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {images.map((img, index) => (
                    <View
                        key={index}
                        style={[
                            styles.imageCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowColor: colors.shadow,
                            }
                        ]}
                    >
                        <Image
                            source={{ uri: img }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.surfaceHighlight }]}
                                onPress={() => handleDownload(img, index)}
                            >
                                <Text style={[styles.actionButtonText, { color: colors.text }]}>Save Image</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    styles.secondaryButton,
                                    {
                                        backgroundColor: 'transparent',
                                        borderColor: colors.border
                                    }
                                ]}
                                onPress={() => handleShare(img, index)}
                            >
                                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.pdfButton, { backgroundColor: colors.primary }]}
                    onPress={generatePdf}
                    disabled={isGeneratingPdf}
                >
                    {isGeneratingPdf ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <Text style={[styles.pdfButtonText, { color: colors.onPrimary }]}>Download as PDF</Text>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 120,
    },
    imageCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
    },
    image: {
        width: '100%',
        aspectRatio: 0.707, // A4 ratio
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    secondaryButton: {
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        borderTopWidth: 1,
    },
    pdfButton: {
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    pdfButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
