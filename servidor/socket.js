import { criarBaralho, baralhar, distribuir, determinarVencedor, calcularPontos } from './logic.js';
import * as dbm from './gameManager.js';

let salas = {};
let timeoutsDesconexao = {}; 

export function setupSockets(io) {
  io.on('connection', socket => {

socket.on('login', async (nome) => {
    if (!nome || nome.trim().length === 0) {
        return socket.emit('erroLogin', "Por favor, escolhe um nome de utilizador válido.");
    }
    
    const nomeLimpo = nome.trim();
    socket.nome = nomeLimpo;
    
    await dbm.obterOuCriarUtilizador(nomeLimpo);
    enviarRanking(io);
});

    socket.on('pedirSalas', () => { 
        enviarListaSalas(io);
    });

    socket.on('joinRoom', async ({ salaId, nome, senha }) => {
        if (!nome || nome.trim() === "" || !salaId) {
            return socket.emit('erroLogin', "Dados inválidos.");
        }

        const nomeLimpo = nome.trim();
        socket.nome = nomeLimpo;
        socket.salaId = salaId;

        if (!salas[salaId]) {
            salas[salaId] = { 
                id: salaId, 
                senha: senha || null, 
                jogadores: [], dadorIdx: 0, placarNos: 0, placarEles: 0, 
                ptsNos: 0, ptsEles: 0, fase: 'espera', cartasNaMesa: [null, null, null, null],
                jogadorAtual: 0, trunfo: null, trunfoNaipe: null, naipePuxado: null, 
                indiceCorte: 20, maos: [[], [], [], []], dbGameId: null 
            };
        }
        
        const s = salas[salaId];

        // Verifica se é uma reconexão
        const jogadorExistente = s.jogadores.find(p => 
            p.nome.toLowerCase() === nomeLimpo.toLowerCase() || 
            p.nome.toLowerCase() === `bot ${nomeLimpo}`.toLowerCase()
        );

        // VALIDAÇÃO DE SENHA: Só valida se não for reconexão e a sala tiver senha
        if (!jogadorExistente && s.senha && s.senha !== senha) {
            return socket.emit('erroLogin', "Senha incorreta para esta mesa!");
        }

        if (jogadorExistente) {
            if (jogadorExistente.isBot || timeoutsDesconexao[`${salaId}-${nomeLimpo}`]) {
                if (timeoutsDesconexao[`${salaId}-${nomeLimpo}`]) {
                    clearTimeout(timeoutsDesconexao[`${salaId}-${nomeLimpo}`]);
                    delete timeoutsDesconexao[`${salaId}-${nomeLimpo}`];
                }
                jogadorExistente.id = socket.id;
                jogadorExistente.nome = nomeLimpo; 
                jogadorExistente.isBot = false;
                console.log(`♻️ Reconexão: ${nomeLimpo} voltou.`);
            } else {
            return socket.emit('erroLogin', "Este nome já está em uso nesta sala.");
        }
      } else if (s.jogadores.length < 4 && s.fase === 'espera') {
          s.jogadores.push({ id: socket.id, nome: nomeLimpo, posicao: s.jogadores.length, isBot: false });
      } else { 
          return socket.emit('erroLogin', "Mesa cheia ou jogo já iniciado."); 
      }

      socket.join(salaId);
      io.to(salaId).emit('updateRoom', s);
      
      if (jogadorExistente && s.maos[jogadorExistente.posicao]?.length > 0) {
          socket.emit('suaMao', s.maos[jogadorExistente.posicao]);
      }

      if (s.jogadores.length === 4 && s.fase === 'espera') {
          try {
              s.dbGameId = await dbm.registarInicioJogo(s.jogadores);
              prepararNovaRodada(io, salaId);
          } catch (err) {
              console.error("Erro ao iniciar jogo no SQL:", err);
              prepararNovaRodada(io, salaId);
          }
      }

      enviarListaSalas(io);
    });

    socket.on('leaveRoom', () => {
        executarSaida(io, socket);
    });

    socket.on('disconnect', () => {
        const { salaId, nome } = socket;
        if (salaId && nome && salas[salaId]) {
            timeoutsDesconexao[`${salaId}-${nome}`] = setTimeout(() => {
                executarSaida(io, socket);
            }, 10000);
        }
    });

    socket.on('addBot', () => {
        const s = salas[socket.salaId];
        if (s && s.jogadores.length < 4 && s.fase === 'espera') {
            const botNome = `Bot_${Math.floor(Math.random() * 999)}`;
            s.jogadores.push({ id: `bot_${Date.now()}`, nome: botNome, posicao: s.jogadores.length, isBot: true });
            io.to(socket.salaId).emit('updateRoom', s);
            if (s.jogadores.length === 4) prepararNovaRodada(io, socket.salaId);
            enviarListaSalas(io);
        }
    });

    socket.on('corteFeito', (v) => {
        const s = salas[socket.salaId];
        if (!s || s.fase !== 'cortando') return;
        s.indiceCorte = parseInt(v);
        s.fase = 'escolhendo_trunfo';
        io.to(socket.salaId).emit('updateRoom', s);
        const d = s.jogadores.find(p => p.posicao === s.dadorIdx);
        if (d?.isBot) setTimeout(() => processarTrunfo(io, socket.salaId, 'primeira'), 1000);
        else if (d) io.to(d.id).emit('pedirTrunfo');
    });

    socket.on('trunfoEscolhido', (e) => processarTrunfo(io, socket.salaId, e));

    socket.on('jogarCarta', ({ idCarta }) => {
        const s = salas[socket.salaId];
        if (!s || s.fase !== 'jogando') return;
        const p = s.jogadores.find(px => px.id === socket.id); 
        if (p && p.posicao === s.jogadorAtual) processarJogada(io, socket.salaId, p.posicao, idCarta);
    });
  });
}

