/**
 * Application Constants
 * Centralizes magic numbers and configuration values
 */

// ============================================
// TEXT INPUT LIMITS
// ============================================

/**
 * Maximum allowed text input length in characters.
 * 50,000 chars ≈ 25 pages at ~2000 chars/page.
 * Prevents OOM during image generation and pagination.
 */
export const MAX_TEXT_LENGTH = 50000;

/**
 * Estimated characters per page for A4 with default settings.
 */
export const CHARS_PER_PAGE_ESTIMATE = 2000;

/**
 * Character count threshold to show a warning (80% of max).
 */
export const TEXT_LENGTH_WARNING_THRESHOLD = MAX_TEXT_LENGTH * 0.8;

// ============================================
// PAGINATION SAFETY
// ============================================

/**
 * Maximum iterations for pagination loop.
 * Prevents infinite loops from very long single words.
 */
export const MAX_PAGINATION_ITERATIONS = 1000;

// ============================================
// Memory and Performance
// ============================================

export const PDF_CHUNK_SIZE = 500 * 1024; // 500KB chunks for PDF transfer
export const MAX_STORED_IMAGES = 10; // Limit for cached images
export const PREVIEW_DEBOUNCE_MS = 500; // Debounce for preview updates

// Image Generation
export const DEFAULT_IMAGE_RESOLUTION = 2; // Scale factor for html2canvas

// A4 Page Dimensions (in points, 72 dpi)
export const A4_WIDTH_PT = 595;
export const A4_HEIGHT_PT = 842;
export const A4_ASPECT_RATIO = A4_WIDTH_PT / A4_HEIGHT_PT; // ~0.707

// Page Layout
export const PAGE_TOP_MARGIN = 50;
export const PAGE_LEFT_MARGIN = 50;
export const PAGE_CONTENT_PADDING = 5;

// Animation
export const THEME_TRANSITION_MS = 350;
export const SHEET_COLLAPSE_HEIGHT = 200;
export const SHEET_DRAG_THRESHOLD = 50;

// Timeouts
export const WEBVIEW_READY_TIMEOUT = 10000; // 10 seconds
export const PDF_GENERATION_TIMEOUT = 30000; // 30 seconds

// Default Styling
export const DEFAULT_FONT_SIZE = 10;
export const DEFAULT_LETTER_SPACING = 0;
export const DEFAULT_WORD_SPACING = 0;
export const DEFAULT_INK_COLOR = '#000f55';
export const DEFAULT_FONT_FAMILY = "'Homemade Apple', cursive";

// ============================================
// BOTTOM SHEET LAYOUT
// ============================================
export const BOTTOM_SHEET_HEADER_HEIGHT = 80;
export const BOTTOM_SHEET_COLLAPSED_HEIGHT = 200;
export const BOTTOM_SHEET_EXPANDED_RATIO = 0.55;
export const BOTTOM_SHEET_DRAG_THRESHOLD = 50;

