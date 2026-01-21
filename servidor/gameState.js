export function criarEstadoJogo() {
  return {
    jogadores: [],        
    maos: [[], [], [], []],
    cartasNaMesa: [null, null, null, null],
    trunfo: null,
    trunfoNaipe: null,
    naipePuxado: null,
    jogadorAtual: 0,
    pontosNos: 0,
    pontosEles: 0,
    rodada: 0
  };
}
