export const theme = {
    light: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        surfaceHighlight: '#F0F2F5',
        text: '#1A1A1A',
        textSecondary: '#666666',
        textTertiary: '#999999',
        primary: '#1A1A1A', // Black for primary actions in light mode
        onPrimary: '#FFFFFF',
        border: '#E5E5E5',
        error: '#FF3B30',
        success: '#34C759',
        card: '#FFFFFF',
        shadow: '#000000',
    },
    dark: {
        background: '#000000',
        surface: '#1C1C1E',
        surfaceHighlight: '#2C2C2E',
        text: '#FFFFFF',
        textSecondary: '#A1A1A6',
        textTertiary: '#666666',
        primary: '#FFFFFF', // White for primary actions in dark mode
        onPrimary: '#000000',
        border: '#38383A',
        error: '#FF453A',
        success: '#32D74B',
        card: '#1C1C1E',
        shadow: '#000000',
    },
};

export type ThemeColors = typeof theme.light;
