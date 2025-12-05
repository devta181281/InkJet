import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch React errors and show a fallback UI
 * instead of a white screen crash.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log to crash reporting service in production
        if (__DEV__) {
            console.error('ErrorBoundary caught:', error, errorInfo);
        }
    }

    handleRestart = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text style={styles.title}>Oops! Something went wrong</Text>
                    <Text style={styles.message}>
                        The app encountered an unexpected error.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 32,
    },
    button: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
