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


export async function criarJogo() {
    const [result] = await db.query('INSERT INTO games (estado) VALUES ("em_curso")');
    return result.insertId;
}

/**
 * Atualiza as vitórias e o total de jogos de um utilizador.
 * @param {number} userId - ID do utilizador
 * @param {boolean} venceu - Se ganhou a partida de 4 jogos
 */
export async function atualizarEstatisticas(userId, venceu) {
    try {
        const pontosVitoria = venceu ? 1 : 0;
        await db.query(
            'UPDATE users SET jogos_jogados = jogos_jogados + 1, vitorias = vitorias + ? WHERE id = ?',
            [pontosVitoria, userId]
        );
    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
    }
}

//top 10 ranking
export async function obterRanking() {
    try {
        const [rows] = await db.query(
            'SELECT nome, vitorias, jogos_jogados FROM users ORDER BY vitorias DESC LIMIT 10'
        );
        return rows;
    } catch (error) {
        console.error("Erro ao obter ranking:", error);
        return [];
    }
}