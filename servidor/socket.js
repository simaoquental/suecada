import { criarBaralho, baralhar, partirBaralho, distribuir, determinarVencedor, calcularPontos } from './logic.js';
import * as dbm from './gameManager.js';

let salas = {};

export function setupSockets(io) {
  io.on('connection', socket => {

    socket.on('pedirRanking', async () => {
        const r = await dbm.obterRanking();
        socket.emit('listaRanking', r);
    });
    
    socket.on('joinRoom', async ({ salaId, nome }) => {
      const nomeLimpo = nome.trim();
      if (!salas[salaId]) {
        salas[salaId] = { 
          jogadores: [], dadorIdx: 0, placarNos: 0, placarEles: 0, ptsNos: 0, ptsEles: 0, 
          fase: 'espera', cartasNaMesa: [null, null, null, null], naipePuxado: null 
        };
      }
      const s = salas[salaId];
      const nomeExiste = s.jogadores.find(p => p.nome.toLowerCase() === nomeLimpo.toLowerCase());
      if (nomeExiste) {
        socket.emit('erro', { msg: "Já existe um jogador com esse nome nesta mesa!" });
        return; 
      }
      if (s.jogadores.length < 4 && s.fase === 'espera') {
        const uId = await dbm.obterOuCriarUtilizador(nomeLimpo);
        socket.userIdDb = uId;
        socket.salaId = salaId;
        const pos = s.jogadores.length;
        s.jogadores.push({ id: socket.id, dbId: uId, nome: nomeLimpo, posicao: pos });
        socket.join(salaId);
        socket.emit('init', { jogadorIndex: pos, salaId });
        if (s.jogadores.length === 4) iniciarNovaPartida(io, salaId);
        else io.to(salaId).emit('estadoPublico', obterEstado(s));
      } else {
        socket.emit('erro', { msg: "A mesa está cheia ou o jogo já começou!" });
      }
    });

    socket.on('cortar', data => {
      const s = salas[socket.salaId];
      if (!s || s.fase !== 'corte') return;
      s.baralho = partirBaralho(s.baralho, parseInt(data.posicao));
      s.fase = 'escolha_trunfo';
      io.to(socket.salaId).emit('solicitarTrunfo', { quemEscolhe: s.dadorIdx });
      io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
    });

    socket.on('escolherTrunfo', data => {
      const s = salas[socket.salaId];
      if (!s || s.fase !== 'escolha_trunfo') return;
      const { maos, trunfo } = distribuir(s.baralho, data.escolha, s.dadorIdx);
      s.maos = maos;
      s.trunfo = trunfo;
      s.trunfoNaipe = trunfo.naipe;
      s.fase = 'jogando';
      s.jogadorAtual = (s.dadorIdx + 1) % 4;
      s.jogadores.forEach(p => {
        io.to(p.id).emit('suaMao', s.maos[p.posicao]);
      });
      io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
    });

    socket.on('jogarCarta', data => {
      const s = salas[socket.salaId];
      if (!s || s.fase !== 'jogando') return;
      
      const pIdx = s.jogadores.find(p => p.id === socket.id)?.posicao;
      if (pIdx !== s.jogadorAtual) return;

      const maoDoJogador = s.maos[pIdx];
      const cartaIdx = maoDoJogador.findIndex(c => c.id === data.cartaId);
      if (cartaIdx === -1) return;

      const carta = maoDoJogador[cartaIdx];
      
      const temNaipe = maoDoJogador.some(c => c.naipe === s.naipePuxado);
      if (s.naipePuxado && carta.naipe !== s.naipePuxado && temNaipe) return;

      if (!s.naipePuxado) s.naipePuxado = carta.naipe;
      
      s.cartasNaMesa[pIdx] = carta;
      maoDoJogador.splice(cartaIdx, 1); 
      
      socket.emit('suaMao', maoDoJogador);
      
      if (s.cartasNaMesa.filter(c => c !== null).length === 4) {
        s.jogadorAtual = -1;
        io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
        setTimeout(() => finalizarVaza(io, socket.salaId), 1500);
      } else {
        s.jogadorAtual = (s.jogadorAtual + 1) % 4;
        io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
      }
    });

    socket.on('disconnect', () => {
      const s = salas[socket.salaId];
      if (s && s.fase === 'espera') {
        s.jogadores = s.jogadores.filter(p => p.id !== socket.id);
        s.jogadores.forEach((p, i) => p.posicao = i);
        io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
      }
    });
  });
}

function iniciarNovaPartida(io, salaId) {
  const s = salas[salaId];
  s.baralho = baralhar(criarBaralho());
  s.fase = 'corte';
  s.ptsNos = 0; s.ptsEles = 0; s.rodada = 0;
  s.cartasNaMesa = [null, null, null, null];
  const quemCorta = (s.dadorIdx + 2) % 4;
  io.to(salaId).emit('solicitarCorte', { quemCorta });
  io.to(salaId).emit('estadoPublico', obterEstado(s));
}

function obterEstado(s) {
  return {
    fase: s.fase,
    jogadores: s.jogadores.map(p => ({ nome: p.nome, posicao: p.posicao })),
    jogadorAtual: s.jogadorAtual,
    cartasNaMesa: s.cartasNaMesa,
    trunfo: s.trunfo,
    naipePuxado: s.naipePuxado,
    ptsNos: s.ptsNos,
    ptsEles: s.ptsEles,
    placarNos: s.placarNos,
    placarEles: s.placarEles
  };
}

async function finalizarVaza(io, salaId) {
  const s = salas[salaId];
  if (!s) return;
  const vIdx = determinarVencedor(s.cartasNaMesa, s.trunfoNaipe, s.naipePuxado);
  const pts = calcularPontos(s.cartasNaMesa);
  (vIdx === 0 || vIdx === 2) ? s.ptsNos += pts : s.ptsEles += pts;
  s.cartasNaMesa = [null, null, null, null]; s.naipePuxado = null; s.jogadorAtual = vIdx; s.rodada++;

  if (s.rodada === 10) {
    if (s.ptsNos === 120) s.placarNos += 4;
    else if (s.ptsNos > 60 && s.ptsEles < 30) s.placarNos += 2;
    else if (s.ptsNos > 60) s.placarNos += 1;
    else if (s.ptsEles === 120) s.placarEles += 4;
    else if (s.ptsEles > 60 && s.ptsNos < 30) s.placarEles += 2;
    else if (s.ptsEles > 60) s.placarEles += 1;

    if (s.placarNos >= 4 || s.placarEles >= 4) {
      const venceuNos = s.placarNos >= 4;
      for (const p of s.jogadores) {
        const venceu = (p.posicao === 0 || p.posicao === 2) ? venceuNos : !venceuNos;
        await dbm.atualizarEstatisticas(p.dbId, venceu);
      }
      io.to(salaId).emit('fimDeJogo', { msg: venceuNos ? "NÓS GANHÁMOS!" : "ELES GANHARAM!" });
      delete salas[salaId];
    } else {
      s.dadorIdx = (s.dadorIdx + 1) % 4;
      iniciarNovaPartida(io, salaId);
    }
  } else {
    io.to(salaId).emit('estadoPublico', obterEstado(s));
  }
}