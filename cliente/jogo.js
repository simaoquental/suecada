const socket = io();

let meuNome = localStorage.getItem('sueca_nome') || "";
let minhaSala = localStorage.getItem('sueca_sala') || "";
let meuIdx = null; 
let estado = {};   
let maoLocal = []; 

configurarSocket();

window.onload = () => {
    const nomeGuardado = localStorage.getItem('sueca_nome');
    const salaGuardada = localStorage.getItem('sueca_sala');

    if (nomeGuardado) {
        meuNome = nomeGuardado;
        socket.emit('login', meuNome);
        
        if (salaGuardada) {
            minhaSala = salaGuardada;
            entrarNaSala(salaGuardada);
        } else {
            irParaLobby(true);
        }
    } else {
        irParaLogin();
    }
};

function configurarSocket() {
    // 1. Receber lista de salas no lobby
    socket.on('listaSalas', (salas) => {
        const container = document.getElementById('lista-salas');
        if (!container) return;
        
        container.innerHTML = salas.map(s => {
            const cheia = s.total >= 4;
            return `
            <div onclick="${cheia ? "alert('Esta mesa está cheia!')" : `entrarNaSala('${s.id}')`}" 
                 class="glass p-5 rounded-2xl flex justify-between items-center transition-all shadow-lg
                 ${cheia ? 'opacity-40 grayscale cursor-not-allowed pointer-events-none' : 'hover:bg-white/10 cursor-pointer active:scale-95 border-white/5'}">
                
                <div class="flex flex-col text-left">
                    <span class="text-[10px] font-black uppercase text-white/30 tracking-widest">Mesa</span>
                    <span class="font-bold text-lg ${cheia ? 'text-white/50' : 'text-white'}">${s.id}</span>
                    <span class="text-[9px] text-white/40">${s.humanos} Humano(s) jogando</span>
                </div>

                <div class="px-4 py-1 rounded-full text-[10px] font-black 
                    ${cheia ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}">
                    ${cheia ? 'LOTADA' : `${s.total} / 4`}
                </div>
            </div>`;
        }).join('') || '<div class="col-span-2 text-center py-10 opacity-20 font-bold uppercase tracking-widest">Cria uma mesa para começar!</div>';
    });

    socket.on('updateRoom', (s) => {
        estado = s;
        if (s.id) {
            minhaSala = s.id;
            localStorage.setItem('sueca_sala', s.id);
        }

        const eu = s.jogadores.find(p => p.nome === meuNome);
        if (eu) {
            meuIdx = eu.posicao;
            if (s.maos && s.maos[meuIdx]) {
                maoLocal = s.maos[meuIdx];
                renderizarMinhaMao();
            }
        }
        atualizarInterface();
    });

   socket.on('finalDeJogoTotal', (dados) => {
    alert(dados.mensagem);
    
    localStorage.removeItem('sueca_sala');
    minhaSala = "";
    
    irParaLobby(true);
});

    socket.on('suaMao', (cartas) => { 
        maoLocal = cartas; 
        renderizarMinhaMao(); 
    });

    socket.on('pedirCorte', () => {
        const modal = document.getElementById('modal-corte-ui');
        if (modal) modal.classList.remove('hidden');
    });

    socket.on('pedirTrunfo', () => {
        const modal = document.getElementById('modal-trunfo-ui');
        if (modal) modal.classList.remove('hidden');
    });

    socket.on('mesaEncerrada', (msg) => {
        alert(msg);
        localStorage.removeItem('sueca_sala');
        minhaSala = "";
        location.reload(); 
    });

    socket.on('erroLogin', (msg) => {
        alert(msg);
        localStorage.removeItem('sueca_sala'); 
        minhaSala = "";
        irParaLobby(true);
    });

    socket.on('listaRanking', (ranking) => {
        const container = document.getElementById('lista-ranking');
        if (!container) return;
        container.innerHTML = ranking.map((r, i) => `
            <div class="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span class="text-xs font-black text-white/20">${i + 1}º</span>
                <span class="flex-1 ml-3 font-bold text-sm">${r.nome}</span>
                <span class="text-yellow-500 font-black text-sm">${r.vitorias} 🏆</span>
            </div>`).join('');
    });
}


function irParaLogin() {
    document.getElementById('screen-home').classList.remove('hidden');
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-game').classList.add('hidden');
}

function irParaLobby(silencioso = false) {
    const screenHome = document.getElementById('screen-home');
    const screenLobby = document.getElementById('screen-lobby');
    const screenGame = document.getElementById('screen-game');

    if (screenHome) screenHome.style.display = 'none';
    if (screenGame) screenGame.style.display = 'none';
    
    if (screenLobby) {
        screenLobby.style.display = 'flex';
        screenLobby.classList.remove('hidden');
    }

    if (!meuNome) {
        const input = document.getElementById('input-name');
        if (input && input.value.trim()) {
            meuNome = input.value.trim();
            localStorage.setItem('sueca_nome', meuNome);
        }
    }

    socket.emit('login', meuNome);
    socket.emit('pedirSalas');
}

function criarSala() {
    const id = "MESA-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    entrarNaSala(id);
}

function entrarNaSala(id) {
    if (!id) return;
    minhaSala = id;
    localStorage.setItem('sueca_sala', id);
    
    document.getElementById('screen-home').style.display = 'none';
    document.getElementById('screen-lobby').style.display = 'none';
    
    const screenGame = document.getElementById('screen-game');
    screenGame.style.display = 'flex';
    screenGame.classList.remove('hidden');

    socket.emit('joinRoom', { salaId: id, nome: meuNome });
}


function logout() {
   
        localStorage.removeItem('sueca_nome');
        localStorage.removeItem('sueca_sala');
        window.location.href = "/"; 
    
}

