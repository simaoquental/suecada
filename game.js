
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

    // Distribui 10 cartas para cada jogador, ignorando a posição do trunfo na mão
    for (let j = 0; j < 4; j++) {
        for (let c = 0; c < 10; c++) {
            jogadores[j].push(baralho[i++]);
        }
    }
    return jogadores;
}

let posicaoCorteEscolhida = 20;
let trunfoPosicaoEscolhida = null;
let embaralhadorIndex = 0;
let distribuidorIndex = 0;

function renderizarJogo() {
    let baralho = criarBaralho();
    baralho = baralhar(baralho);
    baralho = partirBaralho(baralho, posicaoCorteEscolhida);
    const trunfo = escolherTrunfo(baralho, trunfoPosicaoEscolhida);
    const maos = darCartas(baralho, trunfoPosicaoEscolhida, distribuidorIndex);
    
    // Não adicionar o trunfo à mão do distribuidor, apenas mostrar visualmente
    
    const nomesJogadores = ['Você', 'Jogador 4', 'Jogador 3', 'Jogador 2'];
    const trunfoImg = document.querySelector('#trunfo img');
    trunfoImg.src = `imagens/${trunfo.imagem}`;
    trunfoImg.alt = `Trunfo: ${trunfo.valor} de ${trunfo.naipeSimbolo}`;
    const quemTrunfoDiv = document.querySelector('#quem-trunfo');
    quemTrunfoDiv.textContent = nomesJogadores[distribuidorIndex];
    
    const jogadores = [
        { elemento: document.querySelector('.jogador.baixo .cartas'), mao: maos[0], mostrar: true },
        { elemento: document.querySelector('.jogador.esquerda .cartas'), mao: maos[1], mostrar: false },
        { elemento: document.querySelector('.jogador.topo .cartas'), mao: maos[2], mostrar: false },
        { elemento: document.querySelector('.jogador.direita .cartas'), mao: maos[3], mostrar: false }
    ];
    
    jogadores.forEach((jogador, index) => {
        jogador.elemento.innerHTML = '';
        
        // Para telas >=1024px (lg) e jogadores horizontais, criar duas linhas
        let linhaCima, linhaBaixo;
        if (window.innerWidth >= 1024 && (index === 0 || index === 2) && jogador.mostrar) {
            linhaCima = document.createElement('div');
            linhaCima.className = 'linha-cima flex justify-center gap-1 mb-2';
            linhaBaixo = document.createElement('div');
            linhaBaixo.className = 'linha-baixo flex justify-center gap-1';
            jogador.elemento.appendChild(linhaCima);
            jogador.elemento.appendChild(linhaBaixo);
        }
        
        if (!jogador.mostrar) return;
        
        jogador.mao.forEach((carta, cartaIndex) => {
                const img = document.createElement('img');
                img.className = 'carta block rounded-sm transition-all duration-300 ease-in-out filter brightness-100';
                img.dataset.jogador = index;
                img.dataset.cartaIndex = cartaIndex;

                // tamanho responsivo das cartas
                img.classList.add('h-[45px]', 'sm:h-[55px]', 'md:h-[65px]', 'lg:h-[70px]', 'xl:h-[90px]', '2xl:h-[100px]', 'w-auto');

                // sobreposição horizontal (para cima/baixo) e vertical (para lados)
                if (index === 0 || index === 2) {
                    if (window.innerWidth >= 1024) {
                        // Para telas grandes, dividir as cartas restantes igualmente entre as linhas
                        const totalCartas = jogador.mao.length;
                        const metade = Math.ceil(totalCartas / 2);
                        if (cartaIndex < metade) {
                            linhaCima.appendChild(img);
                        } else {
                            linhaBaixo.appendChild(img);
                        }
                    } else {
                        // Normal, com sobreposição
                        if (cartaIndex === 0) img.style.marginLeft = '0';
                        else img.classList.add('-ml-[8px]', 'sm:-ml-[10px]', 'md:-ml-[12px]', 'lg:-ml-[14px]', 'xl:-ml-[16px]', '2xl:-ml-[18px]');
                        jogador.elemento.appendChild(img);
                    }
                } else {
                    // jogador nas laterais: empilhar verticalmente
                    if (cartaIndex === 0) img.style.marginTop = '0';
                    else img.classList.add('-mt-5', 'sm:-mt-6', 'md:-mt-8', 'lg:-mt-9', 'xl:-mt-10', '2xl:-mt-11');
                    jogador.elemento.appendChild(img);
                }

                if (jogador.mostrar) {
                    img.src = `imagens/${carta.imagem}`;
                    img.alt = `${carta.valor} de ${carta.naipeSimbolo}`;
                    img.addEventListener('click', () => jogarCarta(index, cartaIndex));
                    if (index === 0) {
                        img.classList.add('cursor-pointer', 'transform', 'hover:scale-105', 'hover:-translate-y-2', 'hover:brightness-110', 'hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]');
                    }
                } else {
                    img.src = 'imagens/back.svg';
                    img.alt = 'Carta virada';
                }

                jogador.elemento.appendChild(img);
        });
    });
    
        document.getElementById('modal-escolha').classList.add('hidden');
    
    estadoJogo.maos = maos;
    estadoJogo.trunfoNaipe = trunfo.naipe;
    estadoJogo.primeiroJogador = embaralhadorIndex;
    estadoJogo.jogadorAtual = estadoJogo.primeiroJogador;
    
    atualizarPainelPontuacao();
    atualizarDestaqueCartasJogaveis();

    if (estadoJogo.jogadorAtual !== 0) {
        setTimeout(() => iaJoga(estadoJogo.jogadorAtual), 1500);
    }
}

