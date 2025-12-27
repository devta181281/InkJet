import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { usePdfOperations, useWebView } from '../context/WebViewContext';
import { useTheme } from '../context/ThemeContext';
import { MAX_TEXT_LENGTH, TEXT_LENGTH_WARNING_THRESHOLD, CHARS_PER_PAGE_ESTIMATE } from '../utils/constants';
import type { RootStackParamList } from '../types/navigation';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { colors, isDarkMode, setMode, mode } = useTheme();

    const [text, setText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const extractionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Use shared WebView context instead of embedded HandwritingGenerator
    const { isReady: isGeneratorReady } = useWebView();

    // Clear timeout on unmount
    React.useEffect(() => {
        return () => {
            if (extractionTimeoutRef.current) {
                clearTimeout(extractionTimeoutRef.current);
            }
        };
    }, []);

    const handlePdfTextExtracted = useCallback((extractedText: string) => {
        // Clear timeout since we got a response
        if (extractionTimeoutRef.current) {
            clearTimeout(extractionTimeoutRef.current);
            extractionTimeoutRef.current = null;
        }

        setIsExtracting(false);

        // Check if extracted text is empty or just whitespace (scanned PDF)
        if (!extractedText || !extractedText.trim()) {
            Alert.alert(
                'No Text Found',
                'This PDF appears to be a scanned image with no extractable text. Please use a text-based PDF or type your text manually.',
                [{ text: 'OK' }]
            );
            return;
        }

        setText(extractedText);
        Alert.alert('Success', 'Text extracted from PDF!');
    }, []);

    const handlePdfError = useCallback((error: string, code?: string) => {
        // Clear timeout since we got a response
        if (extractionTimeoutRef.current) {
            clearTimeout(extractionTimeoutRef.current);
            extractionTimeoutRef.current = null;
        }

        if (__DEV__) console.error('PDF error:', error, code);
        setIsExtracting(false);

        switch (code) {
            case 'PDF_PASSWORD_PROTECTED':
                Alert.alert('Password Protected', 'This PDF is password protected and cannot be processed.');
                break;
            case 'PDF_INVALID':
                Alert.alert('Invalid PDF', 'The selected file appears to be invalid or corrupted.');
                break;
            case 'PDFJS_NOT_LOADED':
            case 'LIBRARY_NOT_LOADED':
                Alert.alert('Initialization Failed', 'The PDF engine failed to initialize. Please restart the app.');
                break;
            case 'PDF_EXTRACT_ERROR':
                Alert.alert(
                    'Extraction Failed',
                    'Could not extract text from this PDF. It may be a scanned image or protected document.',
                    [{ text: 'OK' }]
                );
                break;
            default:
                Alert.alert('Error', 'Failed to extract text from PDF.');
        }
    }, []);

    const { extractTextFromPDF } = usePdfOperations(
        undefined, // no PDF generation callback on this screen
        handlePdfTextExtracted,
        handlePdfError
    );

    // Wrapper to add timeout for PDF extraction
    const extractTextWithTimeout = useCallback((base64Data: string) => {
        // Set 30 second timeout for extraction
        extractionTimeoutRef.current = setTimeout(() => {
            setIsExtracting(false);
            Alert.alert(
                'Extraction Timeout',
                'Text extraction is taking too long. This PDF may be too large or contain only scanned images.',
                [{ text: 'OK' }]
            );
        }, 30000);

        extractTextFromPDF(base64Data);
    }, [extractTextFromPDF]);

    const handleNext = () => {
        if (!isGeneratorReady) {
            Alert.alert('Loading', 'Please wait for the generator to initialize...');
            return;
        }
        if (!text.trim()) {
            Alert.alert(
                'No Text',
                'Please enter some text or import a PDF before continuing.',
                [{ text: 'OK' }]
            );
            return;
        }
        // Validate text length to prevent OOM during generation
        // Validate text length to prevent OOM during generation
        if (text.length > MAX_TEXT_LENGTH) {
            const estimatedPages = Math.ceil(text.length / CHARS_PER_PAGE_ESTIMATE);
            Alert.alert(
                'Large Text Detected',
                `Your text has ${text.length.toLocaleString()} characters (≈${estimatedPages} pages).\n\nProcessing this much text may cause the app to crash or freeze.\n\nWe recommend splitting your text, but you can try to proceed with lower quality settings.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Proceed Anyway',
                        style: 'destructive',
                        onPress: () => navigation.navigate('Styling', { text })
                    }
                ]
            );
            return;
        }
        navigation.navigate('Styling', { text });
    };

    const toggleTheme = () => {
        const nextMode = mode === 'light' ? 'dark' : 'light';
        setMode(nextMode);
    };

    const handleImportPdf = async () => {
        if (!isGeneratorReady) {
            Alert.alert('Loading', 'Please wait for the generator to initialize...');
            return;
        }

        try {
            const res = await DocumentPicker.pick({
                type: [DocumentPicker.types.pdf],
            });

            if (res && res[0]) {
                setIsExtracting(true);
                const uri = res[0].uri;

                try {
                    const base64 = await RNFS.readFile(uri, 'base64');
                    extractTextWithTimeout(base64);
                } catch (readError) {
                    setIsExtracting(false);
                    Alert.alert(
                        'File Error',
                        'Failed to read the PDF file. Please try a different file.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                return;
            }
            setIsExtracting(false);
            Alert.alert(
                'Import Failed',
                'Could not import PDF. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor="transparent"
                translucent
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.headerRow}>
                    <View style={styles.headerContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>InkCraft</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Turn your digital text into handwriting
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={[styles.themeButton, { backgroundColor: colors.surfaceHighlight }]}
                        accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        accessibilityRole="button"
                    >
                        <Text style={{ fontSize: 20 }}>{isDarkMode ? '🌙' : '☀️'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[
                    styles.inputCard,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: isDarkMode ? 1 : 0,
                        shadowColor: colors.shadow,
                    }
                ]}>
                    <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        multiline
                        placeholder="Start typing or import a PDF..."
                        placeholderTextColor={colors.textTertiary}
                        value={text}
                        onChangeText={setText}
                        textAlignVertical="top"
                        accessibilityLabel="Text input for handwriting conversion"
                        accessibilityHint="Enter the text you want to convert to handwriting"
                    />

                    <View style={[styles.inputActions, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={handleImportPdf}
                            style={[
                                styles.iconButton,
                                {
                                    backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.background,
                                    borderColor: colors.border
                                }
                            ]}
                            disabled={isExtracting || !isGeneratorReady}
                            accessibilityLabel="Import PDF"
                            accessibilityHint="Select a PDF file to extract text from"
                            accessibilityRole="button"
                            accessibilityState={{ disabled: isExtracting || !isGeneratorReady }}
                        >
                            {isExtracting ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} accessibilityLabel="Extracting text from PDF" />
                            ) : (
                                <Text style={[styles.iconButtonText, { color: colors.text }]}>📄 Import PDF</Text>
                            )}
                        </TouchableOpacity>
                        <Text style={[
                            styles.characterCount,
                            {
                                color: text.length > MAX_TEXT_LENGTH
                                    ? '#e53935'
                                    : text.length > TEXT_LENGTH_WARNING_THRESHOLD
                                        ? '#ff9800'
                                        : colors.textTertiary
                            }
                        ]}>
                            {text.length.toLocaleString()}{text.length > TEXT_LENGTH_WARNING_THRESHOLD ? ` / ${MAX_TEXT_LENGTH.toLocaleString()}` : ''} chars
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            {
                                backgroundColor: colors.primary,
                                opacity: !text.trim() || !isGeneratorReady ? 0.5 : 1
                            }
                        ]}
                        onPress={handleNext}
                        disabled={!text.trim() || !isGeneratorReady}
                        accessibilityLabel="Next"
                        accessibilityHint="Proceed to styling options"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !text.trim() || !isGeneratorReady }}
                    >
                        {!isGeneratorReady ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} accessibilityLabel="Loading generator" />
                        ) : (
                            <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Next</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 12,
        marginBottom: 24,
    },
    headerContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        marginTop: 4,
    },
    themeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputCard: {
        flex: 1,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    textInput: {
        flex: 1,
        padding: 20,
        fontSize: 17,
        lineHeight: 26,
    },
    inputActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    iconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    iconButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    characterCount: {
        fontSize: 13,
    },
    footer: {
        paddingTop: 16,
    },
    nextButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },
});
