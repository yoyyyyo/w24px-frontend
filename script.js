const WRAPPER_ADDRESS    = '0x68d38de8dea4c1130b1e883b6ab18bd8585fa23f';
const OPENSEA_STOREFRONT = '0x495f947276749Ce646f68AC8c248420045cb7b5e';

const hide = elem => elem.style.display = 'none';
const show = elem => elem.style.display = 'block';
const $ = (selector, root = document) => root.querySelector(selector);

if (window.ethereum) {
    ethereum.on('accountsChanged', ([account]) => updateAccounts(account));
    ethereum.on('chainChanged', () => window.location.reload());
    ethereum.on('disconnect', () => window.location.reload());
    ethereum.on('connect', async () => {
        const accounts = await ethereum.request({
            method: 'eth_accounts',
            params: []
        });
        if (accounts[0])
            return updateAccounts(accounts[0]);
    });
}

$('.s1 button').onclick = () => {
    if (window.ethereum)
        return window.ethereum.request({ method: 'eth_requestAccounts', params: [] })
        .then(([account]) => updateAccounts(account));
        
    return alert('no window.ethereum detected! please ensure you have a wallet installed')
}

$('.s2 button').onclick = async () => {
    const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
    const contract = new ethers.Contract(OPENSEA_STOREFRONT, [
        'function setApprovalForAll(address to, bool approved) public',
    ], signer);

    const chain = await signer.getChainId();
    if (chain !== 1)
        alert(`Warning! Wrong chain ID: ${chain}.` +
        'If you wish to wrap, please set your chain to Ethereum Mainnet ' +
        'before sending any transactions.');

    await contract.setApprovalForAll(WRAPPER_ADDRESS, true);

    hide($('.s2'));
    show($('.s3'));

    loadCats(await signer.getAddress());
}

let accountSet = null;
const updateAccounts = (account) => {
    if (accountSet !== account && accountSet !== null)
        return window.location.reload();
    else
        accountSet = account;

    if (!account) {
        hide($('.s1 .nok'));
        show($('.s1 .ok'));
        return;
    }

    show($('.s1 .ok'));
    show($('.s2'));

    hide($('.s1'));
    hide($('.s3'));
    hide($('.s4'));

    $('.s1 .indicator').textContent = account;

    (async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const OSSF = new ethers.Contract(OPENSEA_STOREFRONT, [
            'function isApprovedForAll(address owner, address operator) public view returns (bool)'
        ], provider);
    
        const isApproved = await OSSF.isApprovedForAll(await provider.getSigner().getAddress(), WRAPPER_ADDRESS);

        if (isApproved) {
            hide($('.s2'));
            show($('.s3'));
            loadCats(await provider.getSigner().getAddress());
        }

    })();
}

const getCatsOwnedBy = async (address, offset = null, counter = 0) => {
    const url = new URL('https://api.opensea.io/api/v1/assets');
    url.searchParams.set('owner', address);
    url.searchParams.set('order_direction', 'desc');
    url.searchParams.set('limit', 50);
    url.searchParams.set('collection', '24px');

    if (offset)
        url.searchParams.set('offset', offset);
    
    const req = await fetch(url, {
        headers: {
            'X-Api-Key': [...'0a843e8ca02d4a3afc04d21ac33ab498'].reverse().join('')
        }
    });

    if (req.status !== 200)
        return await getCatsOwnedBy(address, offset);
    
    const { assets } = await req.json();
    const results = assets.map(asset => {
        return {
            id: Number(asset.name.split(' ')[1]),
            thumbnail: asset.image_thumbnail_url
        }
    });

    counter += results.length;

    $('.s3 .loading .progress').textContent = `${counter} pixelcats loaded thus far`;

    if (assets.length >= 50) {
        const next = await getCatsOwnedBy(address, (offset || 0) + 50, counter);
        results.push(...next);
    }

    return results;
}

const loadCats = async address => {
    const cats = await getCatsOwnedBy(address);
    const selected = new Set();

    if (cats.length === 0)
        return alert('It doesn\'t seem like you own any PixelCats! ' +
                    'Are you sure you signed in with the right wallet?');

    const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
    const contract = new ethers.Contract(WRAPPER_ADDRESS, [
        'function wrap(uint[] ids) external',
    ], signer);

    const chain = await signer.getChainId();
    if (chain !== 1)
        alert(`Warning! Wrong chain ID: ${chain}.` +
        'If you wish to wrap, please set your chain to Ethereum Mainnet ' +
        'before sending any transactions.');

    hide($('.s3 .loading'));
    show($('.s3 .loaded'));
    $('.wall').onclick = () =>
        contract.wrap(cats.map(({ id }) => id))
        .then(handleFinalization)
        .catch(handleError);

    $('.wsome').onclick = () => {
        if (selected.size === 0)
            return alert('You haven\'t selected any PixelCats to wrap!');

        contract.wrap([...selected])
        .then(handleFinalization)
        .catch(handleError);
    }


    cats.forEach(cat => {
        const div = document.createElement('div');
        div.classList.add('cat');

        const img = document.createElement('img');
        img.src = cat.thumbnail;
        div.appendChild(img);

        const p = document.createElement('p');
        p.textContent = `#${cat.id}`;
        div.appendChild(p);

        div.onclick = () => {
            if (selected.has(cat.id))
                selected.delete(cat.id);
            else
                selected.add(cat.id);
            div.classList.toggle('selected');
            $('.wsome').textContent = `WRAP ${selected.size}`;
        }

        $('.s3 .cats').appendChild(div);
    });
}

const handleFinalization = async (tx) => {
    hide($('.s3'));
    show($('.s4'));
    $('.tx').href = `https://etherscan.io/tx/${tx.hash}`;
}

const handleError = err => alert(err?.data?.message || err?.message || err);