const estadoJogo = {
    maos: [[], [], [], []],
    cartasNaMesa: [null, null, null, null],
    trunfoNaipe: null,
    naipePuxado: null,
    primeiroJogador: 0,
    jogadorAtual: 0,
    pontosNos: 0,
    pontosEles: 0,
    rodada: 0,
    rodasGanhasEles: 0,
    pontosPartidaNos: 0,
    pontosPartidaEles: 0
};

function atualizarPainelPontuacao() {
    const nosRodada = document.getElementById('pontos-nos');
    const elesRodada = document.getElementById('pontos-eles');
    const nosTotal = document.getElementById('total-nos');
    const elesTotal = document.getElementById('total-eles');
    const placarNos = document.getElementById('placar-total-nos');
    const placarEles = document.getElementById('placar-total-eles');
    if (nosRodada) nosRodada.textContent = String(estadoJogo.pontosNos);
    if (elesRodada) elesRodada.textContent = String(estadoJogo.pontosEles);
    if (nosTotal) nosTotal.textContent = String(estadoJogo.pontosPartidaNos);
    if (elesTotal) elesTotal.textContent = String(estadoJogo.pontosPartidaEles);
    if (placarNos) placarNos.textContent = String(estadoJogo.pontosPartidaNos);
    if (placarEles) placarEles.textContent = String(estadoJogo.pontosPartidaEles);
}

function salvarPontuacaoGeral() {
    try {
        localStorage.setItem('pontosPartidaNos', String(estadoJogo.pontosPartidaNos));
        localStorage.setItem('pontosPartidaEles', String(estadoJogo.pontosPartidaEles));
    } catch (e) {
    }
}

function carregarPontuacaoGeral() {
    try {
        const nos = localStorage.getItem('pontosPartidaNos');
        const eles = localStorage.getItem('pontosPartidaEles');
        estadoJogo.pontosPartidaNos = nos ? parseInt(nos, 10) : 0;
        estadoJogo.pontosPartidaEles = eles ? parseInt(eles, 10) : 0;
    } catch (e) {
        estadoJogo.pontosPartidaNos = 0;
        estadoJogo.pontosPartidaEles = 0;
    }
    atualizarPainelPontuacao();
}

