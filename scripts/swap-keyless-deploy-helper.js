// inspired by https://github.com/poanetwork/poa-network-consensus-contracts/blob/master/scripts/poa-bytecode.js
// and https://github.com/jbaylina/ERC820/tree/master/js

const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const ethUtils = require('ethereumjs-util');

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

main();

async function main() {
	console.log('compilation...');
	const compiled = solc.compile({
		sources: {
			'': fs.readFileSync('../contracts/Lab10ATSSwap.sol').toString()
		}
	}, 1, function (path) {
		return {contents: fs.readFileSync('../contracts/' + path).toString()}
	});

	const bytecode = compiled.contracts[':Lab10ATSSwap'].bytecode;

    const rawTx = {
        nonce: 0,
        gasPrice: 100 * 1E9,
        gasLimit: 800000,
        value: 0,
        v: 27,
        r: '0x1010101010101010101010101010101010101010101010101010101010101010',
        s: '0x0101010101010101010101010101010101010101010101010101010101010101',
        data: '0x' + bytecode
    };
    const tx = new Tx(rawTx);

    const senderAddr = ethUtils.toChecksumAddress('0x' + tx.getSenderAddress().toString('hex'));

    const txToSend = '0x' + tx.serialize().toString('hex');

    const txCost = web3.utils.fromWei(tx.getUpfrontCost().toString());

    console.log(`
    
===========================
    
# here's the deal:
# sender address: ${senderAddr}
# tx cost: ${txCost} ATS
# fuel sender with:
web3.eth.sendTransaction({to: '${senderAddr}', value: web3.utils.toWei('${txCost}')})

# create with:
web3.eth.sendSignedTransaction('${txToSend}')

# After deploying, you need to invoke init() from the account you want to make owner.
# Hurry up, otherwise somebody else may do so ;-)

# ERC-820 needs to be deployed when calling init().

# Enjoy!
    `)
}
