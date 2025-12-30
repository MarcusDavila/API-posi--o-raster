require('dotenv').config({ override: true });
const { getDbClient } = require('./db');
const fs = require('fs');
const util = require('util');


const logFile = fs.createWriteStream(__dirname + '/app.log', { flags: 'a' });
const logStdout = process.stdout;

function getLocalTimestamp() {
    const now = new Date();

    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
}

console.log = function (...args) {
    const msg = util.format(...args);
    logFile.write(getLocalTimestamp() + ' [INFO] ' + msg + '\n');
    logStdout.write(msg + '\n');
};

console.error = function (...args) {
    const msg = util.format(...args);
    logFile.write(getLocalTimestamp() + ' [ERROR] ' + msg + '\n');
    logStdout.write(msg + '\n');
};
const { getOrRefreshToken } = require('./Token');
const { fetchAndStorePositions } = require('./ConsultaPosicoes');
const { executarLimpeza } = require('./Remove_duplicates');

async function main() {
    const client = getDbClient();

    try {
        await client.connect();
        console.log("Conectado ao banco de dados.");


        const accessToken = await getOrRefreshToken(client);


        await fetchAndStorePositions(client, accessToken);


    } catch (error) {
        console.error("Erro no fluxo principal:", error.message);
    } finally {
        await client.end();
        console.log("Conexão fechada.");
    }
}

main();