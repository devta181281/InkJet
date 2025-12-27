import { getFontFaceCss } from './fonts';
import { HTML2CANVAS_SRC, JSPDF_SRC, PDFJS_SRC, PDF_WORKER_SRC } from './bundledLibs';

/**
 * Generates the HTML template for the WebView.
 * Uses bundled libraries for offline support.
 * Business logic is structured and documented for maintainability.
 */
export const getHtmlTemplate = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Content Security Policy: Restrict resources to prevent XSS -->
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   script-src 'unsafe-inline'; 
                   style-src 'unsafe-inline' https://fonts.googleapis.com; 
                   font-src https://fonts.gstatic.com data:; 
                   img-src 'self' data: blob:;
                   worker-src 'self' blob:;">
    <title>Handwriting Generator</title>

    <!-- Bundled Libraries -->
    <script>${HTML2CANVAS_SRC}</script>
    <script>${JSPDF_SRC}</script>
    <script>${PDFJS_SRC}</script>
    
    <!-- PDF Worker Setup -->
    <script id="pdf-worker" type="application/javascript">
        ${PDF_WORKER_SRC}
    </script>
    <script>
        if (window.pdfjsLib) {
            try {
                const workerContent = document.getElementById('pdf-worker').textContent;
                const blob = new Blob([workerContent], { type: 'application/javascript' });
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
            } catch (e) {
                console.error('Failed to load PDF worker:', e);
            }
        }
    </script>

    <style>
        ${getFontFaceCss()}

        :root {
            --ink-color: #000f55;
            --handwriting-font: 'Homemade Apple', cursive;
        }

        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #fff; }

        .page-container {
            width: 100%;
            overflow-x: auto;
            display: flex;
            justify-content: center;
            padding: 20px;
        }

        .page-a {
            width: 595px;
            min-height: 842px;
            background: #fff;
            border: 1px solid #f3f3f3;
            font-size: 10pt;
            position: relative;
            font-family: var(--handwriting-font);
            color: var(--ink-color);
            line-height: 1.5em;
            overflow: hidden;
        }

        .page-a.lines .paper-content {
            background-image: linear-gradient(#999 0.05em, transparent 0.1em);
            background-size: 100% 1.5em;
        }

        .margined .paper-content {
            padding: 5px;
            margin: 0px;
            padding-left: 55px;
        }

        .left-margin, .top-margin { display: none; }

        .margined .top-margin {
            height: 50px;
            border-bottom: 2px solid pink;
            width: 100%;
            display: block;
        }

        .margined .left-margin {
            width: 50px;
            height: 100%;
            display: inline-block;
            border-right: 2px solid pink;
            position: absolute;
            left: 0;
            top: 0;
            padding-top: 50px;
        }

        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 100%;
            display: none;
            pointer-events: none;
        }

        .overlay.shadows {
            display: block;
            background: linear-gradient(10deg, #000a, #0001);
        }
        
        .paper-content {
            margin: 10px;
            width: 100%;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        
        .left-margin-and-content {
            display: flex;
            min-height: calc(100% - 50px);
        }

        /* Spelling Mistakes Styles */
        .mistake {
            display: inline;
        }
        .crossed-word {
            position: relative;
            display: inline;
            opacity: 0.7;
        }
        .crossed-word::after {
            content: '';
            position: absolute;
            left: -2px;
            right: -2px;
            top: 45%;
            height: 2px;
            background: currentColor;
            transform: rotate(-2deg);
            border-radius: 1px;
        }
        .correction {
            display: inline;
            margin-left: 0.2em;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="page-container">
            <div class="page-a margined lines">
                <div class="top-margin"></div>
                <div class="display-flex left-margin-and-content">
                    <div class="left-margin"></div>
                    <div class="paper-content" id="note"></div>
                </div>
                <div class="overlay"></div>
            </div>
        </div>
    </div>

    <script>
        // IIFE to encapsulate all state and prevent global pollution
        (function() {
            'use strict';
            
            // ============================================
            // MODULE STATE (instead of window properties)
            // ============================================
            const state = {
                storedOutputImages: [],
                pdfDataBuffer: [],
                pdfTransferId: null
            };
            
            // ============================================
            // CONFIGURATION & DOM ELEMENTS
            // ============================================
            const pageEl = document.querySelector('.page-a');
            const paperContentEl = document.querySelector('.page-a .paper-content');
            const overlayEl = document.querySelector('.overlay');
            
            // PDF.js worker configuration handled above via Blob URL

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        
        /**
         * Sanitize text to prevent XSS attacks
         */
        function sanitizeText(text) {
            if (typeof text !== 'string') return '';
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        /**
         * Delay helper for async operations
         */
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        /**
         * Generate a misspelled version of a word (returns a NEW string, does not modify input)
         */
        function generateMisspelling(originalWord) {
            // Make a copy to work with
            const word = String(originalWord);
            if (word.length < 3) return word + word[0];
            
            // Pick a random strategy
            const strategy = Math.floor(Math.random() * 4);
            
            switch(strategy) {
                case 0: {
                    // Swap two adjacent letters (not at the very end)
                    const maxPos = Math.max(0, word.length - 2);
                    const i = Math.floor(Math.random() * (maxPos + 1));
                    const chars = word.split('');
                    const temp = chars[i];
                    chars[i] = chars[i + 1];
                    chars[i + 1] = temp;
                    return chars.join('');
                }
                case 1: {
                    // Remove a letter from the middle (not first or last)
                    if (word.length <= 3) return word.slice(0, -1);
                    const i = 1 + Math.floor(Math.random() * (word.length - 2));
                    return word.slice(0, i) + word.slice(i + 1);
                }
                case 2: {
                    // Double a letter
                    const i = Math.floor(Math.random() * word.length);
                    return word.slice(0, i) + word[i] + word[i] + word.slice(i + 1);
                }
                case 3: {
                    // Replace a vowel with nearby vowel
                    const vowelMap = { 'a': 'e', 'e': 'i', 'i': 'o', 'o': 'u', 'u': 'a' };
                    const chars = word.split('');
                    for (let i = 0; i < chars.length; i++) {
                        const lower = chars[i].toLowerCase();
                        if (vowelMap[lower]) {
                            const replacement = vowelMap[lower];
                            chars[i] = chars[i] === chars[i].toUpperCase() ? replacement.toUpperCase() : replacement;
                            return chars.join('');
                        }
                    }
                    // No vowel found, just swap first two letters
                    if (chars.length >= 2) {
                        const temp = chars[0];
                        chars[0] = chars[1];
                        chars[1] = temp;
                    }
                    return chars.join('');
                }
                default:
                    return word;
            }
        }

        /**
         * Apply spelling mistakes to text - shows crossed-out typo followed by correct word
         */
        function applySpellingMistakes(text, mistakeCount) {
            if (!mistakeCount || mistakeCount <= 0) return sanitizeText(text);
            
            // Split into words while preserving whitespace
            const parts = text.split(/(\\s+)/);
            const wordIndices = [];
            
            // Find indices of actual words (not whitespace, min 4 chars for better effect)
            parts.forEach((part, index) => {
                if (part.trim() && part.length >= 4 && /^[a-zA-Z]+$/.test(part)) {
                    wordIndices.push(index);
                }
            });
            
            // Randomly select unique words to make mistakes on
            const mistakeIndices = new Set();
            const actualMistakes = Math.min(mistakeCount, wordIndices.length);
            const shuffled = [...wordIndices].sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < actualMistakes; i++) {
                mistakeIndices.add(shuffled[i]);
            }
            
            // Build the result HTML
            return parts.map((part, index) => {
                if (mistakeIndices.has(index)) {
                    // IMPORTANT: Store the original word FIRST before any processing
                    const originalWord = String(part);
                    const typo = generateMisspelling(originalWord);
                    // Show: crossed-out typo + space + original correct word
                    return '<span class="mistake"><span class="crossed-word">' + sanitizeText(typo) + '</span> ' + sanitizeText(originalWord) + '</span>';
                }
                return sanitizeText(part);
            }).join('');
        }

        /**
         * Apply contrast filter to image data (for scanner effect)
         */
        function contrastImage(imageData, contrast) {
            const data = imageData.data;
            contrast *= 255;
            const factor = (contrast + 255) / (255.01 - contrast);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = factor * (data[i] - 128) + 128;
                data[i + 1] = factor * (data[i + 1] - 128) + 128;
                data[i + 2] = factor * (data[i + 2] - 128) + 128;
            }
            return imageData;
        }

        /**
         * Send message to React Native
         */
        function sendToRN(type, data = {}) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
            }
        }

        /**
         * Send error to React Native
         */
        function sendError(message, code = 'UNKNOWN_ERROR') {
            sendToRN('ERROR', { data: message, code });
        }

        // ============================================
        // PAPER STYLING
        // ============================================
        
        function applyPaperStyles(config, text) {
            try {
                if (config.font) {
                    document.body.style.setProperty('--handwriting-font', config.font);
                }
                
                if (config.inkColor) {
                    document.body.style.setProperty('--ink-color', config.inkColor);
                }

                if (config.fontSize) {
                    pageEl.style.fontSize = config.fontSize + 'pt';
                }

                if (config.letterSpacing !== undefined) {
                    pageEl.style.letterSpacing = config.letterSpacing + 'pt';
                }

                if (config.wordSpacing !== undefined) {
                    pageEl.style.wordSpacing = config.wordSpacing + 'px';
                }

                if (config.topPadding !== undefined) {
                    paperContentEl.style.paddingTop = config.topPadding + 'px';
                }

                if (config.pageSize === 'a4') {
                    pageEl.style.width = '595px';
                    pageEl.style.minHeight = '842px';
                }

                if (config.paperLines === false) {
                    pageEl.classList.remove('lines');
                } else {
                    pageEl.classList.add('lines');
                }
                
                if (config.paperMargin === false) {
                    pageEl.classList.remove('margined');
                } else {
                    pageEl.classList.add('margined');
                }

                // Effects - use deterministic angle based on text for consistent preview
                overlayEl.className = 'overlay';
                if (config.effect === 'scanner' || config.effect === 'shadows') {
                    overlayEl.classList.add('shadows');
                    // Generate consistent angle from text hash (simple hash function)
                    const textHash = (text || '').split('').reduce((acc, char) => {
                        return ((acc << 5) - acc) + char.charCodeAt(0);
                    }, 0);
                    const angle = config.effect === 'scanner' 
                        ? (Math.abs(textHash % 70) + 50)  // 50-120 degrees for scanner
                        : (Math.abs(textHash % 360));     // 0-360 for shadows
                    overlayEl.style.background = 'linear-gradient(' + angle + 'deg, #0008, #0000)';
                }
            } catch (error) {
                sendError('Failed to apply styles: ' + error.message, 'STYLE_ERROR');
            }
        }

        // ============================================
        // PREVIEW UPDATE
        // ============================================
        
        async function updatePreview(text, config) {
            try {
                applyPaperStyles(config, text);
                // Apply spelling mistakes if enabled
                if (config.spellingMistakes && config.spellingMistakes > 0) {
                    paperContentEl.innerHTML = applySpellingMistakes(text || '', config.spellingMistakes);
                } else {
                    // Use textContent for safety (prevents XSS)
                    paperContentEl.textContent = text || '';
                }
                await document.fonts.ready;
            } catch (error) {
                sendError('Preview update failed: ' + error.message, 'PREVIEW_ERROR');
            }
        }

        // ============================================
        // IMAGE GENERATION (Chunked for memory efficiency)
        // ============================================
        
        async function generateImage(text, config) {
            try {
                sendToRN('PROGRESS', { step: 'image', current: 0, total: 1, message: 'Preparing...' });
                await updatePreview(text, config);

                const clientHeight = 842 - 50; // A4 height minus margins
                const scrollHeight = paperContentEl.scrollHeight;
                const totalPages = Math.ceil(scrollHeight / clientHeight);
                const outputImages = [];
                
                if (totalPages > 1) {
                    const words = text.split(/(\s+)/);
                    let wordCount = 0;
                    const mistakesPerPage = config.spellingMistakes || 0;
                    // Fix: Limit should be based on total words + buffer, not constant 1000
                    const MAX_PAGINATION_ITERATIONS = Math.max(50000, words.length * 2);
                    let totalIterations = 0;
                    
                    for (let i = 0; i < totalPages; i++) {
                        sendToRN('PROGRESS', { step: 'image', current: i + 1, total: totalPages, message: 'Generating page ' + (i + 1) + ' of ' + totalPages });
                        paperContentEl.innerHTML = '';
                        const wordArray = [];
                        
                        while (paperContentEl.scrollHeight <= clientHeight && wordCount < words.length) {
                            wordArray.push(words[wordCount]);
                            paperContentEl.textContent = wordArray.join('');
                            wordCount++;
                            totalIterations++; // Track total words processed
                            
                            // Safety: prevent infinite loops (e.g. if a single word is taller than page)
                            if (totalIterations > MAX_PAGINATION_ITERATIONS) {
                                sendError('Pagination failed. A single word might be too long to fit on a page.', 'PAGINATION_OVERFLOW');
                                return;
                            }
                        }
                        
                        if (paperContentEl.scrollHeight > clientHeight) {
                            wordArray.pop();
                            wordCount--;
                        }
                        
                        // Safety: if no words fit on a page, we have a problem (extremely long word)
                        if (wordArray.length === 0 && wordCount < words.length) {
                            // Force add the word anyway to prevent infinite loop
                            wordArray.push(words[wordCount]);
                            paperContentEl.textContent = wordArray.join('');
                            wordCount++;
                        }
                        
                        // Apply spelling mistakes if enabled for final render
                        const pageText = wordArray.join('');
                        if (mistakesPerPage > 0) {
                            paperContentEl.innerHTML = applySpellingMistakes(pageText, mistakesPerPage);
                        } else {
                            paperContentEl.textContent = pageText;
                        }
                        
                        // Chunked: Wait before capture to prevent memory overload
                        await delay(50);
                        await capturePage(outputImages, config);
                    }
                } else {
                    sendToRN('PROGRESS', { step: 'image', current: 1, total: 1, message: 'Generating image...' });
                    await capturePage(outputImages, config);
                }
                
                // Store for PDF generation
                state.storedOutputImages = outputImages;

                sendToRN('PROGRESS', { step: 'image', current: totalPages, total: totalPages, message: 'Complete!' });
                sendToRN('SUCCESS', { images: outputImages });
            } catch (error) {
                sendError('Image generation failed: ' + error.message, 'GENERATION_ERROR');
            }
        }

        async function capturePage(outputImages, config) {
            // Quality settings based on user preference
            const qualitySettings = {
                low: { scale: 1.5, jpegQuality: 0.7 },
                medium: { scale: 2.0, jpegQuality: 0.85 },
                high: { scale: 3.0, jpegQuality: 0.95 },
            };
            
            const quality = config.quality || 'medium';
            const settings = qualitySettings[quality] || qualitySettings.medium;
            
            const options = {
                scrollX: 0,
                scrollY: -window.scrollY,
                scale: settings.scale,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                removeContainer: true,
            };
            
            pageEl.style.border = 'none';
            pageEl.style.overflowY = 'hidden';

            const canvas = await html2canvas(pageEl, options);
            
            if (config.effect === 'scanner') {
                const context = canvas.getContext('2d');
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                contrastImage(imageData, 0.55);
                context.putImageData(imageData, 0, 0);
            }
            
            outputImages.push(canvas.toDataURL('image/jpeg', settings.jpegQuality));
            
            pageEl.style.overflowY = 'auto';
            pageEl.style.border = '1px solid #f3f3f3';
        }

        // ============================================
        // PDF GENERATION
        // ============================================
        
        // Compress image to reduce size (for large PDFs)
        function compressImage(dataUrl, quality) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    // Reduce dimensions for large docs
                    const maxWidth = 1200;
                    const maxHeight = 1700;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = function() {
                    resolve(dataUrl); // Fall back to original
                };
                img.src = dataUrl;
            });
        }
        
        async function generatePDF(images) {
            try {
                const imagesToUse = images || state.storedOutputImages || [];
                if (imagesToUse.length === 0) {
                    sendError('No images available for PDF generation', 'NO_IMAGES');
                    return;
                }
                
                const pageCount = imagesToUse.length;
                const needsCompression = pageCount > 3;
                const compressionQuality = pageCount > 10 ? 0.3 : pageCount > 5 ? 0.4 : 0.5;
                
                sendToRN('PROGRESS', { step: 'pdf', current: 0, total: pageCount + 1, message: needsCompression ? 'Optimizing images...' : 'Creating PDF...' });
                
                // Compress images if needed for large docs
                let processedImages = imagesToUse;
                if (needsCompression) {
                    processedImages = [];
                    for (let i = 0; i < imagesToUse.length; i++) {
                        sendToRN('PROGRESS', { step: 'pdf', current: i, total: pageCount + 1, message: 'Optimizing page ' + (i + 1) + '...' });
                        const compressed = await compressImage(imagesToUse[i], compressionQuality);
                        processedImages.push(compressed);
                        // Free up memory
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'pt', 'a4');
                const width = doc.internal.pageSize.width;
                const height = doc.internal.pageSize.height;
                
                for (let i = 0; i < processedImages.length; i++) {
                    sendToRN('PROGRESS', { step: 'pdf', current: i + 1, total: pageCount + 1, message: 'Adding page ' + (i + 1) + ' of ' + pageCount });
                    if (i > 0) doc.addPage();
                    doc.addImage(
                        processedImages[i],
                        'JPEG',
                        25, 50,
                        width - 50, height - 80,
                        'image-' + i
                    );
                    // Free memory between pages
                    processedImages[i] = null;
                    await new Promise(r => setTimeout(r, 10));
                }
                
                sendToRN('PROGRESS', { step: 'pdf', current: pageCount, total: pageCount + 1, message: 'Finalizing PDF...' });
                
                const blob = doc.output('blob');
                const reader = new FileReader();
                reader.onloadend = function() {
                    sendToRN('PROGRESS', { step: 'pdf', current: pageCount + 1, total: pageCount + 1, message: 'Complete!' });
                    sendToRN('PDF_SUCCESS', { data: reader.result });
                    // Clean up stored images to free memory
                    state.storedOutputImages = [];
                };
                reader.onerror = function() {
                    sendError('Failed to convert PDF blob', 'PDF_BLOB_ERROR');
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                sendError('PDF generation failed: ' + error.message, 'PDF_ERROR');
            }
        }

        // ============================================
        // PDF TEXT EXTRACTION
        // ============================================
        
        async function extractTextFromPDF(base64Data) {
            try {
                if (!base64Data) {
                    sendError('No PDF data provided', 'PDF_NO_DATA');
                    return;
                }

                if (typeof pdfjsLib === 'undefined') {
                    sendError('PDF.js library not loaded. Please check internet connection.', 'PDFJS_NOT_LOADED');
                    return;
                }

                const cleanData = base64Data.replace(/^data:application\\/pdf;base64,/, "");
                const pdfData = atob(cleanData);
                
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const pdf = await loadingTask.promise;
                
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    const items = textContent.items.map(item => ({
                        str: item.str,
                        x: item.transform[4],
                        y: item.transform[5],
                    }));

                    // Sort by position for proper reading order
                    items.sort((a, b) => {
                        if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
                        return a.x - b.x;
                    });

                    let pageText = '';
                    let lastY = -1;
                    
                    for (const item of items) {
                        if (lastY !== -1) {
                            const diff = Math.abs(item.y - lastY);
                            if (diff > 20) pageText += '\\n\\n';
                            else if (diff > 8) pageText += '\\n';
                            else if (pageText.length > 0 && !pageText.endsWith('\\n')) pageText += ' ';
                        }
                        pageText += item.str;
                        lastY = item.y;
                    }
                    
                    fullText += pageText + '\\n\\n';
                }
                
                sendToRN('PDF_TEXT_EXTRACTED', { data: fullText.trim() });
            } catch (error) {
                let errorMessage = 'Failed to extract text from PDF';
                let errorCode = 'PDF_EXTRACT_ERROR';
                
                // Handle specific PDF.js errors
                if (error.name === 'PasswordException') {
                    errorMessage = 'This PDF is password protected. Please use an unprotected PDF.';
                    errorCode = 'PDF_PASSWORD_PROTECTED';
                } else if (error.name === 'InvalidPDFException') {
                    errorMessage = 'This file is not a valid PDF or is corrupted.';
                    errorCode = 'PDF_INVALID';
                } else if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                
                sendError(errorMessage, errorCode);
            }
        }

        // ============================================
        // MESSAGE HANDLER
        // ============================================
        
        function handleMessage(event) {
            try {
                const rawData = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
                const data = JSON.parse(rawData);
                
                switch (data.type) {
                    case 'UPDATE_PREVIEW':
                        updatePreview(data.text, data.config || {});
                        break;
                    case 'GENERATE_IMAGE':
                        generateImage(data.text, data.config || {});
                        break;
                    case 'GENERATE_PDF':
                        generatePDF(data.images);
                        break;
                    case 'EXTRACT_TEXT_FROM_PDF':
                        extractTextFromPDF(data.data);
                        break;
                    case 'PDF_DATA_START':
                        // Start a new transfer - clear any previous buffer
                        state.pdfDataBuffer = [];
                        state.pdfTransferId = data.transferId;
                        break;
                    case 'PDF_DATA_CHUNK':
                        // Validate transfer ID to prevent interleaving
                        if (data.transferId && state.pdfTransferId && data.transferId !== state.pdfTransferId) {
                            // Stale chunk from old transfer, ignore
                            break;
                        }
                        if (!state.pdfDataBuffer) state.pdfDataBuffer = [];
                        state.pdfDataBuffer.push(data.chunk);
                        break;
                    case 'PDF_DATA_END':
                        // Validate transfer ID
                        if (data.transferId && state.pdfTransferId && data.transferId !== state.pdfTransferId) {
                            // Stale end signal from old transfer, ignore
                            break;
                        }
                        if (state.pdfDataBuffer && state.pdfDataBuffer.length > 0) {
                            const fullData = state.pdfDataBuffer.join('');
                            state.pdfDataBuffer = [];
                            state.pdfTransferId = null;
                            extractTextFromPDF(fullData);
                        } else {
                            sendError('No PDF data received', 'PDF_NO_DATA');
                        }
                        break;
                    default:
                        // Ignore unknown message types
                        break;
                }
            } catch (e) {
                // Silently ignore parse errors (could be from other sources)
            }
        }

        // Listen for messages from React Native
        document.addEventListener("message", handleMessage);
        window.addEventListener("message", handleMessage);

        // Signal that WebView is ready
        sendToRN('WEBVIEW_READY');
        
        })(); // End IIFE
    </script>
</body>
</html>
`;
