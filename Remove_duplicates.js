require('dotenv').config({ override: true });
const { getDbClient } = require('./db');

async function executarLimpeza(client) {
    console.log("Removendo duplicatas de (placa, dt_posicao)...");
    const cleanupQuery = `
        DELETE FROM public.public_veiculo_posicao_raster a USING (
            SELECT max(id) as id, placa, dt_posicao
            FROM public.public_veiculo_posicao_raster 
            GROUP BY placa, dt_posicao HAVING COUNT(*) > 1
        ) b
        WHERE a.placa = b.placa 
        AND a.dt_posicao = b.dt_posicao
        AND a.id <> b.id;
    `;

    const res = await client.query(cleanupQuery);
    console.log(`Limpeza concluída. Linhas removidas: ${res.rowCount}`);
}


if (require.main === module) {
    const client = getDbClient();
    (async () => {
        try {
            await client.connect();
            await executarLimpeza(client);
        } catch (err) {
            console.error(err);
        } finally {
            await client.end();
        }
    })();
}

module.exports = { executarLimpeza };
