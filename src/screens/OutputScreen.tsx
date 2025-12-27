import React, { useState, useCallback } from 'react';
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
import { usePdfOperations } from '../context/WebViewContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function OutputScreen() {
    const route = useRoute();
    const navigation = useNavigation();

    // Validate route params - Expecting FILE URIs now, not base64
    const rawParams = route.params as { images?: unknown } | undefined;
    const imagePaths: string[] = Array.isArray(rawParams?.images)
        ? rawParams.images.filter((img): img is string => typeof img === 'string')
        : [];

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { colors, isDarkMode } = useTheme();

    const handleShare = async (fileUri: string) => {
        try {
            await Share.open({
                url: fileUri,
                type: 'image/jpeg',
                title: 'Share Handwriting Image',
                failOnCancel: false,
            });
        } catch (error) {
            if (__DEV__) console.error('Share Error:', error);
            const errorMessage = (error as Error)?.message || '';
            if (!errorMessage.includes('cancel') && !errorMessage.includes('dismiss')) {
                Alert.alert(
                    'Share Failed',
                    'Could not share the image. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        }
    };

    const handleDownload = async (fileUri: string, index: number) => {
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

            try {
                // Ensure directory exists
                const dirPath = downloadPath.substring(0, downloadPath.lastIndexOf('/'));
                if (!(await RNFS.exists(dirPath))) {
                    await RNFS.mkdir(dirPath);
                }

                // OPTIMIZATION: Copy file instead of writing base64
                // Remove 'file://' prefix for RNFS operations if present
                const sourcePath = fileUri.replace('file://', '');
                await RNFS.copyFile(sourcePath, downloadPath);

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
            Alert.alert(
                'Save Error',
                'Failed to save the image. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    // Buffer for reading files back into base64 for PDF generation
    const readFilesForPdf = async (): Promise<string[]> => {
        const base64Images: string[] = [];
        for (const uri of imagePaths) {
            try {
                const content = await RNFS.readFile(uri.replace('file://', ''), 'base64');
                base64Images.push(`data:image/jpeg;base64,${content}`);
            } catch (e) {
                console.error('Failed to read cached image for PDF:', e);
                // Continue with other images or throw? 
                // Currently continue, but PDF might have missing pages.
            }
        }
        return base64Images;
    };

    const handleSharePdf = async (base64Data: string) => {
        try {
            const fileName = `handwriting_${Date.now()}.pdf`;
            const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
            const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "");

            // For very large files, show a warning first
            if (cleanBase64.length > 50 * 1024 * 1024) { // > 50MB
                Alert.alert(
                    'PDF Too Large',
                    'This PDF is very large and may not save correctly. Try reducing the number of pages or using "Low" quality setting.',
                    [{ text: 'OK' }]
                );
                setIsGeneratingPdf(false);
                return;
            }

            await RNFS.writeFile(cachePath, cleanBase64, 'base64');

            await Share.open({
                url: `file://${cachePath}`,
                type: 'application/pdf',
                title: 'Share PDF',
                failOnCancel: false,
            });
        } catch (error) {
            if (__DEV__) console.error('PDF Share Error:', error);
            const errorMessage = (error as Error)?.message || '';

            if (errorMessage.includes('OOM') || errorMessage.includes('allocate')) {
                Alert.alert(
                    'PDF Too Large',
                    'This PDF is too large for your device. Please try:\n\n• Fewer pages\n• "Low" quality setting\n• Saving individual images instead',
                    [{ text: 'OK' }]
                );
            } else if (!errorMessage.includes('cancel') && !errorMessage.includes('dismiss')) {
                Alert.alert(
                    'Share Failed',
                    'Could not share the PDF. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleSavePdf = async (base64Data: string) => {
        try {
            const LARGE_PDF_THRESHOLD = 15 * 1024 * 1024;
            // Check if PDF is too large for direct file write
            if (base64Data.length > LARGE_PDF_THRESHOLD) {
                Alert.alert(
                    'Large PDF Detected',
                    'This PDF is too large to save directly. Opening Share menu instead - you can save to Files, Drive, or any app.',
                    [{
                        text: 'Share',
                        onPress: () => handleSharePdf(base64Data)
                    }]
                );
                return;
            }

            if (Platform.OS === 'android' && Platform.Version < 29) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permission Denied', 'Storage permission is required to save PDF.');
                    setIsGeneratingPdf(false);
                    return;
                }
            }

            const fileName = `handwriting_${Date.now()}.pdf`;
            const downloadPath = Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${fileName}`
                : `${RNFS.DocumentDirectoryPath}/${fileName}`;

            const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "");

            try {
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
                const errMsg = (writeError as Error)?.message || '';

                if (errMsg.includes('OOM') || errMsg.includes('allocate') || errMsg.includes('memory')) {
                    // OOM error - show helpful message
                    Alert.alert(
                        'PDF Too Large',
                        'This PDF is too large for your device memory.\n\nPlease try:\n• Generating fewer pages\n• Using "Low" quality setting\n• Saving individual images instead',
                        [{ text: 'OK' }]
                    );
                } else {
                    // Other write error - suggest Share
                    Alert.alert(
                        'Save Failed',
                        'Could not save to Downloads. Try using Share to save to Drive or another app.',
                        [{ text: 'OK' }]
                    );
                }
                return;
            }

        } catch (error) {
            if (__DEV__) console.error('PDF Save Error:', error);
            Alert.alert(
                'PDF Error',
                'Failed to save PDF. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePdfGenerated = useCallback((base64Data: string) => {
        handleSavePdf(base64Data);
    }, []);

    const handlePdfError = useCallback((error: string, code?: string) => {
        if (__DEV__) console.error('PDF Error:', error, code);
        setIsGeneratingPdf(false);
        Alert.alert(
            'PDF Error',
            'Failed to generate PDF. Please try again.',
            [{ text: 'OK' }]
        );
    }, []);

    // Use shared WebView context for PDF generation
    const { downloadPDF } = usePdfOperations(
        handlePdfGenerated,
        undefined, // no text extraction on this screen
        handlePdfError
    );

    const generatePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            // Need to read files back to base64 for the WebView to generate PDF
            // This is unavoidable as html2canvas/jsPDF run in WebView, but at least
            // we controlled the memory usage up until this point.
            if (imagePaths.length > 5 && Platform.OS === 'android') {
                ToastAndroid.show('Preparing images for PDF...', ToastAndroid.SHORT);
            }

            const base64Images = await readFilesForPdf();
            if (base64Images.length === 0) {
                throw new Error("No images loaded");
            }

            downloadPDF(base64Images);
        } catch (e) {
            setIsGeneratingPdf(false);
            Alert.alert('Error', 'Failed to load images for PDF generation.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                    <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Result</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {imagePaths.map((imgUri, index) => (
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
                            source={{ uri: imgUri }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.surfaceHighlight }]}
                                onPress={() => handleDownload(imgUri, index)}
                                accessibilityLabel={`Save image ${index + 1}`}
                                accessibilityRole="button"
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
                                onPress={() => handleShare(imgUri)}
                                accessibilityLabel={`Share image ${index + 1}`}
                                accessibilityRole="button"
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
                    accessibilityLabel="Download as PDF"
                    accessibilityHint="Combines all images into a single PDF file"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isGeneratingPdf }}
                >
                    {isGeneratingPdf ? (
                        <ActivityIndicator color={colors.onPrimary} accessibilityLabel="Generating PDF" />
                    ) : (
                        <Text style={[styles.pdfButtonText, { color: colors.onPrimary }]}>Download as PDF</Text>
                    )}
                </TouchableOpacity>
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
