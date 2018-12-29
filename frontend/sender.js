// expects web3 already imported

// TODO: add token metadata, current sender balance (update with every block)

let web3;

let tokenAbi;
let tokenContract;
let tokenAddress;
let tokenSymbol = ' - ';

// ERC820 registry - same abi and address on any chain
const ERC820_ABI = [{"constant":false,"inputs":[{"name":"_addr","type":"address"},{"name":"_interfaceHash","type":"bytes32"},{"name":"_implementer","type":"address"}],"name":"setInterfaceImplementer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_addr","type":"address"},{"name":"_interfaceHash","type":"bytes32"}],"name":"getInterfaceImplementer","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_addr","type":"address"},{"name":"_newManager","type":"address"}],"name":"setManager","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_addr","type":"address"}],"name":"getManager","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}];
const ERC820_ADDR = '0x820b586C8C28125366C998641B09DCbE7d4cBF06';
let erc820Contract;

let txSender;

let viewUpdateTimer = null;

let BN;

const GAS_PRICE = 1000000000; // 1G for ARTIS networks
const CHAIN_ID = 246785; // tau1
const EXPLORER_TX_BASE = 'http://blockscout.tau1.artis.network/tx';

async function init() {
    console.log('init');

    web3 = new Web3(Web3.givenProvider);
    BN = web3.utils.BN;

    // make sure we got a valid contract address via URL
    try {
        const maybeAddr = window.location.hash.substr(1);
        if (! web3.utils.isAddress(maybeAddr)) {
            throw 'not an address'; // TODO: is there a more elegant way for this?
        }
        tokenAddress = maybeAddr;
    } catch(e) {
        alert('A valid contract address needs to be provided via URL. Example: .../subscribe.html#0x5F058596eE426B54008da1Dc7c61AeA3FF64a716');
        document.getElementById('loading-status-span').innerHTML = 'failed :-(';
    }

    // check if we are running in a web3 capable environment
    if(web3.currentProvider === null) {
        //alert('This application requires a web3 capable browser environment. Recommended: Metamask.');
        //document.getElementById('loading-status-span').innerHTML = 'failed :-(';
        document.getElementById('loading-div').hidden = true;
        document.getElementById('fallback-div').hidden = false;
        await fallbackInit();
    } else {
        // check network_id
        const networkId = await web3.eth.net.getId();
        if (networkId !== CHAIN_ID) {
            alert('Not on ARTIS tau1. TODO: link to instructions for connecting to tau1');
            document.getElementById('loading-status-span').innerHTML = 'failed :-(';
        }

        try {
            // TODO: this may fail in non-Metamask environments
            web3.currentProvider.enable();

            // TODO: what's the recommended way to determine the sender account?
            txSender = (await web3.eth.getAccounts())[0];

            erc820Contract = new web3.eth.Contract(ERC820_ABI, ERC820_ADDR, {gasPrice: GAS_PRICE, from: txSender});

            // get ABI of the contract
            tokenAbi = await (await fetch('./ERC777Token_abi.json', {cache: "no-cache"})).json();
            tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress, {gasPrice: GAS_PRICE, from: txSender});

            await initToken();

            await updateView(null, await web3.eth.getBlock('latest'));
            web3.eth.subscribe('newBlockHeaders', updateView);

            document.getElementById('loading-div').hidden = true;
            document.getElementById('send-btn').onclick = onSendClicked;
        } catch (e) {
            alert(`Something went wrong initializing and reading the contract.\nMake sure the address you provided points to an ERC777 token contract!\nError: ${e}`)
            document.getElementById('loading-div').hidden = true;
            document.getElementById('send-div').hidden = true;
            document.getElementById('incompatible-div').hidden = false;
        }
    }
}

