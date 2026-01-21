
import { db } from './db.js';

export async function criarJogo() {
  const [result] = await db.query(
    'INSERT INTO games (estado) VALUES ("criado")'
  );
  return result.insertId;
}

export async function adicionarJogador(gameId, userId, posicao) {
  await db.query(
    'INSERT INTO game_players (game_id, user_id, posicao) VALUES (?, ?, ?)',
    [gameId, userId, posicao]
  );
}

export async function guardarResultado(gameId, pontosNos, pontosEles, vencedor) {
  await db.query(
    `INSERT INTO game_results (game_id, pontos_nos, pontos_eles, vencedor)
     VALUES (?, ?, ?, ?)`,
    [gameId, pontosNos, pontosEles, vencedor]
  );

  await db.query(
    'UPDATE games SET estado="terminado", terminado_em=NOW() WHERE id=?',
    [gameId]
  );
}
