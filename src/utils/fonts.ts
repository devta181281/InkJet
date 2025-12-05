/**
 * Font configuration for the WebView
 * Uses Google Fonts CSS API for reliable font loading
 */

export const getFontFaceCss = () => `
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Homemade+Apple&family=Indie+Flower&family=Kalam:wght@400;700&family=Liu+Jian+Mao+Cao&family=Patrick+Hand&family=Shadows+Into+Light&display=swap');

    /* Fallback @font-face declarations */
    @font-face {
        font-family: 'Homemade Apple';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/homemadeapple/v22/Qw3EZQFXECDrI2q789EKQZJob0x6XHgOiI8t.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Caveat';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9eIupYz0.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Liu Jian Mao Cao';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/liujianmaocao/v20/845DNN84HJrccNonurqXILGpvCOoferVKGWsUo8.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Indie Flower';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/indieflower/v21/m8JVjfNVeKWVnh3QMuKkFcZVaUuH.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Dancing Script';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTeB9ptDqpw.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Shadows Into Light';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/shadowsintolight/v19/UqyNK9UOIntux_czAvDQx_ZcHqZXBNQzdcD5.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Patrick Hand';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/patrickhand/v23/LDI1apSQOAYtSuYWp8ZhfYe8UcLLubg.woff2) format('woff2');
    }
    @font-face {
        font-family: 'Kalam';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/kalam/v16/YA9dr0Wd4kDdMtD6GgLO.woff2) format('woff2');
    }
`;
