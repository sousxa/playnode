/**
 * Tipos compartilhados do motor de jogo (engine).
 *
 * A mesma engine roda no passa-e-joga (single-device) e, no futuro, no
 * multiplayer (Firebase). `getPlayerView` filtra os dados privados de cada
 * jogador — no single-device decide o que a CoverScreen revela; no online
 * decide o que cada cliente recebe.
 */

export type IntensityLevel = 'leve' | 'medio' | 'pesado';

export interface Player {
  id: string;
  name: string;
}

export interface GameConfig {
  players: Player[];
  /** Conteúdo adulto opt-in (OFF por padrão). */
  alcoholicMode: boolean;
  intensityLevel?: IntensityLevel;
  rounds?: number;
  /** Categoria escolhida (id) ou 'all' para misturar. */
  categoryId?: string;
  /** Nº de impostores (jogo do Impostor). */
  impostorCount?: number;
  /** Categorias escolhidas para o Stop. */
  stopCategories?: string[];
  /** Segundos de votação por categoria no Stop (online). */
  stopVoteSeconds?: number;
}

/**
 * Contrato que toda engine de jogo implementa. `S` = estado do jogo,
 * `A` = união das ações possíveis.
 */
export interface GameEngine<S, A> {
  /** Cria o estado inicial a partir da config da partida. */
  init(config: GameConfig): S;
  /** Função pura: aplica uma ação e devolve o novo estado. */
  reducer(state: S, action: A): S;
  /** O jogo terminou? */
  isOver(state: S): boolean;
  /** Vencedor(es), ou null se não houver. */
  getWinner(state: S): Player | Player[] | null;
  /** Devolve uma cópia do estado sem os dados privados que `playerId` não pode ver. */
  getPlayerView(state: S, playerId: string): S;
}
