require('dotenv').config({ override: true });
const { getDbClient } = require('./db');

async function getOrRefreshToken(client) {
    console.log("Verificando validade do token...");

    // 1 Verificar se token atual é válido
    const existingTokenRes = await client.query('SELECT * FROM public.pub_token_raster LIMIT 1');
    if (existingTokenRes.rowCount > 0) {
        const row = existingTokenRes.rows[0];
        const updatedAt = new Date(row.updated_at).getTime();
        const expiresInMs = row.expires_in * 1000;
        const expiresAt = updatedAt + expiresInMs;
        // Buffer de 60 segundos
        if (Date.now() < expiresAt - 60000) {
            console.log("Token existente ainda é válido. Reutilizando.");
            return row.access_token;
        } else {
            console.log("Token existente expirado ou próximo de expirar. Buscando novo...");
        }
    } else {
        console.log("Nenhum token encontrado no banco. Buscando novo...");
    }

    // 2. Solicitar Token
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("client_id", process.env.client_id ? process.env.client_id.trim() : "");
    urlencoded.append("grant_type", process.env.grant_type ? process.env.grant_type.trim() : "");
    urlencoded.append("username", process.env.username ? process.env.username.trim() : "");
    urlencoded.append("password", process.env.password ? process.env.password.trim() : "");
    urlencoded.append("client_secret", process.env.client_secret ? process.env.client_secret.trim() : "");

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };

    console.log("Solicitando token para API...");
    const response = await fetch(process.env.URL_Token, requestOptions);

    if (!response.ok) {
        const errText = await response.text();
        console.error("Error details:", errText);
        throw new Error(`Erro na solicitação do token: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Token recebido com sucesso.");

    // 3. Salvar no Banco 
    const checkRes = await client.query('SELECT id FROM public.pub_token_raster LIMIT 1');

    if (checkRes.rowCount > 0) {
        const idToUpdate = checkRes.rows[0].id;
        const updateQuery = `
            UPDATE public.pub_token_raster
            SET access_token = $1, 
                refresh_token = $2, 
                expires_in = $3, 
                token_type = $4, 
                scope = $5, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;
        await client.query(updateQuery, [
            result.access_token,
            result.refresh_token,
            result.expires_in,
            result.token_type,
            result.scope,
            idToUpdate
        ]);
        console.log(`Token atualizado no ID ${idToUpdate}.`);
    } else {
        const insertQuery = `
            INSERT INTO public.pub_token_raster (access_token, refresh_token, expires_in, token_type, scope)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(insertQuery, [
            result.access_token,
            result.refresh_token,
            result.expires_in,
            result.token_type,
            result.scope
        ]);
        console.log("Novo token inserido no banco.");
    }

    return result.access_token;
}

// Se rodar diretamente: node Token.js
if (require.main === module) {
    const client = getDbClient();
    (async () => {
        try {
            await client.connect();
            await getOrRefreshToken(client);
        } catch (err) {
            console.error(err);
        } finally {
            await client.end();
        }
    })();
}

module.exports = { getOrRefreshToken };

