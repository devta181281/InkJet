import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import HandwritingGenerator, { HandwritingGeneratorRef } from '../components/HandwritingGenerator';

export default function HomeScreen() {
    const navigation = useNavigation();
    const generatorRef = useRef<HandwritingGeneratorRef>(null);
    const [text, setText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    const handleNext = () => {
        navigation.navigate('Styling', { text });
    };

    const handleImportPdf = async () => {
        try {
            const res = await DocumentPicker.pick({
                type: [DocumentPicker.types.pdf],
            });

            if (res && res[0]) {
                setIsExtracting(true);
                const uri = res[0].uri;
                const base64 = await RNFS.readFile(uri, 'base64');

                if (generatorRef.current) {
                    generatorRef.current.extractTextFromPDF(base64);
                } else {
                    setIsExtracting(false);
                    Alert.alert('Error', 'Generator not ready');
                }
            }
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled
            } else {
                Alert.alert('Error', 'Failed to pick PDF: ' + (err as any).message);
            }
            setIsExtracting(false);
        }
    };

    const handlePdfTextExtracted = (extractedText: string) => {
        setText(extractedText);
        setIsExtracting(false);
        Alert.alert('Success', 'Text extracted from PDF!');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Inkjet</Text>
                    <Text style={styles.headerSubtitle}>Turn your digital text into handwriting</Text>
                </View>

                <View style={styles.inputCard}>
                    <TextInput
                        style={styles.textInput}
                        multiline
                        placeholder="Start typing or import a PDF..."
                        placeholderTextColor="#999"
                        value={text}
                        onChangeText={setText}
                        textAlignVertical="top"
                    />

                    <View style={styles.inputActions}>
                        <TouchableOpacity
                            onPress={handleImportPdf}
                            style={styles.iconButton}
                            disabled={isExtracting}
                        >
                            {isExtracting ? (
                                <ActivityIndicator size="small" color="#666" />
                            ) : (
                                <Text style={styles.iconButtonText}>📄 Import PDF</Text>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.characterCount}>{text.length} chars</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.fab, !text.trim() && styles.fabDisabled]}
                    onPress={handleNext}
                    disabled={!text.trim()}
                >
                    <Text style={styles.fabText}>Next ➜</Text>
                </TouchableOpacity>
            </View>

            <HandwritingGenerator
                ref={generatorRef}
                onImagesGenerated={() => { }}
                onPdfTextExtracted={handlePdfTextExtracted}
                style={styles.hiddenGenerator}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    headerContainer: {
        marginTop: 20,
        marginBottom: 40,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    inputCard: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 24,
        padding: 20,
        marginBottom: 100, // Space for FAB
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        padding: 0,
    },
    inputActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    iconButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
    },
    iconButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    characterCount: {
        fontSize: 12,
        color: '#999',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        backgroundColor: '#1a1a1a',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 32,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    fabDisabled: {
        backgroundColor: '#ccc',
        elevation: 0,
        shadowOpacity: 0,
    },
    fabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    hiddenGenerator: {
        position: 'absolute',
        width: 0,
        height: 0,
        opacity: 0,
    },
});
