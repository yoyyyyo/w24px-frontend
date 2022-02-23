const OPENSEA_STOREFRONT = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const OPENSEA_API_KEY = [...'0a843e8ca02d4a3afc04d21ac33ab498'].reverse().join('');

const $ = (selector, root = document) => root.querySelector(selector);
const hide = elem => $(elem).style.display = 'none';
const show = elem => $(elem).style.display = 'block';

const CONSTANTS = {
    apes: {
        WRAPPER_ADDRESS: '0xff26ef6ac14dfc92b59eeb39ad085353049918f0',
        NAME: 'PixelApes',
        SLUG: 'weape24',
        CSS_OVERRIDE: '/styles/apes.css'
    },
    cats: {
        WRAPPER_ADDRESS: '0x68d38de8dea4c1130b1e883b6ab18bd8585fa23f',
        NAME: 'PixelCats',
        SLUG: '24px',
    }
};

window.onhashchange = () => window.location.reload();