function sairDaMesa() {
    if (confirm("Desejas sair desta mesa e voltar ao lobby?")) {
        socket.emit('leaveRoom');
        
        localStorage.removeItem('sueca_sala');
        minhaSala = "";
        
        irParaLobby(true);
    }
}


function renderizarMinhaMao() {
    const container = document.getElementById('minha-mao');
    if (!container) return;
    container.innerHTML = "";

    const ordemNaipe = { 'hearts': 0, 'diamonds': 1, 'clubs': 2, 'spades': 3 };
    maoLocal.sort((a, b) => {
        if (a.naipe !== b.naipe) return ordemNaipe[a.naipe] - ordemNaipe[b.naipe];
        return b.ordem - a.ordem;
    });

    const isVez = (estado.jogadorAtual === meuIdx && estado.fase === 'jogando');

    maoLocal.forEach((carta, index) => {
        const img = document.createElement('img');
        img.src = `cartas/${carta.imagem}`;
        img.className = "w-20 sm:w-28 rounded-lg shadow-xl transition-all duration-200 flex-shrink-0";
        
        const temNaipePuxado = maoLocal.some(c => c.naipe === estado.naipePuxado);
        const podeJogar = !estado.naipePuxado || !temNaipePuxado || carta.naipe === estado.naipePuxado;

        if (isVez && podeJogar) {
            img.classList.add('cursor-pointer', 'hover:-translate-y-6', 'ring-2', 'ring-yellow-500', 'z-10');
            
            img.onclick = () => {
                img.style.pointerEvents = 'none'; 
                img.classList.add('opacity-50', 'scale-95');

                socket.emit('jogarCarta', { idCarta: carta.id });
                
                maoLocal.splice(index, 1);
                renderizarMinhaMao();
            };
        } else {
            img.classList.add('brightness-[0.3]', 'grayscale-[0.5]', 'cursor-not-allowed');
        }
        container.appendChild(img);
    });
}

function atualizarInterface() {
    const roomHeader = document.getElementById('room-id-header');
    if (roomHeader && minhaSala) {
        roomHeader.innerText = `#${minhaSala.toUpperCase()}`;
    }

    document.getElementById('vitorias-nos').innerText = estado.placarNos || 0;
    document.getElementById('vitorias-eles').innerText = estado.placarEles || 0;
    document.getElementById('pontos-nos').innerText = `(${estado.ptsNos || 0})`;
    document.getElementById('pontos-eles').innerText = `(${estado.ptsEles || 0})`;

    const trunfoDiv = document.getElementById('trunfo-display');
    if (trunfoDiv) {
        if (estado.trunfo && estado.trunfo.imagem) {
            trunfoDiv.innerHTML = `<img src="cartas/${estado.trunfo.imagem}" class="w-full h-full object-contain rounded-md shadow-sm">`;
            trunfoDiv.classList.add('ring-2', 'ring-yellow-500/50'); // Brilho suave se houver trunfo
        } else {
            trunfoDiv.innerHTML = '<span class="opacity-20 text-sm font-black">?</span>';
            trunfoDiv.classList.remove('ring-2', 'ring-yellow-500/50');
        }
    }

    if (meuIdx !== null && estado.jogadores) {
        [0, 1, 2, 3].forEach(offset => {
            const idxReal = (meuIdx + offset) % 4;
            const p = estado.jogadores.find(px => px.posicao === idxReal);
            const elNome = document.getElementById(`nome-${offset}`);
            const slot = document.getElementById(`slot-${offset}`);
            
            const isVezDesteJogador = (idxReal === estado.jogadorAtual && estado.fase === 'jogando');

            if (elNome) {
                let txt = p ? p.nome : "Aguardando...";
                if (p && p.isBot) txt += " 🤖";
                if (p && estado.jogadores[0] && p.nome === estado.jogadores[0].nome) txt += " 👑";
                
                elNome.innerText = txt;

                if (isVezDesteJogador) {
                    elNome.classList.add('text-yellow-500', 'font-black', 'scale-110');
                } else {
                    elNome.classList.remove('text-yellow-500', 'font-black', 'scale-110');
                }
            }

            if (slot) {
                const carta = estado.cartasNaMesa ? estado.cartasNaMesa[idxReal] : null;
                
                if (isVezDesteJogador) {
                    slot.classList.add('ring-4', 'ring-yellow-500/50', 'rounded-lg', 'animate-pulse');
                } else {
                    slot.classList.remove('ring-4', 'ring-yellow-500/50', 'animate-pulse');
                }

                slot.innerHTML = carta 
                    ? `<img src="cartas/${carta.imagem}" class="w-full h-full object-contain shadow-2xl rounded-lg animate-in zoom-in duration-300">` 
                    : "";
            }
        });
    }

    const btnBot = document.getElementById('btn-add-bot');
    if (btnBot) {
        const souHost = estado.jogadores && estado.jogadores[0] && estado.jogadores[0].nome === meuNome;
        const temEspaço = estado.jogadores && estado.jogadores.length < 4;
        const faseEspera = estado.fase === 'espera';

        if (souHost && temEspaço && faseEspera) {
            btnBot.classList.remove('hidden');
        } else {
            btnBot.classList.add('hidden');
        }
    }
}

function adicionarBot() {
    socket.emit('addBot');
}

function enviarCorteUI() {
    socket.emit('corteFeito', document.getElementById('slider-corte').value || 20);
    document.getElementById('modal-corte-ui').classList.add('hidden');
}

function enviarTrunfoUI(escolha) {
    socket.emit('trunfoEscolhido', escolha);
    document.getElementById('modal-trunfo-ui').classList.add('hidden');
}

