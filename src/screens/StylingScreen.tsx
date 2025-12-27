import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Animated,
    PanResponder,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RNFS from 'react-native-fs'; // Import RNFS
import HandwritingGenerator, { HandwritingGeneratorRef, GenerationConfig } from '../components/HandwritingGenerator';
import ControlRow from '../components/ControlRow';
import { useTheme } from '../context/ThemeContext';
import {
    BOTTOM_SHEET_COLLAPSED_HEIGHT,
    BOTTOM_SHEET_EXPANDED_RATIO,
    BOTTOM_SHEET_DRAG_THRESHOLD,
    MAX_TEXT_LENGTH,
} from '../utils/constants';
import type { RootStackParamList } from '../types/navigation';

const { width, height } = Dimensions.get('window');

// Bottom Sheet Layout (uses constants)
const COLLAPSED_HEIGHT = BOTTOM_SHEET_COLLAPSED_HEIGHT;
const EXPANDED_HEIGHT = height * BOTTOM_SHEET_EXPANDED_RATIO;
const DRAG_THRESHOLD = BOTTOM_SHEET_DRAG_THRESHOLD;

const FONTS = [
    { label: 'Homemade Apple', value: "'Homemade Apple', cursive" },
    { label: 'Caveat', value: "'Caveat', cursive" },
    { label: 'Liu Jian Mao Cao', value: "'Liu Jian Mao Cao', cursive" },
    { label: 'Indie Flower', value: "'Indie Flower', cursive" },
    { label: 'Dancing Script', value: "'Dancing Script', cursive" },
    { label: 'Shadows Into Light', value: "'Shadows Into Light', cursive" },
    { label: 'Patrick Hand', value: "'Patrick Hand', cursive" },
    { label: 'Kalam', value: "'Kalam', cursive" },
];

const COLORS = [
    { label: 'Blue', value: '#000f55', hex: '#000f55' },
    { label: 'Black', value: 'black', hex: '#000000' },
    { label: 'Red', value: '#ba3807', hex: '#ba3807' },
];

const EFFECTS = [
    { label: 'Shadows', value: 'shadows' },
    { label: 'Scanner', value: 'scanner' },
    { label: 'None', value: 'no-effect' },
];

const QUALITY_OPTIONS = [
    { label: 'Low', value: 'low', description: 'Good quality, smaller files' },
    { label: 'Medium', value: 'medium', description: 'High quality, balanced' },
    { label: 'High', value: 'high', description: 'Maximum quality' },
];

const MISTAKES_OPTIONS = [
    { label: 'Off', value: 0 },
    { label: 'Few', value: 3 },
    { label: 'Some', value: 5 },
    { label: 'Many', value: 10 },
];

type StylingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Styling'>;
type StylingScreenRouteProp = RouteProp<RootStackParamList, 'Styling'>;