function initToken() {
    // doing stuff async in order to accelerate UI init
    return new Promise((resolve, reject) => {
        document.getElementById('addr-span').innerHTML = tokenAddress;
        tokenContract.methods.name().call().then(name => document.getElementById('name-span').innerHTML = name);
        tokenContract.methods.symbol().call().then(ret => {
            tokenSymbol = ret;
            document.getElementById('symbol-span').innerHTML = tokenSymbol;
        });
        tokenContract.methods.totalSupply().call().then(
            supply => document.getElementById('supply-span').innerHTML = web3.utils.fromWei(supply));

        // check in ERC-820 registry if contract was registered as ERC-777
        erc820Contract.methods.getInterfaceImplementer(
            tokenAddress, web3.utils.keccak256('ERC777Token')).call()
            .then(implementerAddr => {
                if(implementerAddr !== tokenAddress) {;
                    const err = `Supposed token address ${tokenAddress} looks ERC20 compliant, but is not registered as ERC777Token in ERC820 registry`;
                    reject(err);
                } else {
                    tokenContract.methods.granularity().call()
                        .then(granularity => document.getElementById('granularity-span').innerHTML = granularity);
                    resolve();
                }
            })
            .catch(e => reject('querying ERC820 registry failed'));

        /* dangerous. may not scale well for busy token contracts
        // get (approximate) contract age
        const logs = await web3.eth.getPastLogs({address: tokenAddress, fromBlock: '0'});
        const firstSeenInBlock = Math.min(...logs.map(l => l.blockNumber));

        const block = await web3.eth.getBlock(firstSeenInBlock);

        document.getElementById('age-span').innerHTML = firstSeenInBlock;
        */

        document.getElementById('sender-address-span').innerHTML = txSender;
    });
}

async function updateView(blockErr, blockData) {
    if (blockErr) {
        console.error(`blockError: ${blockErr}`);
        return;
    }

    const senderBalWei = await tokenContract.methods.balanceOf(txSender).call();
    document.getElementById('sender-balance-span').innerHTML = `${web3.utils.fromWei(senderBalWei)} ${tokenSymbol}`;

    document.getElementById('blocknr-span').innerHTML = blockData.number;
}


// transfers funds to the given receiver.
// expects input to already be validated.
// @param amountStr denominated in the token (not in 1e-18th of the token)
async function sendFunds(receiverAddr, amountStr) {
    // TODO: first check if sender has enough funds, receiver can receive tokens.
    // Because: otherwise we'll get unspecific, not-very-helpful error messages

    const senderBalWei = await tokenContract.methods.balanceOf(txSender).call();
    console.log(`senderBalWei: ${senderBalWei}`);

    if (new BN(senderBalWei).lt(new BN(web3.utils.toWei(amountStr)))) {
        const senderBal = web3.utils.fromWei(senderBalWei);
        alert(`sender balance (${senderBal}) smaller than the given amount`);
        return null;
    }

    const gasEstimate = await tokenContract.methods.send(receiverAddr, web3.utils.toWei(amountStr), '0x00').estimateGas();
    console.log(`gas estimate: ${gasEstimate}`);

    const receipt = await tokenContract.methods.send(receiverAddr, web3.utils.toWei(amountStr), '0x00')
        .send({ gas: Math.floor(gasEstimate * 1.1) });

    return receipt;
}

async function onSendClicked() {
    const receiverVal = document.getElementById('receiver').value;
    if(! web3.utils.isAddress(receiverVal)) {
        alert(`not a valid ARTIS/Ethereum address: ${receiverVal}`);
        return;
    }

    const amountVal = document.getElementById('amount').value;
    const amountBN = new BN(amountVal);
    // TODO: this works (doing numberic checks on number strings) in JS, but is a bit fishy. Check hot to do properly
    if(isNaN(amountVal) || amountVal <= 0 || amountVal > 1000000000) {
        alert(`not a valid (positive) number (max. 1000000000): ${amountVal}`);
        return;
    }

    document.getElementById('waiting-div').hidden = false;
    let waitingSeconds = 0;
    const waitingTimer = setInterval(() => {
        waitingSeconds += 1;
        document.getElementById('tx-timer-span').innerHTML = waitingSeconds;
    }, 1000);

    try {
        const receipt = await sendFunds(receiverVal, amountVal);
        if (receipt) {
            const txHash = receipt.transactionHash;
            document.getElementById('explorer-link').href = `${EXPLORER_TX_BASE}/${txHash}`;
            document.getElementById('sent-div').hidden = false;
        }
    } catch (e) {
        console.error(`an error occured: ${e}`);
        alert(`an error occured:\n${e}`);
    }

    clearInterval(waitingTimer);
    document.getElementById('waiting-div').hidden = true;
}

window.addEventListener('load', init);
