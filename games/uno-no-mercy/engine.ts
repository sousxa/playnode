import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { shuffle } from '../../engine/utils';

/**
 * UNO NO MERCY — a versão sem dó do Uno.
 * - Compras empilham (qualquer carta de compra empilha sobre outra; o total passa).
 * - Cartas brutais: +4 colorido, +6 e +10 coringa, "Descartar cor" e "Pular todos".
 * - Regra da misericórdia: chegou a 25 cartas, você é ELIMINADO.
 * - Vence quem zerar a mão (ou o último de pé).
 *
 * O estado completo vive no Firebase; getPlayerView esconde a mão dos outros só
 * na exibição (mesma "honra" dos outros jogos). Só o jogador da vez age.
 */

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type CardColor = UnoColor | 'wild';
export type CardKind =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'draw4'
  | 'discardAll'
  | 'skipAll'
  | 'wild'
  | 'wildDraw4'
  | 'wildDraw6'
  | 'wildDraw10';

export interface Card {
  id: string;
  color: CardColor;
  kind: CardKind;
  value?: number; // só para 'number'
}

export type UnoPhase = 'playing' | 'gameOver';

export interface UnoState {
  phase: UnoPhase;
  players: Player[];
  hands: Record<string, Card[]>;
  drawPile: Card[];
  discard: Card[]; // topo = último
  currentColor: UnoColor;
  turnIdx: number;
  direction: 1 | -1;
  pendingDraw: number; // pilha de compra acumulada
  eliminated: string[];
  winnerId: string | null;
  scores: Record<string, number>;
  mercyLimit: number;
  /** Mensagem curta do último evento (pra UI dar feedback). */
  log: string;
}

export type UnoAction =
  | { type: 'PLAY'; playerId: string; cardId: string; chosenColor?: UnoColor }
  | { type: 'DRAW'; playerId: string };

const COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
const START_HAND = 7;
const MERCY_LIMIT = 25;

export function isWild(kind: CardKind): boolean {
  return kind === 'wild' || kind === 'wildDraw4' || kind === 'wildDraw6' || kind === 'wildDraw10';
}

export function drawAmount(kind: CardKind): number {
  switch (kind) {
    case 'draw2': return 2;
    case 'draw4': return 4;
    case 'wildDraw4': return 4;
    case 'wildDraw6': return 6;
    case 'wildDraw10': return 10;
    default: return 0;
  }
}

export function isDrawCard(kind: CardKind): boolean {
  return drawAmount(kind) > 0;
}