export default function StylingScreen() {
    const navigation = useNavigation<StylingScreenNavigationProp>();
    const route = useRoute<StylingScreenRouteProp>();
    const { text } = route.params;
    const { colors, isDarkMode } = useTheme();

    const generatorRef = useRef<HandwritingGeneratorRef>(null);

    // Consolidated Config State
    const [config, setConfig] = useState<GenerationConfig>({
        font: FONTS[0].value,
        inkColor: COLORS[0].value,
        effect: EFFECTS[0].value as GenerationConfig['effect'],
        fontSize: 10,
        letterSpacing: 0,
        wordSpacing: 0,
        paperLines: true,
        paperMargin: true,
        topPadding: 5,
        pageSize: 'a4',
        quality: text.length > MAX_TEXT_LENGTH ? 'low' : 'medium',
        spellingMistakes: 0,
    });

    // Notify user if quality was downgraded
    useEffect(() => {
        if (text.length > MAX_TEXT_LENGTH) {
            // Short delay to ensure it appears after transition
            setTimeout(() => {
                Alert.alert(
                    'Performance Mode',
                    'Quality has been set to "Low" to improve stability with this large amount of text.',
                    [{ text: 'OK' }]
                );
            }, 500);
        }
    }, []);

    // Animation State
    const [isExpanded, setIsExpanded] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

    // Generation timeout
    const generationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const GENERATION_TIMEOUT_MS = 30000; // 30 seconds

    // Use ref to avoid stale closure in PanResponder
    const isExpandedRef = useRef(isExpanded);
    useEffect(() => {
        isExpandedRef.current = isExpanded;
    }, [isExpanded]);

    const panResponderSimple = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                const baseHeight = isExpandedRef.current ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
                const newHeight = baseHeight - gestureState.dy;
                if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
                    sheetHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const baseHeight = isExpandedRef.current ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
                const currentHeight = baseHeight - gestureState.dy;
                if (currentHeight > (EXPANDED_HEIGHT + COLLAPSED_HEIGHT) / 2) {
                    // Note: useNativeDriver: false is required for height/layout animations
                    // Using higher friction for smoother, less bouncy feel on low-end devices
                    Animated.spring(sheetHeight, {
                        toValue: EXPANDED_HEIGHT,
                        useNativeDriver: false,
                        friction: 8,
                        tension: 65,
                    }).start(() => setIsExpanded(true));
                } else {
                    Animated.spring(sheetHeight, {
                        toValue: COLLAPSED_HEIGHT,
                        useNativeDriver: false,
                        friction: 8,
                        tension: 65,
                    }).start(() => setIsExpanded(false));
                }
            },
        })
    ).current;

    const updateConfig = (key: keyof GenerationConfig, value: GenerationConfig[keyof GenerationConfig]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerateImage = () => {
        // Prevent spam-clicking
        if (isGenerating) {
            return;
        }
        if (!text || !text.trim()) {
            Alert.alert(
                'No Text',
                'Please enter some text before generating handwriting.',
                [{ text: 'OK' }]
            );
            return;
        }
        setIsGenerating(true);

        // Set timeout for generation - 30 seconds
        const startTimeout = () => {
            generationTimeoutRef.current = setTimeout(() => {
                Alert.alert(
                    'Generation Taking Long',
                    'The generation process is still running in the background. Large documents may take some time.',
                    [
                        {
                            text: 'Stop',
                            style: 'destructive',
                            onPress: () => setIsGenerating(false)
                        },
                        {
                            text: 'Wait',
                            onPress: () => startTimeout()
                        }
                    ]
                );
            }, GENERATION_TIMEOUT_MS);
        };

        startTimeout();

        generatorRef.current?.generateImage(text, config);
    };

    const handleImagesGenerated = async (images: string[]) => {
        // Clear timeout
        if (generationTimeoutRef.current) {
            clearTimeout(generationTimeoutRef.current);
            generationTimeoutRef.current = null;
        }

        if (!images || images.length === 0) {
            setIsGenerating(false);
            Alert.alert(
                'Generation Failed',
                'No images were generated. Please try again.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            // CRITICAL FIX: Save images to cache and pass URIs to prevent TransactionTooLargeException
            const savedImagePaths: string[] = [];

            for (let i = 0; i < images.length; i++) {
                const base64Data = images[i].replace(/^data:image\/[a-z]+;base64,/, "");
                const fileName = `generated_${Date.now()}_${i}.jpg`;
                const filePath = `file://${RNFS.CachesDirectoryPath}/${fileName}`;

                await RNFS.writeFile(filePath.replace('file://', ''), base64Data, 'base64');
                savedImagePaths.push(filePath);
            }

            setIsGenerating(false);
            navigation.navigate('Output', { images: savedImagePaths });

        } catch (error) {
            setIsGenerating(false);
            if (__DEV__) console.error('Failed to save cache images:', error);
            Alert.alert(
                'Error',
                'Failed to process generated images. Please ensure you have enough storage space.',
                [{ text: 'OK' }]
            );
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            generatorRef.current?.updatePreview(text, config);
        }, 500);

        return () => clearTimeout(timer);
    }, [text, config]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (generationTimeoutRef.current) {
                clearTimeout(generationTimeoutRef.current);
            }
        };
    }, []);

    // Memoize colors for ControlRow to prevent unnecessary re-renders
    const controlRowColors = useMemo(() => ({
        text: colors.text,
        textSecondary: colors.textSecondary,
        surfaceHighlight: colors.surfaceHighlight,
    }), [colors.text, colors.textSecondary, colors.surfaceHighlight]);

    // Memoized update handlers to prevent recreation on each render
    const handleFontSizeUpdate = useCallback((val: number) => updateConfig('fontSize', val), []);
    const handleLetterSpacingUpdate = useCallback((val: number) => updateConfig('letterSpacing', val), []);
    const handleWordSpacingUpdate = useCallback((val: number) => updateConfig('wordSpacing', val), []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                    <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Preview</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.previewContainer}>
                <HandwritingGenerator
                    ref={generatorRef}
                    onImagesGenerated={handleImagesGenerated}
                    onError={(error, code) => {
                        // Clear timeout
                        if (generationTimeoutRef.current) {
                            clearTimeout(generationTimeoutRef.current);
                            generationTimeoutRef.current = null;
                        }
                        setIsGenerating(false);
                        if (__DEV__) console.error('Generation error:', error, code);

                        // Show user-friendly error for specific cases
                        if (code === 'WEBVIEW_CRASH') {
                            // Alert handled by HandwritingGenerator
                            return;
                        }

                        Alert.alert(
                            'Generation Failed',
                            'Failed to generate handwriting. Please try again.',
                            [{ text: 'OK' }]
                        );
                    }}
                    style={styles.preview}
                />
            </View>

            <Animated.View
                style={[
                    styles.bottomSheet,
                    {
                        height: sheetHeight,
                        backgroundColor: colors.surface,
                        shadowColor: colors.shadow,
                    }
                ]}
            >
                <View {...panResponderSimple.panHandlers} style={styles.dragHandleContainer}>
                    <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dragLabel, { color: colors.textSecondary }]}>
                        {isExpanded ? 'Swipe down to preview' : 'Swipe up to edit style'}
                    </Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Fonts */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Font Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                            {FONTS.map((font) => (
                                <TouchableOpacity
                                    key={font.value}
                                    style={[
                                        styles.fontCard,
                                        {
                                            backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.background,
                                            borderColor: config.font === font.value ? colors.primary : colors.border,
                                            borderWidth: config.font === font.value ? 2 : 1,
                                        }
                                    ]}
                                    onPress={() => updateConfig('font', font.value)}
                                >
                                    <Text style={[
                                        styles.fontLabel,
                                        { color: config.font === font.value ? colors.text : colors.textSecondary }
                                    ]}>
                                        {font.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Text Adjustments */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Text Adjustments</Text>
                        <View style={[styles.controlsCard, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.background }]}>
                            <ControlRow
                                label="Font Size"
                                value={config.fontSize ?? 10}
                                onUpdate={handleFontSizeUpdate}
                                min={10} max={40} step={1}
                                suffix="px"
                                colors={controlRowColors}
                            />
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <ControlRow
                                label="Letter Spacing"
                                value={config.letterSpacing ?? 0}
                                onUpdate={handleLetterSpacingUpdate}
                                min={-5} max={10} step={0.5}
                                suffix="px"
                                colors={controlRowColors}
                            />
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <ControlRow
                                label="Word Spacing"
                                value={config.wordSpacing ?? 0}
                                onUpdate={handleWordSpacingUpdate}
                                min={-5} max={20} step={1}
                                suffix="px"
                                colors={controlRowColors}
                            />
                        </View>
                    </View>

                    {/* Colors */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ink Color</Text>
                        <View style={styles.colorRow}>
                            {COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color.value}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: color.hex },
                                        config.inkColor === color.value && {
                                            borderColor: colors.text,
                                            transform: [{ scale: 1.15 }]
                                        }
                                    ]}
                                    onPress={() => updateConfig('inkColor', color.value)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Effects */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paper Effect</Text>
                        <View style={[styles.effectRow, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.surfaceHighlight }]}>
                            {EFFECTS.map((effect) => (
                                <TouchableOpacity
                                    key={effect.value}
                                    style={[
                                        styles.effectButton,
                                        config.effect === effect.value && {
                                            backgroundColor: colors.card,
                                            shadowColor: colors.shadow,
                                        }
                                    ]}
                                    onPress={() => updateConfig('effect', effect.value)}
                                >
                                    <Text style={[
                                        styles.effectLabel,
                                        { color: config.effect === effect.value ? colors.text : colors.textSecondary }
                                    ]}>
                                        {effect.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Quality */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Output Quality</Text>
                        <View style={[styles.effectRow, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.surfaceHighlight }]}>
                            {QUALITY_OPTIONS.map((quality) => (
                                <TouchableOpacity
                                    key={quality.value}
                                    style={[
                                        styles.effectButton,
                                        config.quality === quality.value && {
                                            backgroundColor: colors.card,
                                            shadowColor: colors.shadow,
                                        }
                                    ]}
                                    onPress={() => updateConfig('quality', quality.value)}
                                >
                                    <Text style={[
                                        styles.effectLabel,
                                        { color: config.quality === quality.value ? colors.text : colors.textSecondary }
                                    ]}>
                                        {quality.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Spelling Mistakes */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Spelling Mistakes</Text>
                        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Cross out words like real handwriting</Text>
                        <View style={[styles.effectRow, { backgroundColor: isDarkMode ? colors.surfaceHighlight : colors.surfaceHighlight }]}>
                            {MISTAKES_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.effectButton,
                                        config.spellingMistakes === option.value && {
                                            backgroundColor: colors.card,
                                            shadowColor: colors.shadow,
                                        }
                                    ]}
                                    onPress={() => updateConfig('spellingMistakes', option.value)}
                                >
                                    <Text style={[
                                        styles.effectLabel,
                                        { color: config.spellingMistakes === option.value ? colors.text : colors.textSecondary }
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 80 }} />
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.generateButton,
                            {
                                backgroundColor: colors.primary,
                                opacity: isGenerating ? 0.7 : 1
                            }
                        ]}
                        onPress={handleGenerateImage}
                        disabled={isGenerating}
                        accessibilityLabel={isGenerating ? 'Generating handwriting' : 'Generate handwriting'}
                        accessibilityState={{ disabled: isGenerating }}
                    >
                        {isGenerating ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                                <Text style={[styles.generateButtonText, { color: colors.onPrimary, marginLeft: 8 }]}>Generating...</Text>
                            </View>
                        ) : (
                            <Text style={[styles.generateButtonText, { color: colors.onPrimary }]}>Generate Handwriting</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
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
        paddingVertical: 12,
        zIndex: 1,
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
    previewContainer: {
        flex: 1,
        marginBottom: COLLAPSED_HEIGHT,
    },
    preview: {
        flex: 1,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 20,
        zIndex: 100,
        overflow: 'hidden',
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        marginBottom: 8,
    },
    dragLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    sectionHint: {
        fontSize: 12,
        marginBottom: 12,
        opacity: 0.7,
    },
    horizontalList: {
        paddingRight: 20,
    },
    fontCard: {
        width: 110,
        height: 90,
        borderRadius: 16,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    fontIcon: {
        fontSize: 32,
        marginBottom: 6,
    },
    fontLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    controlsCard: {
        borderRadius: 16,
        padding: 16,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    controlLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepperButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperButtonText: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 22,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '600',
        width: 60,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        marginVertical: 8,
        opacity: 0.5,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 20,
    },
    colorSwatch: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    effectRow: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
    },
    effectButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    effectLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        borderTopWidth: 1,
    },
    generateButton: {
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    generateButtonText: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
