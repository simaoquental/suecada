export const VALORES_SUECA = [
  { nome: 'ace', ordem: 10, pontos: 11 }, { nome: '7', ordem: 9, pontos: 10 },
  { nome: 'king', ordem: 8, pontos: 4 }, { nome: 'jack', ordem: 7, pontos: 3 },
  { nome: 'queen', ordem: 6, pontos: 2 }, { nome: '6', ordem: 5, pontos: 0 },
  { nome: '5', ordem: 4, pontos: 0 }, { nome: '4', ordem: 3, pontos: 0 },
  { nome: '3', ordem: 2, pontos: 0 }, { nome: '2', ordem: 1, pontos: 0 }
];

export function criarBaralho() {
  const naipes = ['hearts', 'diamonds', 'clubs', 'spades'];
  const baralho = [];
  naipes.forEach(naipe => {
    VALORES_SUECA.forEach(v => {
      baralho.push({ 
        valor: v.nome, 
        naipe, 
        ordem: v.ordem, 
        pontos: v.pontos, 
        imagem: `${v.nome}_of_${naipe}.svg` 
      });
    });
  });
  return baralho;
}

export function baralhar(cartas) {
  let b = [...cartas];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function distribuir(baralho, escolha, quemDa, indiceCorte = 20) {
  // Aplicar o Corte Real: Divide o baralho no índice escolhido e inverte as partes
  const parteDeCima = baralho.slice(0, indiceCorte);
  const parteDeBaixo = baralho.slice(indiceCorte);
  const baralhoCortado = [...parteDeBaixo, ...parteDeCima];

  const maos = [[], [], [], []];
  let cartas = [...baralhoCortado];
  
  // Trunfo baseado no baralho já cortado
  let trunfo = (escolha === 'primeira') ? cartas[0] : cartas[39];
  const ordem = [(quemDa + 1) % 4, (quemDa + 2) % 4, (quemDa + 3) % 4, quemDa];

  ordem.forEach(idx => {
    const monte = cartas.splice(0, 10);
    maos[idx] = monte.map((c, i) => ({
      ...c, 
      id: `p${idx}-${i}-${Math.random().toString(36).substr(2, 5)}`
    }));
  });
  
  return { maos, trunfo };
}

export function determinarVencedor(mesa, trunfoNaipe, naipePuxado) {
  let vencedorIdx = 0;
  let melhorCarta = null;

  mesa.forEach((carta, i) => {
    if (!carta) return;
    if (!melhorCarta) {
      melhorCarta = carta;
      vencedorIdx = i;
      return;
    }
    const eTrunfo = carta.naipe === trunfoNaipe;
    const melhorETrunfo = melhorCarta.naipe === trunfoNaipe;

    if (eTrunfo && !melhorETrunfo) {
      melhorCarta = carta;
      vencedorIdx = i;
    } else if (eTrunfo === melhorETrunfo) {
      if (carta.naipe === melhorCarta.naipe) {
        if (carta.ordem > melhorCarta.ordem) {
          melhorCarta = carta;
          vencedorIdx = i;
        }
      } else if (carta.naipe === naipePuxado && melhorCarta.naipe !== trunfoNaipe) {
          // Mantém a melhor carta se a nova não for trunfo nem do naipe puxado
      }
    }
  });
  return vencedorIdx;
}

export function calcularPontos(vaza) {
  return vaza.reduce((acc, c) => acc + (c.pontos || 0), 0);
}