/** Monta o baralho do No Mercy. */
function buildDeck(): Card[] {
  const deck: Card[] = [];
  let n = 0;
  const add = (c: Omit<Card, 'id'>) => deck.push({ ...c, id: `${c.color}-${c.kind}-${c.value ?? ''}-${n++}` });
  for (const color of COLORS) {
    add({ color, kind: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) { add({ color, kind: 'number', value: v }); add({ color, kind: 'number', value: v }); }
    add({ color, kind: 'skip' }); add({ color, kind: 'skip' });
    add({ color, kind: 'reverse' }); add({ color, kind: 'reverse' });
    add({ color, kind: 'draw2' }); add({ color, kind: 'draw2' });
    add({ color, kind: 'draw4' });
    add({ color, kind: 'discardAll' });
    add({ color, kind: 'skipAll' });
  }
  for (let i = 0; i < 4; i++) add({ color: 'wild', kind: 'wild' });
  for (let i = 0; i < 4; i++) add({ color: 'wild', kind: 'wildDraw4' });
  for (let i = 0; i < 2; i++) add({ color: 'wild', kind: 'wildDraw6' });
  for (let i = 0; i < 2; i++) add({ color: 'wild', kind: 'wildDraw10' });
  return deck;
}

export function initGame(config: GameConfig): UnoState {
  const players = config.players;
  let deck = shuffle(buildDeck());
  const hands: Record<string, Card[]> = {};
  for (const p of players) hands[p.id] = deck.splice(0, START_HAND);
  // Carta inicial: vira até cair um número (evita efeito logo de cara).
  let startIdx = deck.findIndex((c) => c.kind === 'number');
  if (startIdx < 0) startIdx = 0;
  const start = deck.splice(startIdx, 1)[0];
  return {
    phase: 'playing',
    players,
    hands,
    drawPile: deck,
    discard: [start],
    currentColor: start.color === 'wild' ? 'red' : start.color,
    turnIdx: 0,
    direction: 1,
    pendingDraw: 0,
    eliminated: [],
    winnerId: null,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    mercyLimit: MERCY_LIMIT,
    log: 'Jogo começou!',
  };
}

function topCard(s: UnoState): Card {
  return s.discard[s.discard.length - 1];
}

/** Pode jogar `card` agora? */
export function canPlay(card: Card, s: UnoState): boolean {
  // Com pilha de compra ativa: só vale empilhar outra carta de compra.
  if (s.pendingDraw > 0) return isDrawCard(card.kind);
  if (isWild(card.kind)) return true;
  if (card.color === s.currentColor) return true;
  const top = topCard(s);
  if (card.kind === 'number' && top.kind === 'number') return card.value === top.value;
  if (card.kind !== 'number' && card.kind === top.kind) return true;
  return false;
}

function isElim(s: UnoState, id: string): boolean {
  return s.eliminated.includes(id);
}

function activeCount(s: UnoState): number {
  return s.players.filter((p) => !isElim(s, p.id)).length;
}

/** Move `steps` jogadores ativos a partir do índice atual, na direção dada. */
function advanceFrom(s: UnoState, fromIdx: number, dir: 1 | -1, steps: number): number {
  const n = s.players.length;
  let idx = fromIdx;
  let moved = 0;
  let guard = 0;
  while (moved < steps && guard < n * 4) {
    idx = (idx + dir + n) % n;
    if (!isElim(s, s.players[idx].id)) moved++;
    guard++;
  }
  return idx;
}

/** Reabastece o monte com o descarte (menos o topo) embaralhado, se acabar. */
function ensureDraw(s: UnoState): void {
  if (s.drawPile.length === 0 && s.discard.length > 1) {
    const top = s.discard[s.discard.length - 1];
    const rest = s.discard.slice(0, -1);
    s.drawPile = shuffle(rest);
    s.discard = [top];
  }
}

/** Tira `count` cartas do monte pra mão do jogador. */
function drawTo(s: UnoState, playerId: string, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    ensureDraw(s);
    const c = s.drawPile.shift();
    if (!c) break;
    s.hands[playerId] = [...s.hands[playerId], c];
    drawn++;
  }
  return drawn;
}

function nameOf(s: UnoState, id: string): string {
  return s.players.find((p) => p.id === id)?.name ?? '?';
}

/** Aplica eliminação por misericórdia e checa fim por sobrevivente único. */
function checkMercyAndSurvivor(s: UnoState): void {
  for (const p of s.players) {
    if (!isElim(s, p.id) && (s.hands[p.id]?.length ?? 0) >= s.mercyLimit) {
      s.eliminated = [...s.eliminated, p.id];
      s.log = `💀 ${nameOf(s, p.id)} chegou a ${s.mercyLimit} cartas e foi ELIMINADO!`;
    }
  }
  if (activeCount(s) === 1 && s.phase !== 'gameOver') {
    const survivor = s.players.find((p) => !isElim(s, p.id));
    if (survivor) finishGame(s, survivor.id, `🏆 ${nameOf(s, survivor.id)} sobrou e venceu!`);
  }
}

function finishGame(s: UnoState, winnerId: string, log: string): void {
  s.phase = 'gameOver';
  s.winnerId = winnerId;
  s.scores = { ...s.scores, [winnerId]: (s.scores[winnerId] ?? 0) + s.players.length };
  s.log = log;
}

