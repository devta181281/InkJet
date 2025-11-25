import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import HandwritingGenerator, { HandwritingGeneratorRef, GenerationConfig } from '../components/HandwritingGenerator';

const { width } = Dimensions.get('window');

const FONTS = [
    { label: 'Homemade Apple', value: "'Homemade Apple', cursive", preview: 'Abc' },
    { label: 'Caveat', value: "'Caveat', cursive", preview: 'Abc' },
    { label: 'Liu Jian Mao Cao', value: "'Liu Jian Mao Cao', cursive", preview: 'Abc' },
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

export default function StylingScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { text } = route.params as { text: string };

    const generatorRef = useRef<HandwritingGeneratorRef>(null);
    const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [selectedEffect, setSelectedEffect] = useState(EFFECTS[0].value);

    // New Options
    const [fontSize, setFontSize] = useState('10');
    const [resolution, setResolution] = useState(2);
    const [topPadding, setTopPadding] = useState('5');
    const [wordSpacing, setWordSpacing] = useState('0');
    const [letterSpacing, setLetterSpacing] = useState('0');

    const handleGenerateImage = () => {
        const config: GenerationConfig = {
            font: selectedFont,
            inkColor: selectedColor,
            effect: selectedEffect,
            paperLines: true,
            paperMargin: true,
            fontSize: parseFloat(fontSize) || 10,
            resolution: resolution,
            topPadding: parseFloat(topPadding) || 5,
            wordSpacing: parseFloat(wordSpacing) || 0,
            letterSpacing: parseFloat(letterSpacing) || 0,
            pageSize: 'a4',
        };
        generatorRef.current?.generateImage(text, config);
    };

    const handleImagesGenerated = (images: string[]) => {
        navigation.navigate('Output', { images });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const config: GenerationConfig = {
                font: selectedFont,
                inkColor: selectedColor,
                effect: selectedEffect,
                paperLines: true,
                paperMargin: true,
                fontSize: parseFloat(fontSize) || 10,
                resolution: resolution,
                topPadding: parseFloat(topPadding) || 5,
                wordSpacing: parseFloat(wordSpacing) || 0,
                letterSpacing: parseFloat(letterSpacing) || 0,
                pageSize: 'a4',
            };
            generatorRef.current?.updatePreview(text, config);
        }, 500);

        return () => clearTimeout(timer);
    }, [text, selectedFont, selectedColor, selectedEffect, fontSize, resolution, topPadding, wordSpacing, letterSpacing]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

            <View style={styles.previewContainer}>
                <HandwritingGenerator
                    ref={generatorRef}
                    onImagesGenerated={handleImagesGenerated}
                    style={styles.preview}
                />
            </View>

            <View style={styles.controlsContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Fonts */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Font Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                            {FONTS.map((font) => (
                                <TouchableOpacity
                                    key={font.value}
                                    style={[styles.fontCard, selectedFont === font.value && styles.selectedCard]}
                                    onPress={() => setSelectedFont(font.value)}
                                >
                                    <Text style={[styles.fontPreview, { fontFamily: 'System' }]}>Aa</Text>
                                    <Text style={[styles.fontLabel, selectedFont === font.value && styles.selectedText]}>
                                        {font.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Colors */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ink Color</Text>
                        <View style={styles.colorRow}>
                            {COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color.value}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: color.hex },
                                        selectedColor === color.value && styles.selectedColorSwatch
                                    ]}
                                    onPress={() => setSelectedColor(color.value)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Effects */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Paper Effect</Text>
                        <View style={styles.effectRow}>
                            {EFFECTS.map((effect) => (
                                <TouchableOpacity
                                    key={effect.value}
                                    style={[styles.effectButton, selectedEffect === effect.value && styles.selectedEffectButton]}
                                    onPress={() => setSelectedEffect(effect.value)}
                                >
                                    <Text style={[styles.effectLabel, selectedEffect === effect.value && styles.selectedEffectLabel]}>
                                        {effect.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.generateButton} onPress={handleGenerateImage}>
                        <Text style={styles.generateButtonText}>Generate Handwriting</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    previewContainer: {
        height: '45%',
        backgroundColor: '#e0e0e0',
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    preview: {
        flex: 1,
    },
    controlsContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#999',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    horizontalList: {
        paddingRight: 20,
    },
    fontCard: {
        width: 100,
        height: 80,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: '#1a1a1a',
        backgroundColor: '#fff',
    },
    fontPreview: {
        fontSize: 24,
        marginBottom: 4,
        color: '#333',
    },
    fontLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    selectedText: {
        color: '#1a1a1a',
        fontWeight: '600',
    },
    colorRow: {
        flexDirection: 'row',
        gap: 16,
    },
    colorSwatch: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedColorSwatch: {
        borderColor: '#1a1a1a',
        transform: [{ scale: 1.1 }],
    },
    effectRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 4,
    },
    effectButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    selectedEffectButton: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    effectLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    selectedEffectLabel: {
        color: '#1a1a1a',
        fontWeight: '600',
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
    generateButton: {
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
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
