
function criarBaralho() {
    const naipes = ['spades', 'hearts', 'diamonds', 'clubs'];
    const naipesSimbolo = { 'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣' };
    const valores = ['ace', '7', 'king', 'jack', 'queen', '6', '5', '4', '3', '2'];
    const valoresOrdem = { 'ace': 11, '7': 10, 'king': 4, 'jack': 3, 'queen': 2, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0 };
    const valoresPontos = { 'ace': 11, '7': 10, 'king': 4, 'jack': 3, 'queen': 2, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0 };
    const baralho = [];

    for (let naipe of naipes) {
        for (let valor of valores) {
            baralho.push({ 
                valor: valor, 
                naipe: naipe,
                naipeSimbolo: naipesSimbolo[naipe],
                imagem: `${valor}_of_${naipe}.svg`,
                ordem: valoresOrdem[valor],
                pontos: valoresPontos[valor]
            });
        }
    }
    return baralho;
}

function baralhar(cartas) {
    for (let i = cartas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }
    return cartas;
}

function partirBaralho(baralho, posicaoCorte) {
    const topo = baralho.slice(0, posicaoCorte);
    const baixo = baralho.slice(posicaoCorte);
    return baixo.concat(topo);
}

function escolherTrunfo(baralho, trunfoPosicao) {
    if (trunfoPosicao === "cima") {
        return baralho[0];
    } else {
        return baralho[baralho.length - 1];
    }
}

function darCartas(baralho, trunfoPosicao, distribuidorIndex) {
    const jogadores = [[], [], [], []];
    let i = 0;

    const proximoAntiHorario = (index) => (index + 1) % 4;
    const proximoHorario = (index) => (index - 1 + 4) % 4;

    if (trunfoPosicao === "baixo") {
        let jogadorAtual = proximoAntiHorario(distribuidorIndex);

        for (let volta = 0; volta < 3; volta++) {
            for (let c = 0; c < 10; c++) {
                jogadores[jogadorAtual].push(baralho[i++]);
            }
            jogadorAtual = proximoAntiHorario(jogadorAtual);
        }
        for (let c = 0; c < 9; c++) {
            jogadores[distribuidorIndex].push(baralho[i++]);
        }
    }
    else {
        i = 1;
        for (let c = 0; c < 9; c++) {
            jogadores[distribuidorIndex].push(baralho[i++]);
        }
        let jogadorAtual = proximoHorario(distribuidorIndex);
        for (let volta = 0; volta < 3; volta++) {
            for (let c = 0; c < 10; c++) {
                jogadores[jogadorAtual].push(baralho[i++]);
            }
            jogadorAtual = proximoHorario(jogadorAtual);
        }
    }

    return jogadores;
}
