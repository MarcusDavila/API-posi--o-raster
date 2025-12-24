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

        // Step 1: Garantir Token Válido
        const accessToken = await getOrRefreshToken(client);

        // Step 2: Buscar e Gravar Posições
        await fetchAndStorePositions(client, accessToken);

        // Step 3: Limpeza de duplicatas (opcional, mas bom manter o banco limpo)
       // await executarLimpeza(client);

    } catch (error) {
        console.error("Erro no fluxo principal:", error.message);
    } finally {
        await client.end();
        console.log("Conexão fechada.");
    }
}

main();

