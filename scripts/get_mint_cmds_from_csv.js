// parses a csv file "input.csv" (can be a symlink) for minting tasks
// expected format: amount, "address"
// if the address field is empty, it's skipped
// outputs a list of commands to be executed in a truffle5 console
// with the token contract initialized at variable lab10
// and with the contract controller unlocked

const fs = require('fs');
const parse = require('csv-parse');
const web3 = require('web3');

// have an upper limit for accepted amounts. Choosen somewhat arbitrarily
const MAX_TOKEN_PER_TASK = 500000;

let goodTasks = [];
let badTasks = [];
let executedTasks = [];

function parseTasks() {
    return new Promise((resolve, reject) => {
        fs.createReadStream('input.csv')
            .pipe(parse({delimiter: ','}))
            .on('data', (row) => {
                const task = {
                    amount: row[0],
                    receiver: row[1]
                };
                
                if((! isNaN(task.amount) && task.amount >= 0 && task.amount <= MAX_TOKEN_PER_TASK)
                    && (web3.utils.isAddress(task.receiver))) {
                    goodTasks.push(task);
                } else {
                    badTasks.push(task);
                }
                    
            })
            .on('end', () => {
                console.log(`${goodTasks.length} goodTasks: ${JSON.stringify(goodTasks, null, 2)}`);
                console.log(`${badTasks.length} badTasks: ${JSON.stringify(badTasks, null, 2)}`);
                resolve();
            });
    });
}

async function printMintCommands(tasks) {
    console.log(`

    ==================
    commands to execute:
    ==================
    `);
    
    console.log('minting:');
    for(const task of tasks) {
        console.log(
`await lab10.mint("${task.receiver}", web3.utils.toWei("${task.amount}"))`
        );
    };
    
    console.log('\nfuel with 1 ATS for tx fees:');
    for(const task of tasks) {
        console.log(
`await web3.eth.sendTransaction( { to: "${task.receiver}", value: web3.utils.toWei("1"), gasPrice: 1000000000 } )`
        );
    };
}

(async () => {
    await parseTasks();
    printMintCommands(goodTasks);
})();
