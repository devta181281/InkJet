import React, { useState, useRef, useEffect } from 'react';
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
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import HandwritingGenerator, { HandwritingGeneratorRef } from '../components/HandwritingGenerator';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../utils/theme';
import type { RootStackParamList } from '../types/navigation';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const AnimatedView = Animated.createAnimatedComponent(View);

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { colors, isDarkMode, setMode, mode } = useTheme();

    // Animation Value: 0 for light, 1 for dark
    const themeAnim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(themeAnim, {
            toValue: isDarkMode ? 1 : 0,
            duration: 350,
            useNativeDriver: false, // Color interpolation doesn't support native driver
        }).start();
    }, [isDarkMode, themeAnim]);

    const containerBg = themeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.light.background, theme.dark.background]
    });

    const cardBg = themeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.light.surface, theme.dark.surface]
    });

    const cardBorder = themeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.light.border, theme.dark.border]
    });

    const generatorRef = useRef<HandwritingGeneratorRef>(null);
    const [text, setText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGeneratorReady, setIsGeneratorReady] = useState(false);

    const handleNext = () => {
        if (!isGeneratorReady) {
            Alert.alert('Loading', 'Please wait for the generator to initialize...');
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
                Alert.alert('Error', 'Failed to pick PDF: ' + (err as Error).message);
            }
            setIsExtracting(false);
        }
    };

    const handlePdfTextExtracted = (extractedText: string) => {
        setText(extractedText);
        setIsExtracting(false);
        Alert.alert('Success', 'Text extracted from PDF!');
    };

    const handleGeneratorReady = () => {
        setIsGeneratorReady(true);
    };

    const handleGeneratorError = (error: string, code?: string) => {
        if (__DEV__) console.error('Generator error:', error, code);
        setIsExtracting(false);
        if (code === 'NO_INTERNET') {
            // Alert already shown by HandwritingGenerator
        }
    };

    return (
        <AnimatedSafeAreaView style={[styles.container, { backgroundColor: containerBg }]}>
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
                        <Text style={[styles.headerTitle, { color: colors.text }]}>LazyAss</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Turn your digital text into handwriting
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={[styles.themeButton, { backgroundColor: colors.surfaceHighlight }]}
                    >
                        <Text style={{ fontSize: 20 }}>{isDarkMode ? '🌙' : '☀️'}</Text>
                    </TouchableOpacity>
                </View>

                <AnimatedView style={[
                    styles.inputCard,
                    {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
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
                        >
                            {isExtracting ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} />
                            ) : (
                                <Text style={[styles.iconButtonText, { color: colors.text }]}>📄 Import PDF</Text>
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
                            {text.length} chars
                        </Text>
                    </View>
                </AnimatedView>

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
                    >
                        {!isGeneratorReady ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Next</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <HandwritingGenerator
                ref={generatorRef}
                onImagesGenerated={() => { }}
                onPdfTextExtracted={handlePdfTextExtracted}
                onReady={handleGeneratorReady}
                onError={handleGeneratorError}
                style={styles.hiddenGenerator}
            />
        </AnimatedSafeAreaView>
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
    hiddenGenerator: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
});