function jogarCarta(jogadorIndex, cartaIndex) {
    if (jogadorIndex !== estadoJogo.jogadorAtual) {
        return;
    }
    
    const carta = estadoJogo.maos[jogadorIndex][cartaIndex];
    
    if (!validarJogada(carta, jogadorIndex)) {
        return;
    }
    
    estadoJogo.maos[jogadorIndex].splice(cartaIndex, 1);
    estadoJogo.cartasNaMesa[jogadorIndex] = carta;
    
    if (estadoJogo.naipePuxado === null) {
        estadoJogo.naipePuxado = carta.naipe;
    }
    
    mostrarCartaNaMesa(carta, jogadorIndex);
    estadoJogo.jogadorAtual = (estadoJogo.jogadorAtual + 1) % 4;
    atualizarMaos();
    // Se todas as cartas foram jogadas, bloqueia jogada do usuário imediatamente
    if (estadoJogo.cartasNaMesa.every(c => c !== null)) {
        atualizarDestaqueCartasJogaveis(); // Remove destaques e cliques
        setTimeout(() => finalizarRodada(), 2000);
    } else {
        atualizarDestaqueCartasJogaveis();
        if (estadoJogo.jogadorAtual !== 0) {
            setTimeout(() => iaJoga(estadoJogo.jogadorAtual), 1500);
        }
    }
}

function validarJogada(carta, jogadorIndex) {
    if (estadoJogo.naipePuxado === null) {
        return true;
    }
    
    const temNaipePuxado = estadoJogo.maos[jogadorIndex].some(c => c.naipe === estadoJogo.naipePuxado);
    
    if (temNaipePuxado) {
        return carta.naipe === estadoJogo.naipePuxado;
    }
    
    return true;
}

function iaJoga(jogadorIndex) {
    const mao = estadoJogo.maos[jogadorIndex];
    let cartaEscolhida;
    let cartaIndex;

    // Função auxiliar para saber quem está ganhando a rodada
    function cartaGanhando() {
        let melhor = null;
        let melhorIdx = -1;
        for (let i = 0; i < 4; i++) {
            const carta = estadoJogo.cartasNaMesa[i];
            if (!carta) continue;
            if (!melhor) {
                melhor = carta;
                melhorIdx = i;
                continue;
            }
            // Se for trunfo
            if (carta.naipe === estadoJogo.trunfoNaipe && melhor.naipe !== estadoJogo.trunfoNaipe) {
                melhor = carta;
                melhorIdx = i;
            } else if (carta.naipe === melhor.naipe && carta.ordem > melhor.ordem) {
                melhor = carta;
                melhorIdx = i;
            }
        }
        return { carta: melhor, idx: melhorIdx };
    }

    // 1. Se for o primeiro a jogar, jogue carta baixa (exceto se só tem trunfo)
    if (estadoJogo.naipePuxado === null) {
        const naoTrunfo = mao.filter(c => c.naipe !== estadoJogo.trunfoNaipe);
        if (naoTrunfo.length > 0) {
            naoTrunfo.sort((a, b) => a.ordem - b.ordem);
            cartaEscolhida = naoTrunfo[0];
        } else {
            // Só tem trunfo
            const trunfos = mao.slice().sort((a, b) => a.ordem - b.ordem);
            cartaEscolhida = trunfos[0];
        }
        cartaIndex = mao.indexOf(cartaEscolhida);
    } else {
        // 2. Se tem carta do naipe puxado
        const cartasNaipe = mao.filter(c => c.naipe === estadoJogo.naipePuxado);
        if (cartasNaipe.length > 0) {
            // Tenta ganhar a rodada se possível
            const { carta: melhor } = cartaGanhando();
            // Cartas que ganham da melhor
            const ganhadoras = cartasNaipe.filter(c => {
                if (melhor.naipe === estadoJogo.trunfoNaipe) return false;
                return c.ordem > melhor.ordem;
            });
            if (ganhadoras.length > 0) {
                // Joga a menor que ganha
                ganhadoras.sort((a, b) => a.ordem - b.ordem);
                cartaEscolhida = ganhadoras[0];
            } else {
                // Não pode ganhar, joga a menor do naipe
                cartasNaipe.sort((a, b) => a.ordem - b.ordem);
                cartaEscolhida = cartasNaipe[0];
            }
            cartaIndex = mao.indexOf(cartaEscolhida);
        } else {
            // 3. Não tem o naipe puxado
            const trunfos = mao.filter(c => c.naipe === estadoJogo.trunfoNaipe);
            const { carta: melhor } = cartaGanhando();
            if (trunfos.length > 0) {
                // Só joga trunfo se puder ganhar
                const ganhadores = trunfos.filter(c => {
                    if (melhor.naipe === estadoJogo.trunfoNaipe) {
                        return c.ordem > melhor.ordem;
                    }
                    return true;
                });
                if (ganhadores.length > 0) {
                    ganhadores.sort((a, b) => a.ordem - b.ordem);
                    cartaEscolhida = ganhadores[0];
                } else {
                    // Não pode ganhar, joga a menor carta não trunfo
                    const naoTrunfo = mao.filter(c => c.naipe !== estadoJogo.trunfoNaipe);
                    if (naoTrunfo.length > 0) {
                        naoTrunfo.sort((a, b) => a.ordem - b.ordem);
                        cartaEscolhida = naoTrunfo[0];
                    } else {
                        // Só tem trunfo, joga o menor
                        trunfos.sort((a, b) => a.ordem - b.ordem);
                        cartaEscolhida = trunfos[0];
                    }
                }
                cartaIndex = mao.indexOf(cartaEscolhida);
            } else {
                // Não tem trunfo nem naipe puxado, joga a menor carta
                const resto = mao.slice().sort((a, b) => a.ordem - b.ordem);
                cartaEscolhida = resto[0];
                cartaIndex = mao.indexOf(cartaEscolhida);
            }
        }
    }
    jogarCarta(jogadorIndex, cartaIndex);
}

