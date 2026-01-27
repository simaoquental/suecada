import { db } from './db.js';

export async function obterOuCriarUtilizador(nome) {
    try {
        const [rows] = await db.query('SELECT id FROM users WHERE nome = ?', [nome]);
        if (rows.length > 0) return rows[0].id;
        
        const [result] = await db.query('INSERT INTO users (nome, vitorias, jogos_jogados) VALUES (?, 0, 0)', [nome]);
        return result.insertId;
    } catch (error) {
        console.error("Erro em obterOuCriarUtilizador:", error);
        return null;
    }
}


export async function registarInicioJogo(jogadores) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [gameResult] = await connection.query(
            "INSERT INTO games (estado, criado_em) VALUES ('em_curso', NOW())"
        );
        const gameId = gameResult.insertId;

        for (const p of jogadores) {

            const [user] = await connection.query("SELECT id FROM users WHERE nome = ?", [p.nome]);
            
            let userId = null;
            if (user.length > 0) {
                userId = user[0].id;
            } else {
                userId = await obterOuCriarUtilizador(p.nome);
            }

            await connection.query(
                "INSERT INTO game_players (game_id, user_id, posicao) VALUES (?, ?, ?)",
                [gameId, userId, p.posicao]
            );
        }

        await connection.commit();
        console.log(`Jogo ${gameId} iniciado e jogadores registados.`);
        return gameId;
    } catch (error) {
        await connection.rollback();
        console.error("Erro ao registar início do jogo:", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function finalizarJogoSQL(gameId) {
    try {
        await db.query(
            "UPDATE games SET estado = 'em_curso', terminado_em = NOW() WHERE id = ?",
            [gameId]
        );
        console.log(`Jogo ${gameId} marcado como terminado.`);
    } catch (error) {
        console.error("Erro ao finalizarJogoSQL:", error);
    }
}


export async function gravarResultadosPartida(resultados) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const res of resultados) {
            await connection.query(
                `UPDATE users 
                 SET jogos_jogados = jogos_jogados + 1, 
                     vitorias = vitorias + ? 
                 WHERE nome = ?`,
                [res.pontosGanhos, res.nome]
            );
        }

        await connection.commit();
        console.log("Estatísticas dos jogadores atualizadas.");
    } catch (error) {
        await connection.rollback();
        console.error("Erro na gravação dos resultados:", error);
    } finally {
        connection.release();
    }
}

export async function obterRanking() {
    try {
        const [rows] = await db.query(`
            SELECT nome, vitorias, jogos_jogados 
            FROM users 
            ORDER BY vitorias DESC, jogos_jogados ASC 
            LIMIT 10
        `);
        return rows;
    } catch (error) {
        console.error("Erro no obterRanking:", error);
        return [];
    }
}