/**
 * Tipos globais do app. A arquitetura nova vive em `engine/types.ts` (GameEngine,
 * Player, GameConfig). Aqui fica só o enum de modos de jogo, usado pra rotear telas.
 */
export enum GameMode {
  IMPOSTOR = 'IMPOSTOR',
  QUEM_SOU_EU = 'QUEM_SOU_EU',
  DILEMAS = 'DILEMAS',
  AMIGOS_DE_MERDA = 'AMIGOS_DE_MERDA',
  VERDADE_OU_DESAFIO = 'VERDADE_OU_DESAFIO',
  CARTAS_PODRES = 'CARTAS_PODRES',
  STOP = 'STOP',
  CIDADE_DORME = 'CIDADE_DORME',
  UNO_NO_MERCY = 'UNO_NO_MERCY'
}