function mostrarCartaNaMesa(carta, jogadorIndex) {
    const mesaCartas = document.getElementById('mesa-cartas');
    if (!mesaCartas) {
        console.warn('[DEBUG] Container mesa-cartas não encontrado');
        return;
    }

    const img = document.createElement('img');
    img.src = `imagens/${carta.imagem}`;
    img.alt = `${carta.valor} de ${carta.naipeSimbolo}`;
    img.className = 'carta-mesa w-[32px] sm:w-[38px] md:w-[44px] lg:w-[50px] xl:w-[56px] 2xl:w-[62px] h-auto shadow';
    img.dataset.jogador = jogadorIndex;
    img.style.position = 'absolute';
    img.style.zIndex = '30';
    img.style.left = '50%';
    img.style.top = '50%';

    switch (jogadorIndex) {
        case 0:
            img.style.top = '60%';
            img.style.transform = 'translate(-50%, -50%)';
            break;
        case 1:
            img.style.left = '40%';
            img.style.transform = 'translate(-50%, -50%)';
            break;
        case 2:
            img.style.top = '40%';
            img.style.transform = 'translate(-50%, -50%)';
            break;
        case 3:
            img.style.left = '60%';
            img.style.transform = 'translate(-50%, -50%)';
            break;
    }

    mesaCartas.appendChild(img);
}

function finalizarRodada() {
    const vencedor = determinarVencedor();
    const nomesJogadores = ['Você', 'Jogador 4', 'Jogador 3', 'Jogador 2'];
    
    let pontos = 0;
    estadoJogo.cartasNaMesa.forEach(carta => {
        if (carta) pontos += carta.pontos;
    });
    
    if (vencedor === 0 || vencedor === 2) {
        estadoJogo.pontosNos += pontos;
    } else {
        estadoJogo.pontosEles += pontos;
    }
    atualizarPainelPontuacao();
    
    document.querySelectorAll('.carta-mesa').forEach(el => el.remove());
    estadoJogo.cartasNaMesa = [null, null, null, null];
    estadoJogo.naipePuxado = null;
    estadoJogo.jogadorAtual = vencedor;
    estadoJogo.rodada++;
    atualizarDestaqueCartasJogaveis();

    if (estadoJogo.rodada >= 10) {
        finalizarJogo();
        return;
    }

    if (vencedor === 0) {
        atualizarMaos(); // Atualiza a mão do jogador humano
        // As cartas já ficam jogáveis pois atualizarDestaqueCartasJogaveis é chamado
    } else {
        setTimeout(() => iaJoga(vencedor), 1500);
    }
}

