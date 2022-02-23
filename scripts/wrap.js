const initialize = (type) => {
    if (!CONSTANTS[type]) {
        return window.location = '/';
    }

    const {
        WRAPPER_ADDRESS,
        NAME, SLUG,
        CSS_OVERRIDE
    } = CONSTANTS[type];

    document.querySelectorAll('.name_replacement').forEach(elem => elem.innerText = NAME);
    document.querySelector('h1 a').innerText = `Wrapped ${NAME}`;
    document.title = document.title.replace('24px', NAME);

    if (CSS_OVERRIDE) {
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = CSS_OVERRIDE;
        document.head.appendChild(link);
    }

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
    
        hide('.s2');
        show('.s3');
    
        loadOpenSeaTokens(await signer.getAddress());
    }
    
    let accountSet = null;
    const updateAccounts = (account) => {
        if (accountSet !== account && accountSet !== null)
            return window.location.reload();
        else
            accountSet = account;
    
        if (!account) {
            hide('.s1 .nok');
            show('.s1 .ok');
            return;
        }
    
        show('.s1 .ok');
        show('.s2');
    
        hide('.s1 .nok');
        hide('.s3');
        hide('.s4');
    
        $('.s1 .indicator').textContent = account;
    
        (async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const OSSF = new ethers.Contract(OPENSEA_STOREFRONT, [
                'function isApprovedForAll(address owner, address operator) public view returns (bool)'
            ], provider);
        
            const isApproved = await OSSF.isApprovedForAll(await provider.getSigner().getAddress(), WRAPPER_ADDRESS);
    
            if (isApproved) {
                hide('.s2');
                show('.s3');
                loadOpenSeaTokens(await provider.getSigner().getAddress());
            }
    
        })();
    }
    
    const getTokensOwnedBy = async (address, offset = null, counter = 0) => {
        const url = new URL('https://api.opensea.io/api/v1/assets');
        url.searchParams.set('owner', address);
        url.searchParams.set('order_direction', 'desc');
        url.searchParams.set('limit', 50);
        url.searchParams.set('collection', SLUG);
    
        if (offset)
            url.searchParams.set('offset', offset);
        
        const req = await fetch(url, {
            headers: {
                'X-Api-Key': OPENSEA_API_KEY
            }
        });
    
        if (req.status !== 200)
            return await getTokensOwnedBy(address, offset);
        
        const { assets } = await req.json();
        const results = assets.map(asset => {
            return {
                id: Number(asset.name.split(' ')[1]),
                thumbnail: asset.image_thumbnail_url
            }
        });
    
        counter += results.length;
    
        $('.s3 .loading .progress').textContent = `${counter} ${NAME} loaded thus far`;
    
        if (assets.length >= 50) {
            const next = await getTokensOwnedBy(address, (offset || 0) + 50, counter);
            results.push(...next);
        }
    
        return results;
    }
    
    const loadOpenSeaTokens = async address => {
        const tokens = await getTokensOwnedBy(address);
        const selected = new Set();
    
        if (tokens.length === 0)
            return alert(`It doesn't seem like you own any ${NAME}! ` +
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
    
        hide('.s3 .loading');
        show('.s3 .loaded');
        $('.wall').onclick = () =>
            contract.wrap(tokens.map(({ id }) => id))
            .then(handleFinalization)
            .catch(handleError);
    
        $('.wsome').onclick = () => {
            if (selected.size === 0)
                return alert(`You haven't selected any ${NAME} to wrap!`);
    
            contract.wrap([...selected])
            .then(handleFinalization)
            .catch(handleError);
        }
    
    
        tokens.forEach(token => {
            const div = document.createElement('div');
            div.classList.add('token');
    
            const img = document.createElement('img');
            img.src = token.thumbnail;
            div.appendChild(img);
    
            const p = document.createElement('p');
            p.textContent = `#${token.id}`;
            div.appendChild(p);
    
            div.onclick = () => {
                if (selected.has(token.id))
                    selected.delete(token.id);
                else
                    selected.add(token.id);
                div.classList.toggle('selected');
                $('.wsome').textContent = `WRAP ${selected.size}`;
            }
    
            $('.s3 .tokens').appendChild(div);
        });
    }
    
    const handleFinalization = async (tx) => {
        hide('.s3');
        show('.s4');
        $('.tx').href = `https://etherscan.io/tx/${tx.hash}`;
    }
    
    const handleError = err => alert(err?.data?.message || err?.message || err);
}

initialize(document.location.hash.substring(1));