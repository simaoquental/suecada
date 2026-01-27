import { db } from './db.js';

/**
 * Procura um utilizador pelo nome ou cria-o se não existir.
 */
export async function obterOuCriarUtilizador(nome) {
    try {
        const [rows] = await db.query('SELECT id FROM users WHERE nome = ?', [nome]);
        if (rows.length > 0) return rows[0].id;
        
        const [result] = await db.query('INSERT INTO users (nome, vitorias, jogos_jogados) VALUES (?, 0, 0)', [nome]);
        return result.insertId;
    } catch (error) {
        console.error("❌ Erro em obterOuCriarUtilizador:", error);
        return null;
    }
}

/**
 * Regista o início de um jogo e os seus participantes nas tabelas SQL.
 */
export async function registarInicioJogo(jogadores) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Criar o registo na tabela 'games'
        const [gameResult] = await connection.query(
            "INSERT INTO games (estado, criado_em) VALUES ('em_curso', NOW())"
        );
        const gameId = gameResult.insertId;

        // 2. Associar cada jogador real ao jogo na tabela 'game_players'
        for (const p of jogadores) {
            // Só registamos jogadores reais (não bots) no histórico de game_players se preferires, 
            // ou todos para manter a posição da mesa. Aqui registamos todos:
            const [user] = await connection.query("SELECT id FROM users WHERE nome = ?", [p.nome]);
            
            let userId = null;
            if (user.length > 0) {
                userId = user[0].id;
            } else {
                // Se for um BOT ou utilizador novo, garantimos que existe ou usamos um ID genérico
                userId = await obterOuCriarUtilizador(p.nome);
            }

            await connection.query(
                "INSERT INTO game_players (game_id, user_id, posicao) VALUES (?, ?, ?)",
                [gameId, userId, p.posicao]
            );
        }

        await connection.commit();
        console.log(`🎮 Jogo ${gameId} iniciado e jogadores registados.`);
        return gameId;
    } catch (error) {
        await connection.rollback();
        console.error("❌ Erro ao registar início do jogo:", error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Marca o jogo como terminado na tabela 'games'.
 */
export async function finalizarJogoSQL(gameId) {
    try {
        await db.query(
            "UPDATE games SET estado = 'em_curso', terminado_em = NOW() WHERE id = ?",
            [gameId]
        );
        console.log(`✅ Jogo ${gameId} marcado como terminado.`);
    } catch (error) {
        console.error("❌ Erro ao finalizarJogoSQL:", error);
    }
}

/**
 * Atualiza estatísticas de múltiplos jogadores (Vitórias e Jogos Jogados).
 */
export async function gravarResultadosPartida(resultados) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const res of resultados) {
            // Incrementa sempre jogos_jogados e soma 1 às vitorias se ganhou
            await connection.query(
                `UPDATE users 
                 SET jogos_jogados = jogos_jogados + 1, 
                     vitorias = vitorias + ? 
                 WHERE nome = ?`,
                [res.pontosGanhos, res.nome]
            );
        }

        await connection.commit();
        console.log("📊 Estatísticas dos jogadores atualizadas.");
    } catch (error) {
        await connection.rollback();
        console.error("❌ Erro na gravação dos resultados:", error);
    } finally {
        connection.release();
    }
}

/**
 * Obtém o Ranking dos 10 melhores jogadores.
 */
export async function obterRanking() {
    try {
        // Ranking ordenado por vitórias, e depois por menos jogos (desempate)
        const [rows] = await db.query(`
            SELECT nome, vitorias, jogos_jogados 
            FROM users 
            ORDER BY vitorias DESC, jogos_jogados ASC 
            LIMIT 10
        `);
        return rows;
    } catch (error) {
        console.error("❌ Erro no obterRanking:", error);
        return [];
    }
}