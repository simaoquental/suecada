import { criarBaralho, baralhar, partirBaralho, distribuir, determinarVencedor, calcularPontos } from './logic.js';

let salas = {};

export function setupSockets(io) {
  io.on('connection', socket => {
    
    // --- ENTRAR NA SALA ---
    socket.on('joinRoom', ({ salaId, nome }) => {
      socket.salaId = salaId;
      if (!salas[salaId]) {
        salas[salaId] = { 
          jogadores: [], dadorIdx: 0, placarNos: 0, placarEles: 0, 
          ptsNos: 0, ptsEles: 0, fase: 'espera', 
          cartasNaMesa: [null, null, null, null], naipePuxado: null 
        };
      }
      const s = salas[salaId];
      if (s.jogadores.length < 4 && s.fase === 'espera') {
        const pos = s.jogadores.length;
        s.jogadores.push({ id: socket.id, nome, posicao: pos });
        socket.join(salaId);
        socket.emit('init', { jogadorIndex: pos });
        io.to(salaId).emit('estadoPublico', obterEstado(s));
      }
      
      // Quando o 4º entra, começa o Corte
      if (s.jogadores.length === 4 && s.fase === 'espera') {
        iniciarNovaRodada(io, salaId);
      }
    });

    socket.on('cortarBaralho', ({ indice }) => {
      const s = salas[socket.salaId];
      if (s && s.fase === 'corte') {
        s.baralho = partirBaralho(s.baralho, indice);
        s.fase = 'trunfo';
        io.to(socket.salaId).emit('solicitarTrunfo', { quemDa: s.dadorIdx });
        io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
      }
    });

    socket.on('escolherTrunfo', ({ escolha }) => {
      const s = salas[socket.salaId];
      if (s && s.fase === 'trunfo') {
        const { maos, trunfo } = distribuirProfissional(s.baralho, escolha, s.dadorIdx);
        s.maos = maos;
        s.trunfoNaipe = trunfo.naipe;
        s.trunfoImagem = trunfo.imagem;
        s.fase = 'jogando'; 
        s.jogadorAtual = (s.dadorIdx + 1) % 4;
        s.rodada = 0;
        s.naipePuxado = null;

        s.jogadores.forEach((p, i) => {
          io.to(p.id).emit('maoAtualizada', s.maos[i]);
        });
        io.to(socket.salaId).emit('estadoPublico', obterEstado(s));
      }
    });

    socket.on('jogarCarta', ({ cartaId }) => {
      const s = salas[socket.salaId];
      if (!s || s.fase !== 'jogando') return;
      
      const pIdx = s.jogadores.findIndex(p => p.id === socket.id);
      if (pIdx !== s.jogadorAtual) return;

      const carta = s.maos[pIdx].find(c => c.id === cartaId);
      if (!carta) return;

      const temNaipe = s.maos[pIdx].some(c => c.naipe === s.naipePuxado);
      if (s.naipePuxado && carta.naipe !== s.naipePuxado && temNaipe) return;


      s.cartasNaMesa[pIdx] = carta;
      s.maos[pIdx] = s.maos[pIdx].filter(c => c.id !== cartaId);
      

      if (s.cartasNaMesa.filter(c => c).length === 1) {
        s.naipePuxado = carta.naipe;
      }

      s.jogadorAtual = (s.jogadorAtual + 1) % 4;
      
      socket.emit('maoAtualizada', s.maos[pIdx]);
      io.to(socket.salaId).emit('estadoPublico', obterEstado(s));


      if (s.cartasNaMesa.every(c => c !== null)) {
        setTimeout(() => finalizarVaza(io, socket.salaId), 1500);
      }
    });
  });
}

function iniciarNovaRodada(io, salaId) {
  const s = salas[salaId];
  s.baralho = baralhar(criarBaralho());
  s.fase = 'corte';
  s.cartasNaMesa = [null, null, null, null];
  s.ptsNos = 0; s.ptsEles = 0;
  io.to(salaId).emit('solicitarCorte', { quemCorta: (s.dadorIdx + 2) % 4 });
  io.to(salaId).emit('estadoPublico', obterEstado(s));
}

function finalizarVaza(io, salaId) {
  const s = salas[salaId];
  if (!s) return;

  const vencedorIdx = determinarVencedor(s.cartasNaMesa, s.trunfoNaipe, s.naipePuxado);
  const pontosVaza = calcularPontos(s.cartasNaMesa);

  if (vencedorIdx === 0 || vencedorIdx === 2) {
    s.ptsNos += pontosVaza;
  } else {
    s.ptsEles += pontosVaza;
  }

  s.cartasNaMesa = [null, null, null, null];
  s.naipePuxado = null;
  s.jogadorAtual = vencedorIdx;
  s.rodada++;

  if (s.rodada === 10) {
    if (s.ptsNos > 60) s.placarNos += (s.ptsNos > 90 ? 2 : 1);
    else if (s.ptsEles > 60) s.placarEles += (s.ptsEles > 90 ? 2 : 1);
    
    s.dadorIdx = (s.dadorIdx + 1) % 4;
    iniciarNovaRodada(io, salaId);
  } else {
    io.to(salaId).emit('estadoPublico', obterEstado(s));
  }
}

function obterEstado(s) {
  return { 
    fase: s.fase, 
    nomes: s.jogadores.map(p => p.nome), 
    jogadorAtual: s.jogadorAtual, 
    cartasNaMesa: s.cartasNaMesa,
    placarNos: s.placarNos, placarEles: s.placarEles,
    ptsNos: s.ptsNos, ptsEles: s.ptsEles, 
    trunfoImagem: s.trunfoImagem,
    naipePuxado: s.naipePuxado 
  };
}