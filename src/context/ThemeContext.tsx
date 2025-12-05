import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { theme, ThemeColors } from '../utils/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    colors: ThemeColors;
    isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'system',
    setMode: () => { },
    colors: theme.light,
    isDarkMode: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('system');

    const isDarkMode = mode === 'system'
        ? systemScheme === 'dark'
        : mode === 'dark';

    const colors = isDarkMode ? theme.dark : theme.light;

    return (
        <ThemeContext.Provider value={{ mode, setMode, colors, isDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