function determinarVencedor() {
    // Pega o primeiro índice com carta na mesa
    let vencedor = estadoJogo.cartasNaMesa.findIndex(c => c);
    if (vencedor === -1) vencedor = estadoJogo.primeiroJogador;
    let melhorCarta = estadoJogo.cartasNaMesa[vencedor];
    // Se não há nenhuma carta na mesa, retorna o primeiro jogador (evita erro)
    if (!melhorCarta) {
        return estadoJogo.primeiroJogador;
    }
    
    const trunfos = estadoJogo.cartasNaMesa.map((carta, index) => 
        carta && carta.naipe === estadoJogo.trunfoNaipe ? { carta, index } : null
    ).filter(t => t !== null);
    
    if (trunfos.length > 0) {
        trunfos.sort((a, b) => b.carta.ordem - a.carta.ordem);
        return trunfos[0].index;
    } else {
        for (let i = 0; i < 4; i++) {
            const carta = estadoJogo.cartasNaMesa[i];
            if (carta && carta.naipe === estadoJogo.naipePuxado) {
                if (!melhorCarta || carta.ordem > melhorCarta.ordem) {
                    melhorCarta = carta;
                    vencedor = i;
                }
            }
        }
    }
    return vencedor;
}

function atualizarMaos() {
    const jogadores = [
        { elemento: document.querySelector('.jogador.baixo .cartas'), index: 0, mostrar: true },
        { elemento: document.querySelector('.jogador.esquerda .cartas'), index: 1, mostrar: false },
        { elemento: document.querySelector('.jogador.topo .cartas'), index: 2, mostrar: false },
        { elemento: document.querySelector('.jogador.direita .cartas'), index: 3, mostrar: false }
    ];
    
    jogadores.forEach(jogador => {
        if (!jogador.mostrar) return;
        jogador.elemento.innerHTML = '';
        estadoJogo.maos[jogador.index].forEach((carta, cartaIndex) => {
            const img = document.createElement('img');
            img.className = 'carta block rounded-sm transition-all duration-300 ease-in-out filter brightness-100';
            img.dataset.jogador = jogador.index;
            img.dataset.cartaIndex = cartaIndex;

            // tamanho responsivo das cartas
            img.classList.add('h-[45px]', 'sm:h-[55px]', 'md:h-[65px]', 'lg:h-[70px]', 'xl:h-[90px]', '2xl:h-[100px]', 'w-auto');

            // sobreposição horizontal (para cima/baixo) e vertical (para lados)
            if (jogador.index === 0 || jogador.index === 2) {
                if (cartaIndex === 0) img.style.marginLeft = '0';
                else img.classList.add('-ml-[8px]', 'sm:-ml-[10px]', 'md:-ml-[12px]', 'lg:-ml-[14px]', 'xl:-ml-[16px]', '2xl:-ml-[18px]');
            } else {
                if (cartaIndex === 0) img.style.marginTop = '0';
                else img.classList.add('-mt-5', 'sm:-mt-6', 'md:-mt-8', 'lg:-mt-9', 'xl:-mt-10', '2xl:-mt-11');
                img.classList.add('rotate-90');
            }

            if (jogador.mostrar) {
                img.src = `imagens/${carta.imagem}`;
                img.alt = `${carta.valor} de ${carta.naipeSimbolo}`;
                // Só adiciona evento de clique se for a vez do jogador 0
                if (jogador.index === 0 && estadoJogo.jogadorAtual === 0) {
                    img.addEventListener('click', () => jogarCarta(jogador.index, cartaIndex));
                    img.classList.add('cursor-pointer', 'transform', 'hover:scale-105', 'hover:-translate-y-2', 'hover:brightness-110', 'hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]');
                }
            } else {
                img.src = 'imagens/back.svg';
                img.alt = 'Carta virada';
            }

            jogador.elemento.appendChild(img);
        });
    });

    atualizarDestaqueCartasJogaveis();
}

