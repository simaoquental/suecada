const socket = io();
let meuNome = "", meuIdx = null, estado = {}, maoLocal = [];

function irParaLobby() {
    meuNome = document.getElementById('input-name').value.trim();
    if (meuNome.length < 2) return alert("Nome inválido!");
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
}

function criarSala() {
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    entrar(id);
}

function entrarNaSala() {
    const id = document.getElementById('input-room-id').value.trim().toUpperCase();
    if (id.length < 3) return alert("Código inválido!");
    entrar(id);
}

function entrar(id) {
    document.getElementById('display-id').innerText = id;
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-wait').classList.remove('hidden');
    socket.emit('joinRoom', { salaId: id, nome: meuNome });
}

socket.on('init', d => { meuIdx = d.jogadorIndex; });

socket.on('solicitarCorte', d => {
    if (meuIdx === d.quemCorta) document.getElementById('modal-corte').classList.remove('hidden');
});

socket.on('solicitarTrunfo', d => {
    if (meuIdx === d.quemDa) document.getElementById('modal-trunfo').classList.remove('hidden');
});

socket.on('maoAtualizada', m => { 
    maoLocal = m; 
    renderizarMao(); 
});

socket.on('estadoPublico', e => {
    estado = e;
    if (e.fase === 'espera') {
        document.getElementById('count').innerText = `${e.nomes.length}/4 Jogadores`;
        return;
    }
    
    document.getElementById('screen-wait').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');
    document.getElementById('placar').classList.remove('hidden');
    document.getElementById('mao').classList.remove('hidden');
    
    document.getElementById('pts-nos').innerText = e.ptsNos;
    document.getElementById('pts-eles').innerText = e.ptsEles;
    document.getElementById('jogos-nos').innerText = e.placarNos;
    document.getElementById('jogos-eles').innerText = e.placarEles;

    if (e.trunfoImagem) {
        const t = document.getElementById('trunfo-img');
        t.src = `cartas/${e.trunfoImagem}`;
        t.classList.remove('hidden');
    }

    renderizarNomes(e.nomes);
    renderizarMesa();
    renderizarMao();
    atualizarVezVisual();
});

function renderizarNomes(nomes) {
    nomes.forEach((nome, i) => {
        const vista = (i - meuIdx + 4) % 4;
        const el = document.getElementById(`name-${vista}`);
        if (el) el.innerText = (i === meuIdx) ? `TU` : nome;
    });
}

function renderizarMao() {
    const div = document.getElementById('mao');
    div.innerHTML = '';
    
    const screenWidth = window.innerWidth;
    const cardSize = screenWidth < 384 ? 'w-11' : (screenWidth < 640 ? 'w-14' : 'w-20');
    const overlap = screenWidth < 384 ? '-ml-2' : '-ml-5 sm:-ml-8';

    maoLocal.forEach((c, i) => {
        const img = document.createElement('img');
        img.src = `cartas/${c.imagem}`;
        
        const vez = (estado.jogadorAtual === meuIdx && estado.fase === 'jogando');
        const temNaipe = estado.naipePuxado && maoLocal.some(card => card.naipe === estado.naipePuxado);
        let pode = vez && (!estado.naipePuxado || c.naipe === estado.naipePuxado || !temNaipe);

        img.className = `${cardSize} ${i === 0 || (screenWidth < 384 && i === 5) ? 'ml-0' : overlap} transition-all duration-200 rounded shadow-md bg-white 
            ${pode ? 'cursor-pointer hover:-translate-y-4 sm:hover:-translate-y-8 z-10 ring-2 ring-yellow-400' : 'grayscale opacity-40'}`;
        
        if (pode) img.onclick = () => socket.emit('jogarCarta', { cartaId: c.id });
        div.appendChild(img);
    });
}

function renderizarMesa() {
    const mesa = document.getElementById('mesa');
    mesa.querySelectorAll('.carta-jogada').forEach(c => c.remove());
    
    const cardSize = "w-11 xs:w-14 sm:w-16 md:w-20";
    const layouts = [
        "bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2",           
        "right-2 sm:right-6 top-1/2 -translate-y-1/2 rotate-90",  
        "top-8 sm:top-12 left-1/2 -translate-x-1/2 rotate-180", 
        "left-2 sm:left-6 top-1/2 -translate-y-1/2 -rotate-90"   
    ];

    estado.cartasNaMesa.forEach((c, i) => {
        if (!c) return;
        const vista = (i - meuIdx + 4) % 4;
        const img = document.createElement('img');
        img.src = `cartas/${c.imagem}`;
        img.className = `carta-jogada ${cardSize} absolute ${layouts[vista]} shadow-lg rounded bg-white transition-all`;
        mesa.appendChild(img);
    });
}

function atualizarVezVisual() {
    for (let vista = 0; vista < 4; vista++) {
        const indiceReal = (vista + meuIdx) % 4;
        const el = document.getElementById(`name-${vista}`);
        if (!el) continue;
        const vezDeste = (estado.jogadorAtual === indiceReal && estado.fase === 'jogando');
        el.className = el.className.split(' ').filter(c => !['bg-yellow-400', 'text-black', 'scale-110', 'ring-2', 'ring-yellow-200', 'bg-black/60', 'text-white/90'].includes(c)).join(' ');
        if (vezDeste) {
            el.className += " bg-yellow-400 text-black scale-110 ring-2 ring-yellow-200 font-black";
        } else {
            el.className += " bg-black/60 text-white/90 font-bold";
        }
    }
}

function escolherTrunfo(t) {
    document.getElementById('modal-trunfo').classList.add('hidden');
    socket.emit('escolherTrunfo', { escolha: t });
}

function confirmarCorte() {
    const val = document.getElementById('corte-slider').value;
    document.getElementById('modal-corte').classList.add('hidden');
    socket.emit('cortarBaralho', { indice: parseInt(val) });
}

window.onresize = () => renderizarMao();