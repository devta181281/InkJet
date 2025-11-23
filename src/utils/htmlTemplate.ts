
export const getHtmlTemplate = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handwriting Generator</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js"></script>
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
            pageEl.style.border = 'none';
            pageEl.style.overflowY = 'hidden';
            
            // Font
            if (config.font) {
                document.body.style.setProperty('--handwriting-font', config.font);
            }
            
            // Ink Color
            if (config.inkColor) {
                document.body.style.setProperty('--ink-color', config.inkColor);
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

        function removePaperStyles() {
            pageEl.style.overflowY = 'auto';
            pageEl.style.border = '1px solid var(--elevation-background)';
            overlayEl.className = 'overlay';
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

        async function generateImages(text, config) {
            applyPaperStyles(config);
            paperContentEl.textContent = text;
            
            // Wait for fonts to load?
            await document.fonts.ready;

            // Pagination logic could go here, but for now let's do single page or simple scroll
            // The reference logic handles pagination by splitting words. 
            // For simplicity in this first pass, we'll just capture the whole thing or one page.
            // But user wanted "exact functionality".
            
            const clientHeight = 842 - 50; // Approx A4 height minus margins
            const scrollHeight = paperContentEl.scrollHeight;
            
            // If text is too long, we might need to split. 
            // For now, let's just resize the page to fit content if it's a single image, 
            // or implement the split logic.
            // Implementing split logic in a single WebView pass is complex because we need to generate multiple images.
            
            // Let's implement the split logic from reference.
            const totalPages = Math.ceil(scrollHeight / clientHeight);
            const outputImages = [];
            
            if (totalPages > 1) {
                const words = text.split(/(\\s+)/);
                let wordCount = 0;
                
                for (let i = 0; i < totalPages; i++) {
                    paperContentEl.innerHTML = '';
                    const wordArray = [];
                    let wordString = '';
                    
                    while (paperContentEl.scrollHeight <= clientHeight && wordCount < words.length) {
                        wordArray.push(words[wordCount]);
                        paperContentEl.textContent = wordArray.join('');
                        wordCount++;
                    }
                    
                    // Backtrack one word if we overflowed
                    if (paperContentEl.scrollHeight > clientHeight) {
                        wordArray.pop();
                        wordCount--;
                        paperContentEl.textContent = wordArray.join('');
                    }
                    
                    await capturePage(outputImages, config);
                }
            } else {
                await capturePage(outputImages, config);
            }

            removePaperStyles();
            
            // Send back results
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SUCCESS',
                images: outputImages
            }));
        }

        async function capturePage(outputImages, config) {
            const options = {
                scrollX: 0,
                scrollY: -window.scrollY,
                scale: 2, // Normal resolution
                useCORS: true
            };
            
            const canvas = await html2canvas(pageEl, options);
            
            if (config.effect === 'scanner') {
                const context = canvas.getContext('2d');
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                contrastImage(imageData, 0.55);
                context.putImageData(imageData, 0, 0);
            }
            
            outputImages.push(canvas.toDataURL('image/jpeg'));
        }

        // Message Listener
        document.addEventListener("message", handleMessage);
        window.addEventListener("message", handleMessage);

        function handleMessage(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'GENERATE') {
                    generateImages(data.text, data.config);
                }
            } catch (e) {
                // ignore
            }
        }
    </script>
</body>
</html>
`;
