module.exports = {
    content: ['./*.html', './js/script.js'],
    safelist: ['text-color-ink', 'text-color-sand', 'text-color-ink/80', 'text-color-sand/80',
               'opacity-0', 'opacity-100', 'pointer-events-none', 'hidden', 'flex'],
    theme: { extend: {
        colors: {
            'color-sand': '#FDFCF8', 'color-ink': '#264653', 'color-sea': '#2A9D8F',
            'color-spirit': '#9B5DE5', 'color-night': '#2E294E', 'color-earth': '#CCAEA3',
            'color-adobe': '#CCAEA3', 'color-adobe-light': '#E6D5CC', 'color-sunset': '#D38E6E'
        },
        fontFamily: { serif: ['Cormorant Garamond', 'serif'], sans: ['Mulish', 'sans-serif'] }
    } },
    plugins: []
};