function atualizarDestaqueCartasJogaveis() {
    const container = document.querySelector('.jogador.baixo .cartas');
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll('img.carta'));
    imgs.forEach(img => {
        img.classList.remove('jogavel', 'nao-jogavel');
        // remover classes Tailwind associadas aos estados
        img.classList.remove('cursor-pointer', 'shadow-[0_0_18px_rgba(255,215,0,0.7)]', 'brightness-110', 'cursor-not-allowed', 'filter', 'opacity-80');
        img.style.filter = '';
    });

    if (estadoJogo.jogadorAtual !== 0) return;

    if (estadoJogo.naipePuxado === null) {
        imgs.forEach(img => {
            img.classList.add('jogavel');
            img.classList.add('cursor-pointer', 'shadow-[0_0_18px_rgba(255,215,0,0.7)]', 'brightness-110');
        });
        return;
    }

    const mao = estadoJogo.maos[0] || [];
    const temNaipe = mao.some(c => c.naipe === estadoJogo.naipePuxado);
    if (!temNaipe) {
        imgs.forEach(img => {
            img.classList.add('jogavel');
            img.classList.add('cursor-pointer', 'shadow-[0_0_18px_rgba(255,215,0,0.7)]', 'brightness-110');
        });
        return;
    }
    mao.forEach((carta, idx) => {
        const img = imgs[idx];
        if (!img) return;
        if (carta.naipe === estadoJogo.naipePuxado) {
            img.classList.add('jogavel');
            img.classList.add('cursor-pointer', 'shadow-[0_0_18px_rgba(255,215,0,0.7)]', 'brightness-110');
        }
        else {
            img.classList.add('nao-jogavel');
            img.classList.add('cursor-not-allowed');
            img.style.filter = 'grayscale(60%) brightness(0.7)';
            img.style.opacity = '0.8';
        }
    });
}

function finalizarJogo() {
    let pontosGanhos = 0;
    let vencedor = '';
    
    // Vitória da equipa (4 partidas)
    if (estadoJogo.pontosPartidaNos === 4 || estadoJogo.pontosPartidaEles === 4) {
        const equipaVencedora = estadoJogo.pontosPartidaNos === 4 ? 'NÓS' : 'ELES';
        mostrarModalVitoria(equipaVencedora);
        return;
    }
    if (estadoJogo.pontosNos > 90 || estadoJogo.pontosEles > 90) {
        pontosGanhos = 2;
        vencedor = estadoJogo.pontosNos > estadoJogo.pontosEles ? 'NÓS' : 'ELES';
    } else if (estadoJogo.pontosNos === 60 && estadoJogo.pontosEles === 60) {
        pontosGanhos = 0;
        vencedor = 'EMPATE';
    } else if (estadoJogo.pontosNos > 60) {
        pontosGanhos = 1;
        vencedor = 'NÓS';
    } else if (estadoJogo.pontosEles > 60) {
        pontosGanhos = 1;
        vencedor = 'ELES';
    } else {
        pontosGanhos = 0;
        vencedor = 'NINGUÉM';
    }
    
    if (vencedor === 'NÓS') {
        estadoJogo.pontosPartidaNos += pontosGanhos;
    } else if (vencedor === 'ELES') {
        estadoJogo.pontosPartidaEles += pontosGanhos;
    }
    salvarPontuacaoGeral();
    atualizarPainelPontuacao();
    
    const msg = vencedor === 'EMPATE' 
        ? `Partida terminada em EMPATE!\n\n` +
          `Nós: ${estadoJogo.pontosNos} pontos\n` +
          `Eles: ${estadoJogo.pontosEles} pontos\n\n` +
          `Ninguém marca pontos!\n\n` +
          `Pontuação Geral:\n` +
          `Nós: ${estadoJogo.pontosPartidaNos} | Eles: ${estadoJogo.pontosPartidaEles}`
        : `Partida terminada!\n\n` +
          `Nós: ${estadoJogo.pontosNos} pontos\n` +
          `Eles: ${estadoJogo.pontosEles} pontos\n\n` +
          `Vencedor: ${vencedor}\n` +
          `Pontos ganhos: ${pontosGanhos}\n\n` +
          `Pontuação Geral:\n` +
          `Nós: ${estadoJogo.pontosPartidaNos} | Eles: ${estadoJogo.pontosPartidaEles}`;
    
    setTimeout(() => {
        novaPartida();
    }, 2000);
}

