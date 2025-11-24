import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import HandwritingGenerator, { HandwritingGeneratorRef } from '../components/HandwritingGenerator';

export default function OutputScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const generatorRef = useRef<HandwritingGeneratorRef>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { text, config } = route.params as any;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (text && generatorRef.current) {
                generatorRef.current.generate(text, config);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [text, config]);

    const handleImagesGenerated = (images: string[]) => {
        setGeneratedImages(images);
        setIsLoading(false);
    };

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
                // Request permission for older Androids
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
            // On Android, DownloadDirectoryPath is usually available
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

    const handlePdfGenerated = async (base64Data: string) => {
        try {
            console.log('OutputScreen: PDF Generated, data length:', base64Data ? base64Data.length : 'null');

            if (!base64Data) {
                throw new Error('No PDF data received');
            }

            // Clean the base64 data
            // Remove "data:application/pdf;base64," header if present
            const cleanData = base64Data.split(',').pop()?.replace(/\s/g, '') || '';

            if (cleanData.length === 0) {
                throw new Error('PDF data is empty after cleaning');
            }

            const fileName = `handwriting_${Date.now()}.pdf`;
            const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

            console.log('OutputScreen: Writing to cache path:', cachePath);

            // Write to cache first (most reliable)
            await RNFS.writeFile(cachePath, cleanData, 'base64');

            if (Platform.OS === 'android') {
                // Force request permission to ensure dialog shows
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        title: 'Storage Permission Required',
                        message: 'App needs access to your storage to download the PDF',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );

                const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

                try {
                    await RNFS.copyFile(cachePath, downloadPath);
                    Alert.alert('Success', `PDF saved to Downloads:\n${fileName}`);
                } catch (copyError) {
                    console.log('Copy failed, trying to share...', copyError);
                    // Fallback to share
                    await Share.open({
                        url: `file://${cachePath}`,
                        type: 'application/pdf',
                        title: 'Share PDF',
                    });
                }
            } else {
                const documentsPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
                try {
                    await RNFS.copyFile(cachePath, documentsPath);
                    Alert.alert('Success', 'PDF saved to Documents');
                } catch (copyError) {
                    await Share.open({
                        url: `file://${cachePath}`,
                        type: 'application/pdf',
                        title: 'Share PDF',
                    });
                }
            }

        } catch (error) {
            console.error('OutputScreen: File write failed:', error);

            try {
                console.log('OutputScreen: Falling back to sharing raw base64');
                // Fallback to sharing raw base64 if file write fails
                const cleanData = base64Data.split(',').pop()?.replace(/\s/g, '') || '';
                await Share.open({
                    url: `data:application/pdf;base64,${cleanData}`,
                    title: 'Share PDF',
                    type: 'application/pdf'
                });
            } catch (shareError) {
                console.error('OutputScreen: PDF Save Error:', shareError);
                Alert.alert('Error', 'Failed to save PDF.');
            }
        }
    };

    const handleDownloadPdf = () => {
        if (generatorRef.current) {
            ToastAndroid.show('Generating PDF...', ToastAndroid.SHORT);
            generatorRef.current.downloadPDF();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Output</Text>
                <TouchableOpacity onPress={handleDownloadPdf} style={styles.pdfButton}>
                    <Text style={styles.pdfButtonText}>PDF</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Generating Handwriting...</Text>
                    </View>
                ) : (
                    generatedImages.map((img, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image
                                source={{ uri: img }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.downloadButton]}
                                    onPress={() => handleDownload(img, index)}
                                >
                                    <Text style={styles.buttonText}>Download</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.shareButton]}
                                    onPress={() => handleShare(img, index)}
                                >
                                    <Text style={styles.buttonText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <HandwritingGenerator
                ref={generatorRef}
                onImagesGenerated={handleImagesGenerated}
                onPdfGenerated={handlePdfGenerated}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    pdfButton: {
        backgroundColor: '#333',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fff',
    },
    pdfButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    loadingContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 20,
        fontSize: 16,
    },
    imageContainer: {
        width: '100%',
        marginBottom: 30,
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 400, // Fixed height for preview
        backgroundColor: '#fff',
        marginBottom: 15,
        borderRadius: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    downloadButton: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#fff',
    },
    shareButton: {
        backgroundColor: '#1a73e8',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
