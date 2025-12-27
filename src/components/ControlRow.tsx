import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ControlRowProps {
    label: string;
    value: number;
    onUpdate: (val: number) => void;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    colors: {
        text: string;
        textSecondary: string;
        surfaceHighlight: string;
    };
}

/**
 * Memoized control row component for numeric value adjustment.
 * Extracted for performance - prevents recreation on parent re-renders.
 */
const ControlRow = React.memo(({
    label,
    value,
    onUpdate,
    min,
    max,
    step,
    suffix = '',
    colors
}: ControlRowProps) => {
    const handleDecrement = () => {
        onUpdate(Math.max(min, Number((value - step).toFixed(1))));
    };

    const handleIncrement = () => {
        onUpdate(Math.min(max, Number((value + step).toFixed(1))));
    };

    return (
        <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                {label}
            </Text>
            <View style={styles.stepperContainer}>
                <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: colors.surfaceHighlight }]}
                    onPress={handleDecrement}
                    accessibilityLabel={`Decrease ${label}`}
                    accessibilityRole="button"
                >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>-</Text>
                </TouchableOpacity>

                <Text style={[styles.valueText, { color: colors.text }]}>
                    {value}{suffix}
                </Text>

                <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: colors.surfaceHighlight }]}
                    onPress={handleIncrement}
                    accessibilityLabel={`Increase ${label}`}
                    accessibilityRole="button"
                >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

ControlRow.displayName = 'ControlRow';

const styles = StyleSheet.create({
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
});

export default ControlRow;
