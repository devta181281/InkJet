/**
 * Crash Reporter Utility
 * 
 * Provides a unified interface for crash reporting. In development, errors
 * are logged to console. In production, this can be configured to send
 * to Sentry, Firebase Crashlytics, or any other crash reporting service.
 * 
 * To integrate with Sentry:
 * 1. npm install @sentry/react-native
 * 2. Initialize in index.js: Sentry.init({ dsn: 'YOUR_DSN' })
 * 3. Uncomment Sentry calls below
 */

interface ErrorContext {
    componentStack?: string;
    screen?: string;
    action?: string;
    [key: string]: unknown;
}

class CrashReporterClass {
    private isInitialized = false;

    /**
     * Initialize crash reporting. Call this in your app entry (index.js).
     * @param dsn - Your Sentry DSN (optional for development)
     */
    init(dsn?: string): void {
        if (this.isInitialized) return;

        if (__DEV__) {
            console.log('[CrashReporter] Development mode - errors will be logged to console');
        } else if (dsn) {
            // Uncomment for Sentry integration:
            // Sentry.init({ dsn, enableAutoSessionTracking: true });
            console.log('[CrashReporter] Initialized in production');
        }

        this.isInitialized = true;
    }

    /**
     * Record a non-fatal error
     */
    recordError(error: Error, context?: ErrorContext): void {
        if (__DEV__) {
            console.error('[CrashReporter] Error:', error.message, context);
        } else {
            // Uncomment for Sentry integration:
            // Sentry.captureException(error, { extra: context });
        }
    }

    /**
     * Record a warning message
     */
    recordWarning(message: string, context?: ErrorContext): void {
        if (__DEV__) {
            console.warn('[CrashReporter] Warning:', message, context);
        } else {
            // Uncomment for Sentry integration:
            // Sentry.captureMessage(message, { level: 'warning', extra: context });
        }
    }

    /**
     * Set user context for crash reports
     */
    setUser(_userId: string, _email?: string): void {
        if (!__DEV__) {
            // Uncomment for Sentry integration:
            // Sentry.setUser({ id: userId, email });
        }
    }

    /**
     * Clear user context
     */
    clearUser(): void {
        if (!__DEV__) {
            // Uncomment for Sentry integration:
            // Sentry.setUser(null);
        }
    }

    /**
     * Add breadcrumb for debugging (shows what led to a crash)
     */
    addBreadcrumb(_category: string, _message: string, /* data?: Record<string, unknown> */): void {
        if (!__DEV__) {
            // Uncomment for Sentry integration:
            // Sentry.addBreadcrumb({ category, message, data, level: 'info' });
        }
    }
}

// Export singleton instance
export const CrashReporter = new CrashReporterClass();
