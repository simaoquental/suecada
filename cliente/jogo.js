const socket = io();
let meuNome = "", meuIdx = null, estado = {}, maoLocal = [];

socket.on('erro', d => {
    alert(d.msg);
    if (d.msg.includes("nome") || d.msg.includes("cheia") || d.msg.includes("mesa")) {
        document.getElementById('screen-lobby').classList.add('hidden');
        document.getElementById('screen-home').classList.remove('hidden');
        const input = document.getElementById('input-name');
        input.value = "";
        input.focus();
    }
});

socket.on('fimDeJogo', d => {
    alert(d.msg);
    setTimeout(() => location.reload(), 3000);
});

socket.on('listaRanking', ranking => {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    list.innerHTML = '<h3 class="text-yellow-500 font-black text-center mb-4 uppercase text-xs">Ranking</h3>';
    ranking.forEach((player, idx) => {
        list.innerHTML += `<div class="flex justify-between text-xs border-b border-white/5 pb-2">
            <span>${idx+1}. ${player.nome}</span><span class="text-emerald-400">${player.vitorias} Vit.</span>
        </div>`;
    });
});

function irParaLobby() {
    meuNome = document.getElementById('input-name').value.trim();
    if (meuNome.length < 2) return alert("Nome inválido!");
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    socket.emit('pedirRanking');
}

function criarSala() { entrar(Math.random().toString(36).substring(2, 7).toUpperCase()); }
function entrarNaSala() { entrar(document.getElementById('input-room-id').value.trim().toUpperCase()); }
function entrar(id) {
    document.getElementById('display-id').innerText = id;
    socket.emit('joinRoom', { salaId: id, nome: meuNome });
}

socket.on('init', d => { 
    meuIdx = d.jogadorIndex; 
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('placar').classList.remove('hidden'); 
});

socket.on('suaMao', m => { maoLocal = m; renderizarMao(); });
socket.on('estadoPublico', est => { estado = est; atualizarUI(); renderizarMesa(); renderizarMao(); });
socket.on('solicitarCorte', d => { if(meuIdx === d.quemCorta) document.getElementById('modal-corte').classList.remove('hidden'); });
socket.on('solicitarTrunfo', d => { if(meuIdx === d.quemEscolhe) document.getElementById('modal-trunfo').classList.remove('hidden'); });

function confirmarCorte() {
    socket.emit('cortar', { posicao: document.getElementById('corte-slider').value });
    document.getElementById('modal-corte').classList.add('hidden');
}
function escolherTrunfo(escolha) {
    socket.emit('escolherTrunfo', { escolha });
    document.getElementById('modal-trunfo').classList.add('hidden');
}
function jogarCarta(id) { socket.emit('jogarCarta', { cartaId: id }); }

function atualizarUI() {
    document.getElementById('pontos-nos').innerText = estado.ptsNos || 0;
    document.getElementById('pontos-eles').innerText = estado.ptsEles || 0;
    document.getElementById('placar-nos').innerText = estado.placarNos || 0;
    document.getElementById('placar-eles').innerText = estado.placarEles || 0;
    
    if (estado.trunfo) {
        document.getElementById('display-trunfo').innerHTML = `<img src="cartas/${estado.trunfo.imagem}" class="w-full h-full object-contain">`;
    }

    for (let i = 0; i < 4; i++) {
        const el = document.getElementById(`name-${i}`);
        if (!el) continue;
        const idxReal = (i + meuIdx) % 4;
        const p = estado.jogadores ? estado.jogadores.find(pj => pj.posicao === idxReal) : null;
        el.innerText = p ? p.nome : "...";
        
        let style = "px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-lg transition-all ";
        style += (estado.jogadorAtual === idxReal) ? "bg-yellow-500 text-black scale-110 z-50" : "bg-black/60 text-white border border-white/20";
        
        const pos = el.className.split(' ').filter(c => c.includes('absolute') || c.includes('top-') || c.includes('bottom-') || c.includes('left-') || c.includes('right-') || c.includes('translate') || c.includes('rotate'));
        el.className = style + " " + pos.join(' ');
    }
}

function renderizarMao() {
    const container = document.getElementById('minha-mao');
    if(!container) return;
    container.innerHTML = '';
    maoLocal.sort((a, b) => a.naipe.localeCompare(b.naipe) || b.ordem - a.ordem);
    const temNaipe = estado.naipePuxado && maoLocal.some(c => c.naipe === estado.naipePuxado);

    maoLocal.forEach((carta, index) => {
        const img = document.createElement('img');
        img.src = `cartas/${carta.imagem}`;
        const eMinhaVez = (estado.jogadorAtual === meuIdx && estado.fase === 'jogando');
        const podeJogar = !temNaipe || carta.naipe === estado.naipePuxado;

        let cls = "w-16 sm:w-24 md:w-28 transition-all rounded-md shadow-lg ";
        if (eMinhaVez && podeJogar) {
            img.className = cls + "hover:-translate-y-10 cursor-pointer ring-2 ring-yellow-500 z-30 hover:z-50";
            img.onclick = () => jogarCarta(carta.id);
        } else {
            img.className = cls + "grayscale opacity-50 cursor-not-allowed";
        }
        if (maoLocal[index+1] && maoLocal[index+1].naipe !== carta.naipe) img.classList.add('mr-4');
        container.appendChild(img);
    });
}

function renderizarMesa() {
    const mesa = document.getElementById('cartas-centro');
    if(!mesa) return;
    mesa.innerHTML = '';
    const posMesa = [
        "bottom-0 left-1/2 -translate-x-1/2 z-10",
        "left-0 top-1/2 -translate-y-1/2 rotate-90",
        "top-0 left-1/2 -translate-x-1/2",
        "right-0 top-1/2 -translate-y-1/2 -rotate-90"
    ];
    if (estado.cartasNaMesa) {
        estado.cartasNaMesa.forEach((c, i) => {
            if (!c) return;
            const vista = (i - meuIdx + 4) % 4;
            const img = document.createElement('img');
            img.src = `cartas/${c.imagem}`;
            img.className = `absolute w-12 sm:w-24 shadow-2xl rounded-md border border-white/10 ${posMesa[vista]}`;
            mesa.appendChild(img);
        });
    }
}