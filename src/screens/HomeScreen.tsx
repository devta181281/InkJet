import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import HandwritingGenerator, { HandwritingGeneratorRef } from '../components/HandwritingGenerator';

const FONTS = [
    { label: 'Homemade Apple', value: "'Homemade Apple', cursive" },
    { label: 'Caveat', value: "'Caveat', cursive" },
    { label: 'Liu Jian Mao Cao', value: "'Liu Jian Mao Cao', cursive" },
];

const COLORS = [
    { label: 'Blue', value: '#000f55' },
    { label: 'Black', value: 'black' },
    { label: 'Red', value: '#ba3807' },
];

const EFFECTS = [
    { label: 'Shadows', value: 'shadows' },
    { label: 'Scanner', value: 'scanner' },
    { label: 'No Effect', value: 'no-effect' },
];

const RESOLUTIONS = [
    { label: 'Very Low', value: 0.8 },
    { label: 'Low', value: 1 },
    { label: 'Normal', value: 2 },
    { label: 'High', value: 3 },
    { label: 'Very High', value: 4 },
];

export default function HomeScreen() {
    const navigation = useNavigation();
    const generatorRef = useRef<HandwritingGeneratorRef>(null);
    const [text, setText] = useState('');
    const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [selectedEffect, setSelectedEffect] = useState(EFFECTS[0].value);
    const [isExtracting, setIsExtracting] = useState(false);

    // New Options
    const [fontSize, setFontSize] = useState('10');
    const [resolution, setResolution] = useState(2);
    const [topPadding, setTopPadding] = useState('5');
    const [wordSpacing, setWordSpacing] = useState('0');
    const [letterSpacing, setLetterSpacing] = useState('0');

    const handleGenerate = () => {
        navigation.navigate('Output', {
            text,
            config: {
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
            },
        });
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

    const renderOption = (label: string, isSelected: boolean, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            onPress={onPress}
        >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Inkjet</Text>
                <Text style={styles.subHeader}>Text to Handwriting</Text>

                <View style={styles.inputContainer}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Input Text</Text>
                        <TouchableOpacity onPress={handleImportPdf} style={styles.importButton} disabled={isExtracting}>
                            {isExtracting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.importButtonText}>Import PDF</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.textInput}
                        multiline
                        placeholder="Type your text here..."
                        placeholderTextColor="#666"
                        value={text}
                        onChangeText={setText}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Handwriting Font</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                        {FONTS.map((font) => (
                            <View key={font.value} style={{ marginRight: 10 }}>
                                {renderOption(font.label, selectedFont === font.value, () => setSelectedFont(font.value))}
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Ink Color</Text>
                    <View style={styles.optionsRow}>
                        {COLORS.map((color) => (
                            <View key={color.value} style={{ marginRight: 10 }}>
                                {renderOption(color.label, selectedColor === color.value, () => setSelectedColor(color.value))}
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Page & Text Options</Text>

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Font Size (pt)</Text>
                            <TextInput
                                style={styles.numberInput}
                                keyboardType="numeric"
                                value={fontSize}
                                onChangeText={setFontSize}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Page Size</Text>
                            <View style={[styles.numberInput, { justifyContent: 'center' }]}>
                                <Text style={{ color: '#fff' }}>A4</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.subLabel, { marginTop: 15 }]}>Resolution</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                        {RESOLUTIONS.map((res) => (
                            <View key={res.value} style={{ marginRight: 10 }}>
                                {renderOption(res.label, resolution === res.value, () => setResolution(res.value))}
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Effect</Text>
                    <View style={styles.optionsRow}>
                        {EFFECTS.map((effect) => (
                            <View key={effect.value} style={{ marginRight: 10 }}>
                                {renderOption(effect.label, selectedEffect === effect.value, () => setSelectedEffect(effect.value))}
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Spacing Options</Text>

                    <View style={styles.row}>
                        <View style={styles.thirdInput}>
                            <Text style={styles.subLabel}>Vertical Pos</Text>
                            <TextInput
                                style={styles.numberInput}
                                keyboardType="numeric"
                                value={topPadding}
                                onChangeText={setTopPadding}
                            />
                        </View>
                        <View style={styles.thirdInput}>
                            <Text style={styles.subLabel}>Word Spacing</Text>
                            <TextInput
                                style={styles.numberInput}
                                keyboardType="numeric"
                                value={wordSpacing}
                                onChangeText={setWordSpacing}
                            />
                        </View>
                        <View style={styles.thirdInput}>
                            <Text style={styles.subLabel}>Letter Spacing</Text>
                            <TextInput
                                style={styles.numberInput}
                                keyboardType="numeric"
                                value={letterSpacing}
                                onChangeText={setLetterSpacing}
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                    <Text style={styles.generateButtonText}>Generate Image</Text>
                </TouchableOpacity>
            </ScrollView>

            <HandwritingGenerator
                ref={generatorRef}
                onImagesGenerated={() => { }}
                onPdfTextExtracted={handlePdfTextExtracted}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 50,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    subHeader: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 30,
    },
    inputContainer: {
        marginBottom: 25,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    importButton: {
        backgroundColor: '#333',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#555',
    },
    importButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    subLabel: {
        fontSize: 12,
        color: '#aaa',
        marginBottom: 5,
    },
    textInput: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        borderRadius: 12,
        padding: 15,
        height: 150,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    numberInput: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#333',
        textAlign: 'center',
    },
    section: {
        marginBottom: 25,
    },
    optionsRow: {
        flexDirection: 'row',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    thirdInput: {
        width: '31%',
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#333',
    },
    optionButtonSelected: {
        backgroundColor: '#333',
        borderColor: '#fff',
    },
    optionText: {
        color: '#888',
        fontSize: 14,
    },
    optionTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    generateButton: {
        backgroundColor: '#fff',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    generateButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
