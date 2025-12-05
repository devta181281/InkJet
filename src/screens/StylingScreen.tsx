import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HandwritingGenerator, { HandwritingGeneratorRef, GenerationConfig } from '../components/HandwritingGenerator';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

const { width, height } = Dimensions.get('window');

// Constants for Bottom Sheet
const HEADER_HEIGHT = 80;
const COLLAPSED_HEIGHT = 200;
const EXPANDED_HEIGHT = height * 0.55;
const DRAG_THRESHOLD = 50;

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
        resolution: 2,
        topPadding: 5,
        pageSize: 'a4',
    });

    // Animation State
    const [isExpanded, setIsExpanded] = useState(false);
    const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

    const panResponderSimple = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                const newHeight = (isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT) - gestureState.dy;
                if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
                    sheetHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const currentHeight = (isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT) - gestureState.dy;
                if (currentHeight > (EXPANDED_HEIGHT + COLLAPSED_HEIGHT) / 2) {
                    Animated.spring(sheetHeight, {
                        toValue: EXPANDED_HEIGHT,
                        useNativeDriver: false,
                    }).start(() => setIsExpanded(true));
                } else {
                    Animated.spring(sheetHeight, {
                        toValue: COLLAPSED_HEIGHT,
                        useNativeDriver: false,
                    }).start(() => setIsExpanded(false));
                }
            },
        })
    ).current;

    const updateConfig = (key: keyof GenerationConfig, value: GenerationConfig[keyof GenerationConfig]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerateImage = () => {
        generatorRef.current?.generateImage(text, config);
    };

    const handleImagesGenerated = (images: string[]) => {
        navigation.navigate('Output', { images });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            generatorRef.current?.updatePreview(text, config);
        }, 500);

        return () => clearTimeout(timer);
    }, [text, config]);

    interface ControlRowProps {
        label: string;
        value: number;
        onUpdate: (val: number) => void;
        min: number;
        max: number;
        step: number;
        suffix?: string;
    }

    const ControlRow = ({ label, value, onUpdate, min, max, step, suffix = '' }: ControlRowProps) => (
        <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={styles.stepperContainer}>
                <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: colors.surfaceHighlight }]}
                    onPress={() => onUpdate(Math.max(min, Number((value - step).toFixed(1))))}
                >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>-</Text>
                </TouchableOpacity>

                <Text style={[styles.valueText, { color: colors.text }]}>{value}{suffix}</Text>

                <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: colors.surfaceHighlight }]}
                    onPress={() => onUpdate(Math.min(max, Number((value + step).toFixed(1))))}
                >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
                        if (__DEV__) console.error('Generation error:', error, code);
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
                                onUpdate={(val: number) => updateConfig('fontSize', val)}
                                min={10} max={40} step={1}
                                suffix="px"
                            />
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <ControlRow
                                label="Letter Spacing"
                                value={config.letterSpacing ?? 0}
                                onUpdate={(val: number) => updateConfig('letterSpacing', val)}
                                min={-5} max={10} step={0.5}
                                suffix="px"
                            />
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <ControlRow
                                label="Word Spacing"
                                value={config.wordSpacing ?? 0}
                                onUpdate={(val: number) => updateConfig('wordSpacing', val)}
                                min={-5} max={20} step={1}
                                suffix="px"
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

                    <View style={{ height: 80 }} />
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.generateButton, { backgroundColor: colors.primary }]}
                        onPress={handleGenerateImage}
                    >
                        <Text style={[styles.generateButtonText, { color: colors.onPrimary }]}>Generate Handwriting</Text>
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
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
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
