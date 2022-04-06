const initialize = (type) => {
    if (!CONSTANTS[type]) {
        return window.location = '/';
    }

    const {
        WRAPPER_ADDRESS,
        NAME, CSS_OVERRIDE
    } = CONSTANTS[type];

    document.querySelectorAll('.name_replacement').forEach(elem => elem.innerText = NAME);
    $('h1 a').innerText = `Wrapped ${NAME}`;
    $('.contract_link').href = `https://etherscan.io/address/${WRAPPER_ADDRESS}/#code`;
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
        hide('.s1 .nok');
        show('.s3');

        $('.s1 .indicator').textContent = account;
        loadWrappedTokens(account);
    }

    const getWrappedTokensOwnedBy = async (address, pageKey = null, counter = 0) => {
        const url = new URL(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}/getNFTs`);
        url.searchParams.set('owner', address);
        url.searchParams.set('contractAddresses[]', WRAPPER_ADDRESS);

        if (pageKey)
            url.searchParams.set('pageKey', pageKey);
        
        const req = await fetch(url);

        if (req.status !== 200)
            return await getWrappedTokensOwnedBy(address, pageKey);
        
        const response = await req.json();
        const results = response.ownedNfts.map(asset => {
            return {
                id: parseInt(asset.id.tokenId, 16),
                thumbnail: asset.media?.[0]?.gateway
            }
        });

        counter += results.length;

        $('.s3 .loading .progress').textContent = `${counter} ${NAME} loaded thus far`;
        if (response.continuation) {
            const next = await getWrappedTokensOwnedBy(address, continuation, counter);
            results.push(...next);
        }

        return results;
    }

    const loadWrappedTokens = async (address) => {
        const tokens = await getWrappedTokensOwnedBy(address);
        const selected = new Set();

        if (tokens.length === 0)
            return alert(`It doesn't seem like you own any ${NAME}! ` +
            'Are you sure you signed in with the right wallet?');

            const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
            const contract = new ethers.Contract(WRAPPER_ADDRESS, [
                'function unwrap(uint[] ids) external',
            ], signer);

        const chain = await signer.getChainId();
        if (chain !== 1)
            alert(`Warning! Wrong chain ID: ${chain}.` +
            'If you wish to wrap, please set your chain to Ethereum Mainnet ' +
            'before sending any transactions.');

        hide('.s3 .loading');
        show('.s3 .loaded');
        $('.wall').onclick = () =>
            unwrap(tokens.map(({ id }) => id))
            .then(handleFinalization)
            .catch(handleError);

        $('.wsome').onclick = () => {
            if (selected.size === 0)
                return alert(`You haven't selected any ${NAME} to unwrap!`);

            unwrap([...selected])
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
                $('.wsome').textContent = `UNWRAP ${selected.size}`;
            }

            $('.s3 .tokens').appendChild(div);
        });
    }

    const unwrap = tokenIds => {
        const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
        const contract = new ethers.Contract(WRAPPER_ADDRESS, [
            'function unwrapSingle(uint ids) external',
            'function unwrapMultiple(uint[] ids) external',
        ], signer);

        if (tokenIds.length === 1)
            return contract.unwrapSingle(tokenIds[0]);

        return contract.unwrapMultiple(tokenIds);
    };

    const handleFinalization = async (tx) => {
        hide('.s3');
        show('.s4');
        $('.tx').href = `https://etherscan.io/tx/${tx.hash}`;
    }

    const handleError = err => alert(err?.data?.message || err?.message || err);

}

initialize(document.location.hash.substring(1));
