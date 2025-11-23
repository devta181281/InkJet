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
        // Trigger generation after a short delay to ensure WebView is ready
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

    const saveImage = async (base64Data: string, index: number) => {
        try {
            // Save to CachesDirectoryPath which doesn't require permissions
            const fileName = `handwriting_${Date.now()}_${index}.jpg`;
            const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

            // Remove data:image/jpeg;base64, prefix for writing to file
            const data = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

            await RNFS.writeFile(path, data, 'base64');

            // Share the file URI
            await Share.open({
                url: `file://${path}`,
                type: 'image/jpeg',
                title: 'Share Handwriting Image',
                failOnCancel: false,
            });

        } catch (error) {
            console.error('Share Error:', error);
            Alert.alert('Error', 'Failed to share image');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Output</Text>
                <View style={{ width: 50 }} />
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
                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={() => saveImage(img, index)}
                            >
                                <Text style={styles.downloadButtonText}>Download / Share</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            <HandwritingGenerator
                ref={generatorRef}
                onImagesGenerated={handleImagesGenerated}
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
    downloadButton: {
        backgroundColor: '#1a73e8',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
    },
    downloadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
