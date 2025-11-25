
import { pdfJsLib, pdfJsWorker } from './pdfJsAssets';

export const getHtmlTemplate = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handwriting Generator</title>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js"></script>
    <script>
        ${pdfJsLib}
    </script>
    <script id="pdf-worker" type="javascript/worker">
        ${pdfJsWorker}
    </script>
    <script>
        var workerContent = document.getElementById('pdf-worker').textContent;
        var blob = new Blob([workerContent], { type: 'text/javascript' });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    </script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Homemade+Apple|Roboto|Caveat|Liu+Jian+Mao+Cao&display=swap">
    <style>
        /* CSS Variables */
        :root {
            --background-primary: #fff;
            --font-color-primary: #333;
            --elevation-background: #f3f3f3;
            --link-color: #006eb8;
            --font-family-primary: 'Roboto', Arial;
            --handwriting-font: 'Homemade Apple', cursive;
            --primary-color: #1a73e8;
            --ink-color: #000f55;
            --label-color: #333;
            --field-borders: #e0e0e0;
            --primary-button-bg: #1d1d1d;
            --primary-button-color: #eee;
            --font-color-delete: #dc3545;
            --delete-button-borders: #dc3545;
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
            width: 595px; /* A4 width in pixels at 72dpi is approx 595 */
            min-height: 842px;
            background: #fff;
            border: 1px solid var(--elevation-background);
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
        // Utils
        const pageEl = document.querySelector('.page-a');
        const paperContentEl = document.querySelector('.page-a .paper-content');
        const overlayEl = document.querySelector('.overlay');

        function applyPaperStyles(config) {
            // Font
            if (config.font) {
                document.body.style.setProperty('--handwriting-font', config.font);
            }
            
            // Ink Color
            if (config.inkColor) {
                document.body.style.setProperty('--ink-color', config.inkColor);
            }

            // Font Size
            if (config.fontSize) {
                pageEl.style.fontSize = \`\${config.fontSize}pt\`;
            }

            // Letter Spacing
            if (config.letterSpacing !== undefined) {
                pageEl.style.letterSpacing = \`\${config.letterSpacing}pt\`;
            }

            // Word Spacing
            if (config.wordSpacing !== undefined) {
                pageEl.style.wordSpacing = \`\${config.wordSpacing}px\`;
            }

            // Vertical Position (Top Padding)
            if (config.topPadding !== undefined) {
                paperContentEl.style.paddingTop = \`\${config.topPadding}px\`;
            }

            // Page Size
            if (config.pageSize === 'a4') {
                pageEl.style.width = '595px';
                pageEl.style.minHeight = '842px';
            }

            // Paper Lines
            if (config.paperLines === false) {
                pageEl.classList.remove('lines');
            } else {
                pageEl.classList.add('lines');
            }
            
            // Paper Margin
            if (config.paperMargin === false) {
                pageEl.classList.remove('margined');
            } else {
                pageEl.classList.add('margined');
            }

            // Effects
            overlayEl.className = 'overlay'; // reset
            if (config.effect === 'scanner') {
                overlayEl.classList.add('shadows');
                overlayEl.style.background = \`linear-gradient(\${Math.floor(Math.random() * (120 - 50 + 1)) + 50}deg, #0008, #0000)\`;
            } else if (config.effect === 'shadows') {
                overlayEl.classList.add('shadows');
                overlayEl.style.background = \`linear-gradient(\${Math.random() * 360}deg, #0008, #0000)\`;
            }
        }
        
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

        async function updatePreview(text, config) {
            applyPaperStyles(config);
            paperContentEl.textContent = text;
            await document.fonts.ready;
        }

        async function generateImage(text, config) {
            await updatePreview(text, config);

            // Use configured resolution or default to 2 (Normal)
            const resolution = config.resolution || 2;
            
            const clientHeight = 842 - 50; // Approx A4 height minus margins
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
                    
                    await capturePage(outputImages, config, resolution);
                }
            } else {
                await capturePage(outputImages, config, resolution);
            }
            
            // Store globally for PDF generation
            window.storedOutputImages = outputImages;

            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SUCCESS',
                images: outputImages
            }));
        }

        async function capturePage(outputImages, config, resolution) {
            const options = {
                scrollX: 0,
                scrollY: -window.scrollY,
                scale: resolution,
                useCORS: true,
                backgroundColor: null, // Make background transparent
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
            
            outputImages.push(canvas.toDataURL('image/jpeg'));
            
            pageEl.style.overflowY = 'auto';
            pageEl.style.border = '1px solid var(--elevation-background)';
        }


        function generatePDF(images) {
            if (!images || images.length === 0) return;
            
            try {
                const doc = new jsPDF('p', 'pt', 'a4');
                const width = doc.internal.pageSize.width;
                const height = doc.internal.pageSize.height;
                
                for (let i = 0; i < images.length; i++) {
                    doc.text(10, 20, '');
                    doc.addImage(
                        images[i],
                        'JPEG',
                        25,
                        50,
                        width - 50,
                        height - 80,
                        'image-' + i
                    );
                    if (i !== images.length - 1) {
                        doc.addPage();
                    }
                }
                
                const blob = doc.output('blob');
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = function() {
                    const base64data = reader.result;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'PDF_SUCCESS',
                        data: base64data
                    }));
                };
                reader.onerror = function() {
                     window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'ERROR',
                        data: 'Failed to convert PDF blob to base64'
                    }));
                };

            } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ERROR',
                    data: 'PDF Generation failed: ' + error.message
                }));
                
            }
        }

        async function extractTextFromPDF(base64Data) {
            try {

                
                if (typeof pdfjsLib === 'undefined') {
                    throw new Error('pdfjsLib is not defined. Script might not have loaded.');
                }

                const cleanData = base64Data.replace(/^data:application\\/pdf;base64,/, "");

                
                const pdfData = atob(cleanData);

                
                const loadingTask = pdfjsLib.getDocument({data: pdfData});
                const pdf = await loadingTask.promise;

                
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {

                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    const items = textContent.items.map(item => ({
                        str: item.str,
                        x: item.transform[4],
                        y: item.transform[5],
                        height: item.height || 0
                    }));

                    items.sort((a, b) => {
                        if (Math.abs(a.y - b.y) > 5) {
                            return b.y - a.y; 
                        }
                        return a.x - b.x;
                    });

                    let pageText = '';
                    let lastY = -1;
                    
                    for (let j = 0; j < items.length; j++) {
                        const item = items[j];
                        if (lastY !== -1) {
                            const diff = Math.abs(item.y - lastY);
                            if (diff > 20) {
                                pageText += '\\n\\n';
                            } else if (diff > 8) {
                                pageText += '\\n';
                            } else if (pageText.length > 0 && !pageText.endsWith('\\n')) {
                                pageText += ' ';
                            }
                        } else {
                             // First item
                        }
                        pageText += item.str;
                        lastY = item.y;
                    }
                    
                    fullText += pageText + '\\n\\n';
                }
                


                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PDF_TEXT_EXTRACTED',
                    data: fullText
                }));
                
            } catch (error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ERROR',
                    data: 'Failed to extract text from PDF: ' + error.message
                }));
            }
        }

        // Message Listener
        document.addEventListener("message", handleMessage);
        window.addEventListener("message", handleMessage);

        function handleMessage(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'UPDATE_PREVIEW') {
                    updatePreview(data.text, data.config);
                } else if (data.type === 'GENERATE_IMAGE') {
                    generateImage(data.text, data.config);
                } else if (data.type === 'GENERATE_PDF') {
                    generatePDF(data.images || window.storedOutputImages || []);
                } else if (data.type === 'EXTRACT_TEXT_FROM_PDF') {
                    extractTextFromPDF(data.data);
                }
            } catch (e) {
                // ignore
            }
        }
    </script>
</body>
</html>
`;
