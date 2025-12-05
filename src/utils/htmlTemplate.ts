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
        
        function applyPaperStyles(config) {
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

                // Effects
                overlayEl.className = 'overlay';
                if (config.effect === 'scanner') {
                    overlayEl.classList.add('shadows');
                    overlayEl.style.background = 'linear-gradient(' + (Math.floor(Math.random() * 70) + 50) + 'deg, #0008, #0000)';
                } else if (config.effect === 'shadows') {
                    overlayEl.classList.add('shadows');
                    overlayEl.style.background = 'linear-gradient(' + (Math.random() * 360) + 'deg, #0008, #0000)';
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
                applyPaperStyles(config);
                // Use textContent for safety (prevents XSS)
                paperContentEl.textContent = text || '';
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
                await updatePreview(text, config);

                const resolution = config.resolution || 2;
                const clientHeight = 842 - 50; // A4 height minus margins
                const scrollHeight = paperContentEl.scrollHeight;
                const totalPages = Math.ceil(scrollHeight / clientHeight);
                const outputImages = [];
                
                if (totalPages > 1) {
                    const words = text.split(/(\\s+)/);
                    let wordCount = 0;
                    
                    for (let i = 0; i < totalPages; i++) {
                        paperContentEl.innerHTML = '';
                        const wordArray = [];
                        
                        while (paperContentEl.scrollHeight <= clientHeight && wordCount < words.length) {
                            wordArray.push(words[wordCount]);
                            paperContentEl.textContent = wordArray.join('');
                            wordCount++;
                        }
                        
                        if (paperContentEl.scrollHeight > clientHeight) {
                            wordArray.pop();
                            wordCount--;
                            paperContentEl.textContent = wordArray.join('');
                        }
                        
                        // Chunked: Wait before capture to prevent memory overload
                        await delay(50);
                        await capturePage(outputImages, config, resolution);
                    }
                } else {
                    await capturePage(outputImages, config, resolution);
                }
                
                // Store for PDF generation
                window.storedOutputImages = outputImages;

                sendToRN('SUCCESS', { images: outputImages });
            } catch (error) {
                sendError('Image generation failed: ' + error.message, 'GENERATION_ERROR');
            }
        }

        async function capturePage(outputImages, config, resolution) {
            const options = {
                scrollX: 0,
                scrollY: -window.scrollY,
                scale: resolution,
                useCORS: true,
                backgroundColor: null,
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
            
            outputImages.push(canvas.toDataURL('image/jpeg', 0.9));
            
            pageEl.style.overflowY = 'auto';
            pageEl.style.border = '1px solid #f3f3f3';
        }

        // ============================================
        // PDF GENERATION
        // ============================================
        
        function generatePDF(images) {
            try {
                const imagesToUse = images || window.storedOutputImages || [];
                if (imagesToUse.length === 0) {
                    sendError('No images available for PDF generation', 'NO_IMAGES');
                    return;
                }
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'pt', 'a4');
                const width = doc.internal.pageSize.width;
                const height = doc.internal.pageSize.height;
                
                for (let i = 0; i < imagesToUse.length; i++) {
                    if (i > 0) doc.addPage();
                    doc.addImage(
                        imagesToUse[i],
                        'JPEG',
                        25, 50,
                        width - 50, height - 80,
                        'image-' + i
                    );
                }
                
                const blob = doc.output('blob');
                const reader = new FileReader();
                reader.onloadend = function() {
                    sendToRN('PDF_SUCCESS', { data: reader.result });
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
                    case 'PDF_DATA_CHUNK':
                        if (!window.pdfDataBuffer) window.pdfDataBuffer = [];
                        window.pdfDataBuffer.push(data.chunk);
                        break;
                    case 'PDF_DATA_END':
                        extractTextFromPDF(null);
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
    </script>
</body>
</html>
`;
