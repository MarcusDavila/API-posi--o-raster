require('dotenv').config({ override: true });
const { getDbClient } = require('./db');
const { getOrRefreshToken } = require('./Token');

async function fetchAndStorePositions(client, accessToken) {
    console.log("Consultando API Raster para posições...");

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${accessToken}`);

    const raw = JSON.stringify({
        "Ambiente": "Producao",
        "TipoRetorno": "JSON",
        "TipoConsulta": "Ultimas",
        "CodUltPosicao": 0
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    const response = await fetch("http://integra.rastergr.com.br:8888/datasnap/rest/TWebService/\"getPosicoes\"", requestOptions);

    if (!response.ok) {
        throw new Error(`Erro na API de Posições: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.result || !result.result[0] || !result.result[0].Posicoes) {
        console.log("Nenhuma posição retornada ou formato inesperado.");
        return;
    }

    const posicoes = result.result[0].Posicoes;
    console.log(`${posicoes.length} posições recebidas. Iniciando processamento...`);

    let processedCount = 0;

    for (const pos of posicoes) {
        if (!pos.DataHoraPos) {
            console.log(`Pula placa ${pos.Placa} por falta de data de posição.`);
            continue;
        }

        // Remove hífen da placa e verifica se existe na tabela de veículos
        const placaNormalizada = pos.Placa ? pos.Placa.replace('-', '') : '';
        
        const veiculoCheck = await client.query('SELECT 1 FROM veiculo WHERE placa = $1', [placaNormalizada]);
        if (veiculoCheck.rowCount === 0) {
            console.log(`Placa ${pos.Placa} (Normalizada: ${placaNormalizada}) não encontrada na tabela 'veiculo'. Ignorando.`);
            continue;
        }

        const checkQuery = `SELECT id, latitude, longitude, ignicao FROM public.public_veiculo_posicao_raster WHERE placa = $1 AND dt_posicao = $2 LIMIT 1;`;
        const checkRes = await client.query(checkQuery, [placaNormalizada, pos.DataHoraPos]);

        if (checkRes.rowCount > 0) {
        const existing = checkRes.rows[0];

            if (existing.latitude != pos.Latitude || existing.longitude != pos.Longitude || existing.ignicao != pos.Ignicao) {
                const updateQuery = `
                    UPDATE public.public_veiculo_posicao_raster SET
                        cod_posicao = $1, cod_terminal = $2, tipo_rastreador = $3, 
                        dist_ult_posicao = $4, ignicao = $5, latitude = $6, 
                        longitude = $7, ponto_referencia = $8, cidade = $9, 
                        uf = $10, pais = $11, motorista = $12
                    WHERE id = $13;
                `;
                await client.query(updateQuery, [
                    pos.CodPosicao, pos.CodTerminal, pos.TipoRastreador, pos.DistUltPosicao,
                    pos.Ignicao, pos.Latitude, pos.Longitude, pos.PosReferencia,
                    pos.Cidade, pos.UF, pos.Pais, pos.Motorista, existing.id
                ]);
            }
        } else {
            const insertQuery = `
                INSERT INTO public.public_veiculo_posicao_raster (
                    cod_posicao, placa, cod_terminal, tipo_rastreador, dt_posicao, 
                    dist_ult_posicao, ignicao, latitude, longitude, ponto_referencia, 
                    cidade, uf, pais, motorista
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
            `;
            await client.query(insertQuery, [
                pos.CodPosicao, placaNormalizada, pos.CodTerminal, pos.TipoRastreador, pos.DataHoraPos,
                pos.DistUltPosicao, pos.Ignicao, pos.Latitude, pos.Longitude, pos.PosReferencia,
                pos.Cidade, pos.UF, pos.Pais, pos.Motorista
            ]);
        }
        processedCount++;
    }

    console.log(`Processo finalizado. ${processedCount} registros processados.`);
}


if (require.main === module) {
    const client = getDbClient();
    (async () => {
        try {
            await client.connect();
            const accessToken = await getOrRefreshToken(client);
            await fetchAndStorePositions(client, accessToken);
        } catch (err) {
            console.error(err);
        } finally {
            await client.end();
        }
    })();
}

module.exports = { fetchAndStorePositions };