const OPENSEA_STOREFRONT = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const OPENSEA_API_KEY = [...'0a843e8ca02d4a3afc04d21ac33ab498'].reverse().join('');

const $ = (selector, root = document) => root.querySelector(selector);
const hide = elem => $(elem).style.display = 'none';
const show = elem => $(elem).style.display = 'block';

const CONSTANTS = {
    apes: {
        WRAPPER_ADDRESS: null,
        NAME: 'PixelApes',
        SLUG: 'weape24',
        CSS_OVERRIDE: 'styles/apes.css'
    },
    cats: {
        WRAPPER_ADDRESS: '0x91612c6e205d1597f2fe06e4e2344e0e643d7619',
        NAME: 'PixelCats',
        SLUG: '24px',
    }
};

window.onhashchange = () => window.location.reload();
