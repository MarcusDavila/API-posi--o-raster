require('dotenv').config({ override: true });
const { getDbClient } = require('./db');
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

