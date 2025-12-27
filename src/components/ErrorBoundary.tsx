import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance, ScrollView } from 'react-native';
import { CrashReporter } from '../utils/crashReporter';

interface Props {
    children: ReactNode;
    /** Optional fallback component */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and show a fallback UI
 * instead of a white screen crash. Supports dark mode.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log to console in development
        if (__DEV__) {
            console.error('ErrorBoundary caught:', error, errorInfo);
        }

        // Report to crash reporting service
        CrashReporter.recordError(error, {
            componentStack: errorInfo.componentStack ?? undefined,
        });
    }

    handleRestart = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Check for custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isDarkMode = Appearance.getColorScheme() === 'dark';
            const colors = isDarkMode ? darkColors : lightColors;

            return (
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Oops! Something went wrong
                    </Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        The app encountered an unexpected error.
                    </Text>

                    {/* Show error details in development */}
                    {__DEV__ && this.state.error && (
                        <ScrollView
                            style={[styles.errorBox, { backgroundColor: colors.errorBg }]}
                            contentContainerStyle={styles.errorBoxContent}
                        >
                            <Text style={[styles.errorTitle, { color: colors.error }]}>
                                {this.state.error.name}: {this.state.error.message}
                            </Text>
                            {this.state.errorInfo?.componentStack && (
                                <Text style={[styles.errorStack, { color: colors.textSecondary }]}>
                                    {this.state.errorInfo.componentStack.slice(0, 500)}
                                </Text>
                            )}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={this.handleRestart}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                            Try Again
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const lightColors = {
    background: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    primary: '#1A1A1A',
    onPrimary: '#FFFFFF',
    error: '#DC2626',
    errorBg: '#FEF2F2',
};

const darkColors = {
    background: '#121212',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    primary: '#FFFFFF',
    onPrimary: '#1A1A1A',
    error: '#F87171',
    errorBg: '#371717',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    errorBox: {
        maxHeight: 200,
        width: '100%',
        borderRadius: 12,
        marginBottom: 24,
    },
    errorBoxContent: {
        padding: 16,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    errorStack: {
        fontSize: 12,
        fontFamily: 'monospace',
    },
    button: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;