function executarSaida(io, socket) {
    const { salaId, nome } = socket;
    if (!salaId || !salas[salaId]) return;

    const s = salas[salaId];
    const eHost = s.jogadores[0] && s.jogadores[0].nome === nome;
    const apenasBotsRestantes = s.jogadores.every(p => p.isBot || p.nome === nome);

    if (eHost || apenasBotsRestantes) {
        io.to(salaId).emit('mesaEncerrada', "A mesa foi desfeita.");
        delete salas[salaId];
    } else {
        const p = s.jogadores.find(jp => jp.nome === nome);
        if (p && !p.isBot) {
            p.isBot = true;
            p.nome = `BOT ${p.nome}`;
            io.to(salaId).emit('updateRoom', s);
            verificarBot(io, salaId);
        }
    }
    socket.leave(salaId);
    enviarListaSalas(io);
}

function prepararNovaRodada(io, salaId) {
    const s = salas[salaId];
    if (!s) return;
    s.fase = 'cortando';
    s.baralho = baralhar(criarBaralho());
    io.to(salaId).emit('updateRoom', s);
    const cIdx = (s.dadorIdx + 3) % 4;
    const c = s.jogadores.find(p => p.posicao === cIdx);
    if (c?.isBot) {
        setTimeout(() => {
            s.indiceCorte = 20; s.fase = 'escolhendo_trunfo';
            io.to(salaId).emit('updateRoom', s);
            const d = s.jogadores.find(p => p.posicao === s.dadorIdx);
            if (d?.isBot) processarTrunfo(io, salaId, 'primeira');
            else if (d) io.to(d.id).emit('pedirTrunfo');
        }, 1000);
    } else if (c) io.to(c.id).emit('pedirCorte');
}

function processarTrunfo(io, salaId, escolha) {
    const s = salas[salaId];
    if (!s) return;
    const { maos, trunfo } = distribuir(s.baralho, escolha, s.dadorIdx, s.indiceCorte);
    s.maos = maos; s.trunfo = trunfo; s.trunfoNaipe = trunfo.naipe;
    s.fase = 'jogando'; s.jogadorAtual = (s.dadorIdx + 1) % 4;
    s.ptsNos = 0; s.ptsEles = 0; s.cartasNaMesa = [null, null, null, null]; s.naipePuxado = null;
    s.jogadores.forEach(p => { if (!p.isBot) io.to(p.id).emit('suaMao', s.maos[p.posicao]); });
    io.to(salaId).emit('updateRoom', s);
    verificarBot(io, salaId);
}

