import { Alert } from 'react-native';

/**
 * Error codes for categorizing errors throughout the app.
 * Using string enums for better debugging and logging.
 */
export enum ErrorCode {
    // Network errors
    NETWORK_OFFLINE = 'NETWORK_OFFLINE',
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',

    // File system errors
    FILE_READ_FAILED = 'FILE_READ_FAILED',
    FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    // PDF errors
    PDF_INVALID = 'PDF_INVALID',
    PDF_PASSWORD_PROTECTED = 'PDF_PASSWORD_PROTECTED',
    PDF_EXTRACTION_FAILED = 'PDF_EXTRACTION_FAILED',

    // WebView/Generator errors
    WEBVIEW_ERROR = 'WEBVIEW_ERROR',
    WEBVIEW_CRASH = 'WEBVIEW_CRASH',
    GENERATION_FAILED = 'GENERATION_FAILED',
    LIBRARY_NOT_LOADED = 'LIBRARY_NOT_LOADED',

    // General errors
    UNKNOWN = 'UNKNOWN',
    CANCELLED = 'CANCELLED',
}

/**
 * User-friendly messages for each error code.
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ErrorCode.NETWORK_OFFLINE]: 'No internet connection. Please check your network settings.',
    [ErrorCode.NETWORK_TIMEOUT]: 'The request timed out. Please try again.',
    [ErrorCode.NETWORK_REQUEST_FAILED]: 'Network request failed. Please try again.',
    [ErrorCode.FILE_READ_FAILED]: 'Failed to read the file. Please try again.',
    [ErrorCode.FILE_WRITE_FAILED]: 'Failed to save the file. Please try using the Share option.',
    [ErrorCode.FILE_NOT_FOUND]: 'The file could not be found.',
    [ErrorCode.PERMISSION_DENIED]: 'Permission denied. Please enable the required permission in Settings.',
    [ErrorCode.PDF_INVALID]: 'The PDF file appears to be invalid or corrupted.',
    [ErrorCode.PDF_PASSWORD_PROTECTED]: 'This PDF is password protected and cannot be processed.',
    [ErrorCode.PDF_EXTRACTION_FAILED]: 'Failed to extract text from PDF. Please try a different file.',
    [ErrorCode.WEBVIEW_ERROR]: 'An error occurred in the generator. Please try again.',
    [ErrorCode.WEBVIEW_CRASH]: 'The generator crashed unexpectedly. Restarting...',
    [ErrorCode.GENERATION_FAILED]: 'Failed to generate handwriting. Please try again.',
    [ErrorCode.LIBRARY_NOT_LOADED]: 'Required resources are still loading. Please wait and try again.',
    [ErrorCode.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.CANCELLED]: 'Operation was cancelled.',
};

/**
 * Custom error class with error code and context support.
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly context?: Record<string, unknown>;
    public readonly originalError?: Error;

    constructor(
        code: ErrorCode,
        message?: string,
        options?: {
            context?: Record<string, unknown>;
            originalError?: Error;
        }
    ) {
        super(message || ERROR_MESSAGES[code]);
        this.name = 'AppError';
        this.code = code;
        this.context = options?.context;
        this.originalError = options?.originalError;

        // Note: Stack trace is automatically captured by Error constructor
    }

    /**
     * Get user-friendly message for display.
     */
    getUserMessage(): string {
        return ERROR_MESSAGES[this.code];
    }
}

/**
 * Options for handleError function.
 */
interface HandleErrorOptions {
    /** Show alert to user. Default: true */
    showAlert?: boolean;
    /** Custom alert title */
    alertTitle?: string;
    /** Custom alert message (overrides error message) */
    alertMessage?: string;
    /** Additional context for logging */
    context?: Record<string, unknown>;
    /** Callback after error is handled */
    onError?: (error: AppError) => void;
}

/**
 * Centralized error handling function.
 * Logs errors in development and shows user-friendly alerts.
 */
export function handleError(
    error: unknown,
    options: HandleErrorOptions = {}
): AppError {
    const {
        showAlert = true,
        alertTitle = 'Error',
        alertMessage,
        context,
        onError,
    } = options;

    // Convert to AppError if needed
    let appError: AppError;

    if (error instanceof AppError) {
        appError = error;
    } else if (error instanceof Error) {
        appError = new AppError(ErrorCode.UNKNOWN, error.message, {
            originalError: error,
            context,
        });
    } else {
        appError = new AppError(ErrorCode.UNKNOWN, String(error), { context });
    }

    // Log in development
    if (__DEV__) {
        console.error(`[${appError.code}] ${appError.message}`, {
            context: appError.context,
            originalError: appError.originalError,
        });
    }

    // TODO: In production, send to crash reporting service
    // crashReporting.recordError(appError);

    // Show alert if requested
    if (showAlert && appError.code !== ErrorCode.CANCELLED) {
        Alert.alert(
            alertTitle,
            alertMessage || appError.getUserMessage(),
            [{ text: 'OK' }]
        );
    }

    // Call callback if provided
    onError?.(appError);

    return appError;
}

/**
 * Creates an AppError from a known error code.
 */
export function createError(
    code: ErrorCode,
    options?: {
        message?: string;
        context?: Record<string, unknown>;
        originalError?: Error;
    }
): AppError {
    return new AppError(code, options?.message, {
        context: options?.context,
        originalError: options?.originalError,
    });
}

/**
 * Check if an error is a specific AppError code.
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
    return error instanceof AppError && error.code === code;
}

/**
 * Wraps an async function with error handling.
 * Returns [result, error] tuple similar to Go-style error handling.
 */
export async function tryCatch<T>(
    fn: () => Promise<T>,
    errorOptions?: HandleErrorOptions
): Promise<[T | null, AppError | null]> {
    try {
        const result = await fn();
        return [result, null];
    } catch (error) {
        const appError = handleError(error, { showAlert: false, ...errorOptions });
        return [null, appError];
    }
}
