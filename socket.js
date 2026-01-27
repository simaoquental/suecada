import { criarBaralho, baralhar, distribuir, determinarVencedor, calcularPontos } from './logic.js';
import * as dbm from './gameManager.js';

let salas = {};
let timeoutsDesconexao = {}; 

export function setupSockets(io) {
  io.on('connection', socket => {

    // --- LOGIN E RANKING ---
socket.on('login', async (nome) => {
    // Verifica se o nome é válido (não vazio e não apenas espaços)
    if (!nome || nome.trim().length === 0) {
        return socket.emit('erroLogin', "Por favor, escolhe um nome de utilizador válido.");
    }
    
    // Limpa espaços extras (ex: "  João  " vira "João")
    const nomeLimpo = nome.trim();
    socket.nome = nomeLimpo;
    
    await dbm.obterOuCriarUtilizador(nomeLimpo);
    enviarRanking(io);
});

    // --- GESTÃO DE SALAS ---
    socket.on('pedirSalas', () => { 
        enviarListaSalas(io);
    });

    socket.on('joinRoom', async ({ salaId, nome }) => {
      // 1. Validação de nome (vazio ou espaços)
      if (!nome || nome.trim() === "" || !salaId) {
          return socket.emit('erroLogin', "Nome inválido ou sala não especificada.");
      }

      const nomeLimpo = nome.trim();
      socket.nome = nomeLimpo;
      socket.salaId = salaId;

      // Inicializa a sala se não existir
      if (!salas[salaId]) {
        salas[salaId] = { 
            id: salaId, jogadores: [], dadorIdx: 0, placarNos: 0, placarEles: 0, 
            ptsNos: 0, ptsEles: 0, fase: 'espera', cartasNaMesa: [null, null, null, null],
            jogadorAtual: 0, trunfo: null, trunfoNaipe: null, naipePuxado: null, 
            indiceCorte: 20, maos: [[], [], [], []], dbGameId: null 
        };
      }
      
      const s = salas[salaId];

      // 2. Verificação de Duplicados e Reconexão
      const jogadorExistente = s.jogadores.find(p => 
          p.nome.toLowerCase() === nomeLimpo.toLowerCase() || 
          p.nome.toLowerCase() === `bot ${nomeLimpo}`.toLowerCase()
      );

      if (jogadorExistente) {
          // Se for BOT ou estiver em timeout, é reconexão
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
      
      // Se houver jogo a decorrer, envia a mão
      if (jogadorExistente && s.maos[jogadorExistente.posicao]?.length > 0) {
          socket.emit('suaMao', s.maos[jogadorExistente.posicao]);
      }

      // 3. SE A MESA FICAR CHEIA: Grava no SQL e Inicia
      if (s.jogadores.length === 4 && s.fase === 'espera') {
          try {
              // Regista o início do jogo nas tabelas 'games' e 'game_players'
              s.dbGameId = await dbm.registarInicioJogo(s.jogadores);
              prepararNovaRodada(io, salaId);
          } catch (err) {
              console.error("Erro ao iniciar jogo no SQL:", err);
              // Mesmo com erro no SQL, o jogo inicia para não travar os jogadores
              prepararNovaRodada(io, salaId);
          }
      }

      enviarListaSalas(io);
    });

    // --- SAÍDAS E DESCONEXÕES ---
    socket.on('leaveRoom', () => {
        executarSaida(io, socket);
    });

    socket.on('disconnect', () => {
        const { salaId, nome } = socket;
        if (salaId && nome && salas[salaId]) {
            // Aguarda 10 segundos (mais rápido que os 20 anteriores para evitar "fantasmas")
            timeoutsDesconexao[`${salaId}-${nome}`] = setTimeout(() => {
                executarSaida(io, socket);
            }, 10000);
        }
    });

    // --- LÓGICA DO JOGO ---
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
        const p = s.jogadores.find(px => px.id === socket.id); // Busca por ID é mais seguro
        if (p && p.posicao === s.jogadorAtual) processarJogada(io, socket.salaId, p.posicao, idCarta);
    });
  });
}

function executarSaida(io, socket) {
    const { salaId, nome } = socket;
    if (!salaId || !salas[salaId]) return;

    const s = salas[salaId];
    // Se quem sai é o Host (primeiro jogador) ou se não sobrar nenhum humano real
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
    s.cartasNaMesa = [null, null, null, null]; s.naipePuxado = null; s.jogadorAtual = vIdx;
    if (s.maos[0].length === 0) finalizarRodada(io, salaId);
    else { io.to(salaId).emit('updateRoom', s); verificarBot(io, salaId); }
}

async function finalizarRodada(io, salaId) {
    const s = salas[salaId];
    if (!s) return;

    const pts = calcularPontos(s.cartasNaMesa);
    const vencedorVaza = determinarVencedor(s.cartasNaMesa, s.trunfoNaipe, s.naipePuxado);
    
    if (vencedorVaza === 0 || vencedorVaza === 2) s.ptsNos += pts;
    else s.ptsEles += pts;

    s.cartasNaMesa = [null, null, null, null];
    s.naipePuxado = null;
    s.jogadorAtual = vencedorVaza;

    // Se a mão acabou (cartas acabaram)
    if (s.maos[0].length === 0) {
        if (s.ptsNos > 60) s.placarNos += (s.ptsNos > 90 ? 2 : 1);
        else if (s.ptsEles > 60) s.placarEles += (s.ptsEles > 90 ? 2 : 1);
        else { /* empate 60-60 não soma nada */ }

        s.ptsNos = 0; s.ptsEles = 0;
        s.fase = 'espera';
    }

    // VERIFICA SE ALGUÉM GANHOU O JOGO (4 pontos/bandeiras)
    if (s.placarNos >= 4 || s.placarEles >= 4) {
        const vence = s.placarNos >= 4 ? 'nos' : 'eles';
        io.to(salaId).emit('fimDeJogo', { vencedor: vence, placar: { nos: s.placarNos, eles: s.placarEles } });

        // 1. Fechar o jogo na tabela 'games'
        if (s.dbGameId) {
            await dbm.finalizarJogoSQL(s.dbGameId);
        }

        // 2. Preparar resultados para a tabela 'users' (quem ganhou leva 1, quem perdeu leva 0)
        // Todos os humanos levam +1 em 'jogos_jogados'
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

        // Limpar sala após 5 segundos
        setTimeout(() => {
            delete salas[salaId];
            io.to(salaId).emit('updateRoom', null);
            enviarListaSalas(io);
        }, 5000);

    } else {
        // O jogo continua, próxima rodada de distribuição
        if (s.fase === 'espera') {
            s.dadorIdx = (s.dadorIdx + 1) % 4;
            setTimeout(() => prepararNovaRodada(io, salaId), 2000);
        } else {
            // Continua a vaza atual
            io.to(salaId).emit('updateRoom', s);
            verificarBot(io, salaId);
        }
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
        .filter(s => s.jogadores.some(p => !p.isBot)) // SÓ remove salas 100% de bots
        .map(s => ({
            id: s.id,
            total: s.jogadores.length, 
            humanos: s.jogadores.filter(p => !p.isBot).length,
            fase: s.fase // Enviamos a fase para o cliente saber se pode entrar
        }));
    io.emit('listaSalas', lista);
}

async function enviarRanking(io) {
    const r = await dbm.obterRanking();
    io.emit('listaRanking', r);
}