function processarJogada(io, salaId, pIdx, idCarta) {
    const s = salas[salaId];
    if (!s) return;
    const mao = s.maos[pIdx];
    const cIdx = mao.findIndex(c => c.id === idCarta);
    if (cIdx === -1) return;
    const carta = mao[cIdx];
    const temNaipe = mao.some(c => c.naipe === s.naipePuxado);
    if (s.naipePuxado && carta.naipe !== s.naipePuxado && temNaipe) return;
    if (!s.naipePuxado) s.naipePuxado = carta.naipe;
    s.cartasNaMesa[pIdx] = mao.splice(cIdx, 1)[0];
    s.jogadorAtual = (s.jogadorAtual + 1) % 4;
    io.to(salaId).emit('updateRoom', s);
    if (s.cartasNaMesa.filter(c => c).length === 4) setTimeout(() => resolverVaza(io, salaId), 1000);
    else verificarBot(io, salaId);
}

function resolverVaza(io, salaId) {
    const s = salas[salaId];
    if (!s) return;

    const vIdx = determinarVencedor(s.cartasNaMesa, s.trunfoNaipe, s.naipePuxado);
    const pts = calcularPontos(s.cartasNaMesa);

    if (vIdx === 0 || vIdx === 2) s.ptsNos += pts; else s.ptsEles += pts;

    s.cartasNaMesa = [null, null, null, null];
    s.naipePuxado = null;
    s.jogadorAtual = vIdx;

    if (s.maos[0].length === 0) {
        finalizarRodada(io, salaId);
    } else {
        io.to(salaId).emit('updateRoom', s);
        verificarBot(io, salaId);
    }
}

async function finalizarRodada(io, salaId) {
    const s = salas[salaId];
    if (!s) return;

    if (s.ptsNos > 60) {
        s.placarNos += (s.ptsNos > 90 ? 2 : 1);
    } else if (s.ptsEles > 60) {
        s.placarEles += (s.ptsEles > 90 ? 2 : 1);
    }

    s.ptsNos = 0; 
    s.ptsEles = 0;
    s.cartasNaMesa = [null, null, null, null];
    s.maos = [[], [], [], []];
    s.fase = 'espera';

    io.to(salaId).emit('updateRoom', s);

    if (s.placarNos >= 4 || s.placarEles >= 4) {
        const vence = s.placarNos >= 4 ? 'nos' : 'eles';
        
        io.to(salaId).emit('fimDeJogo', { 
            vencedor: vence, 
            placar: { nos: s.placarNos, eles: s.placarEles } 
        });

        if (s.dbGameId) {
            await dbm.finalizarJogoSQL(s.dbGameId);
        }

        const resultados = s.jogadores.filter(p => !p.isBot).map(p => {
            const ganhou = (vence === 'nos' && (p.posicao === 0 || p.posicao === 2)) || 
                           (vence === 'eles' && (p.posicao === 1 || p.posicao === 3));
            return {
                nome: p.nome,
                pontosGanhos: ganhou ? 1 : 0
            };
        });

        await dbm.gravarResultadosPartida(resultados);
        enviarRanking(io);

        setTimeout(() => {
            io.to(salaId).emit('sairParaLobby'); 
            
            delete salas[salaId];
            enviarListaSalas(io);
        }, 7000);

    } else {
        s.dadorIdx = (s.dadorIdx + 1) % 4;
        
        setTimeout(() => {
            prepararNovaRodada(io, salaId);
        }, 3000);
    }
}

function verificarBot(io, salaId) {
    const s = salas[salaId];
    if (!s || s.fase !== 'jogando') return;
    const bot = s.jogadores.find(p => p.posicao === s.jogadorAtual);
    if (bot?.isBot) {
        setTimeout(() => {
            const mao = s.maos[bot.posicao];
            if (!mao || mao.length === 0) return;
            const val = mao.filter(c => !s.naipePuxado || c.naipe === s.naipePuxado || !mao.some(x => x.naipe === s.naipePuxado));
            const esc = val[Math.floor(Math.random() * val.length)];
            if (esc) processarJogada(io, salaId, bot.posicao, esc.id);
        }, 1200);
    }
}

function enviarListaSalas(io) {
    const lista = Object.values(salas)
        .filter(s => s.jogadores.some(p => !p.isBot)) 
        .map(s => ({
            id: s.id,
            total: s.jogadores.length, 
            humanos: s.jogadores.filter(p => !p.isBot).length,
            fase: s.fase,
            privada: !!s.senha 
        }));
    io.emit('listaSalas', lista);
}

async function enviarRanking(io) {
    const r = await dbm.obterRanking();
    io.emit('listaRanking', r);
}