// Modal de vitória
function mostrarModalVitoria(equipa) {
    const modal = document.getElementById('modal-vitoria');
    const titulo = document.getElementById('vitoria-titulo');
    const msg = document.getElementById('vitoria-msg');
    if (!modal || !titulo || !msg) return;
    if (equipa === 'NÓS') {
        titulo.textContent = 'Parabéns! Vocês venceram!';
    } else if (equipa === 'ELES') {
        titulo.textContent = 'Vitória dos adversários!';
    } else {
        titulo.textContent = 'Fim de jogo';
    }
    modal.classList.remove('hidden');
    // Botão Reiniciar
    document.getElementById('btn-reiniciar').onclick = () => {
        modal.classList.add('hidden');
        // Zera a pontuação geral e de rodada
        estadoJogo.pontosNos = 0;
        estadoJogo.pontosEles = 0;
        estadoJogo.pontosPartidaNos = 0;
        estadoJogo.pontosPartidaEles = 0;
        salvarPontuacaoGeral();
        atualizarPainelPontuacao();
        novaPartida();
    };
    // Botão Menu (recarrega para tela inicial)
    document.getElementById('btn-menu').onclick = () => {
        window.location.href = 'index.html';
    };
}

function novaPartida() {
    estadoJogo.maos = [[], [], [], []];
    estadoJogo.cartasNaMesa = [null, null, null, null];
    estadoJogo.trunfoNaipe = null;
    estadoJogo.naipePuxado = null;
    estadoJogo.primeiroJogador = 0;
    estadoJogo.jogadorAtual = 0;
    estadoJogo.pontosNos = 0;
    estadoJogo.pontosEles = 0;
    estadoJogo.rodada = 0;
    estadoJogo.rodasGanhasNos = 0;
    estadoJogo.rodasGanhasEles = 0;
    
    atualizarPainelPontuacao();
    document.querySelectorAll('.carta-mesa').forEach(el => el.remove());
    document.getElementById('modal-escolha').classList.remove('hidden');
    location.reload();
}

function inicializarInterface() {
    carregarPontuacaoGeral();
    const corteSlider = document.getElementById('corte-slider');
    const valorCorteSpan = document.getElementById('valor-corte');
    const botoesTrunfo = document.querySelectorAll('.btn-trunfo');
    const btnIniciar = document.getElementById('btn-iniciar');
    const embaralhadorSpan = document.getElementById('embaralhador');
    const distribuidorSpan = document.getElementById('distribuidor');
    const secaoCorte = document.querySelectorAll('.modal-secao')[1];
    const secaoTrunfo = document.querySelectorAll('.modal-secao')[2];
    
    const nomesJogadores = ['Você', 'Jogador 4', 'Jogador 3', 'Jogador 2'];
    embaralhadorIndex = Math.floor(Math.random() * 4);
    const embaralhador = nomesJogadores[embaralhadorIndex];
    embaralhadorSpan.textContent = embaralhador;
    
    const parceiroIndex = (embaralhadorIndex + 2) % 4;
    const parceiro = nomesJogadores[parceiroIndex];
    
    distribuidorIndex = (parceiroIndex + 3) % 4;
    const distribuidor = nomesJogadores[distribuidorIndex];
    distribuidorSpan.textContent = distribuidor;
    
    document.querySelectorAll('.modal-secao h3')[1].innerHTML = `${parceiro} corta o baralho:`;
    
    if (parceiroIndex === 0) {
        corteSlider.addEventListener('input', (e) => {
            posicaoCorteEscolhida = parseInt(e.target.value);
            valorCorteSpan.textContent = posicaoCorteEscolhida;
        });
    } else {
        secaoCorte.style.display = 'none';
        posicaoCorteEscolhida = Math.floor(Math.random() * 39) + 1;
    }
    
    if (distribuidorIndex === 0) {
        botoesTrunfo.forEach(btn => {
            btn.addEventListener('click', () => {
                botoesTrunfo.forEach(b => {
                    b.style.background = 'rgba(0, 0, 0, 0.3)';
                    b.style.color = '#fff';
                });
                
                btn.style.background = '#ffd700';
                btn.style.color = '#1e4820';
                
                trunfoPosicaoEscolhida = btn.dataset.posicao;
                btnIniciar.disabled = false;
            });
        });
    } else {
        secaoTrunfo.style.display = 'none';
        trunfoPosicaoEscolhida = Math.random() > 0.5 ? 'cima' : 'baixo';
        
        setTimeout(() => {
            btnIniciar.disabled = false;
            btnIniciar.textContent = `${distribuidor} tirou trunfo- Iniciar`;
        }, 1000);
    }
    
    btnIniciar.addEventListener('click', () => {
        if (trunfoPosicaoEscolhida) {
            renderizarJogo();
        }
    });
}

window.addEventListener('load', inicializarInterface);