export function reducer(state: UnoState, action: UnoAction): UnoState {
  if (state.phase === 'gameOver') return state;
  const current = state.players[state.turnIdx];
  if (!current || action.playerId !== current.id || isElim(state, current.id)) return state;

  // Cópia mutável de trabalho (clonando o necessário).
  const s: UnoState = {
    ...state,
    hands: { ...state.hands },
    discard: [...state.discard],
    drawPile: [...state.drawPile],
  };
  s.hands[current.id] = [...state.hands[current.id]];

  if (action.type === 'DRAW') {
    if (s.pendingDraw > 0) {
      const took = drawTo(s, current.id, s.pendingDraw);
      s.log = `${nameOf(s, current.id)} comprou ${took} carta(s) da pilha!`;
      s.pendingDraw = 0;
    } else {
      drawTo(s, current.id, 1);
      s.log = `${nameOf(s, current.id)} comprou 1 carta.`;
    }
    checkMercyAndSurvivor(s);
    if (s.phase === 'gameOver') return s;
    s.turnIdx = advanceFrom(s, s.turnIdx, s.direction, 1);
    return s;
  }

  // PLAY
  const hand = s.hands[current.id];
  const card = hand.find((c) => c.id === action.cardId);
  if (!card) return state;
  if (!canPlay(card, s)) return state;

  // Remove da mão e descarta.
  s.hands[current.id] = hand.filter((c) => c.id !== card.id);
  s.discard = [...s.discard, card];

  // Cor ativa.
  if (isWild(card.kind)) {
    s.currentColor = action.chosenColor ?? COLORS[Math.floor(Math.random() * 4)];
  } else {
    s.currentColor = card.color as UnoColor;
  }

  // Venceu? (zerou a mão)
  if (s.hands[current.id].length === 0) {
    finishGame(s, current.id, `🏆 ${nameOf(s, current.id)} zerou a mão e venceu!`);
    return s;
  }

  const label = nameOf(s, current.id);
  let skipSteps = 1; // quantos ativos pular ao final

  switch (card.kind) {
    case 'draw2':
    case 'draw4':
    case 'wildDraw4':
    case 'wildDraw6':
    case 'wildDraw10': {
      s.pendingDraw += drawAmount(card.kind);
      s.log = `${label} jogou +${drawAmount(card.kind)}! Pilha agora: ${s.pendingDraw}. 😈`;
      skipSteps = 1; // passa pro próximo, que responde ou compra
      break;
    }
    case 'skip':
      s.log = `${label} pulou o próximo! ⏭️`;
      skipSteps = 2;
      break;
    case 'reverse':
      s.direction = (s.direction * -1) as 1 | -1;
      s.log = `${label} inverteu a ordem! 🔄`;
      skipSteps = activeCount(s) <= 2 ? 2 : 1; // em 2, inverter = pular
      break;
    case 'skipAll':
      s.log = `${label} PULOU TODOS e joga de novo! 🌀`;
      skipSteps = 0; // volta pra ele
      break;
    case 'discardAll': {
      const color = card.color as UnoColor;
      const toDump = s.hands[current.id].filter((c) => c.color === color);
      if (toDump.length) {
        s.hands[current.id] = s.hands[current.id].filter((c) => c.color !== color);
        s.discard = [...s.discard, ...toDump];
        // Rechecar vitória após o despejo.
        if (s.hands[current.id].length === 0) {
          finishGame(s, current.id, `🏆 ${label} despejou tudo e venceu!`);
          return s;
        }
      }
      s.log = `${label} descartou todas as cartas ${colorPt(color)}! 🗑️ (${toDump.length})`;
      skipSteps = 1;
      break;
    }
    default: // number / wild simples
      s.log = `${label} jogou ${cardLabel(card)}.`;
      skipSteps = 1;
  }

  s.turnIdx = advanceFrom(s, s.turnIdx, s.direction, skipSteps);
  return s;
}

export function colorPt(c: CardColor): string {
  return { red: 'vermelhas', yellow: 'amarelas', green: 'verdes', blue: 'azuis', wild: 'coringa' }[c];
}

export function cardLabel(card: Card): string {
  if (card.kind === 'number') return String(card.value);
  return {
    skip: 'Pular', reverse: 'Inverter', draw2: '+2', draw4: '+4',
    discardAll: 'Descartar cor', skipAll: 'Pular todos',
    wild: 'Coringa', wildDraw4: '+4 coringa', wildDraw6: '+6 coringa', wildDraw10: '+10 coringa',
    number: '',
  }[card.kind];
}

export const unoEngine: GameEngine<UnoState, UnoAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => s.players.find((p) => p.id === s.winnerId) ?? null,
  // Esconde a mão dos outros (só exibição). As contagens a UI deriva do estado completo.
  getPlayerView: (s, playerId) => {
    const hands: Record<string, Card[]> = {};
    for (const p of s.players) hands[p.id] = p.id === playerId ? (s.hands[p.id] ?? []) : [];
    return { ...s, hands };
  },
};
