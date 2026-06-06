import { impostorContent, whoAmIContent } from '../content';
import { GameMode } from '../types';

export interface CategoryOption {
  id: string;
  label: string;
  icon?: string;
}

const IMPOSTOR_ICONS: Record<string, string> = {
  objetos: '📦', lugares: '📍', acoes: '🎬', pessoas: '🧑',
  comida_bebida: '🍕', tecnologia: '📱', profissoes: '👔', entretenimento: '🎭',
  cotidiano: '🌞', sentimentos: '❤️', viagem: '✈️', esportes: '⚽',
};

/** Categorias abstratas que rendem rodadas fracas no Impostor (excluídas do "Misturar"). */
export const IMPOSTOR_WEAK = ['sentimentos', 'acoes', 'cotidiano'];

export const impostorCategories: CategoryOption[] = impostorContent.categories.map((c) => ({
  id: c.id,
  label: c.label,
  icon: IMPOSTOR_ICONS[c.id] ?? '🎲',
}));

export const whoAmICategories: CategoryOption[] = whoAmIContent.categories.map((c) => ({
  id: c.id,
  label: c.label,
  icon: c.icon,
}));

export interface GameConfigSchema {
  /** Mostra seletor de categoria com estas opções. */
  categories?: CategoryOption[];
  /** Rounds configuráveis: [min, max, default, label]. */
  rounds?: { min: number; max: number; default: number; label: string };
  /** Nº de impostores configurável. */
  impostorCount?: boolean;
  /** Tem modo alcoólico. */
  alcoholic?: boolean;
  /** Seletor de intensidade (leve/médio/pesado). */
  intensity?: boolean;
  /** Multi-seleção das categorias do Stop. */
  stopCategories?: boolean;
  /** Modos do Quem Sou Eu (seletor segmentado). */
  whoAmIModes?: { id: 'classic' | 'roda'; label: string; desc: string }[];
}

export const GAME_CONFIG_SCHEMA: Record<string, GameConfigSchema> = {
  [GameMode.IMPOSTOR]: {
    categories: impostorCategories,
    rounds: { min: 1, max: 8, default: 3, label: 'Rodadas' },
    impostorCount: true,
  },
  [GameMode.QUEM_SOU_EU]: {
    categories: whoAmICategories,
    whoAmIModes: [
      { id: 'classic', label: 'Um por vez', desc: 'Cada um resolve o seu na sua vez, depois passa.' },
      { id: 'roda', label: 'Roda', desc: 'Todos têm personagem ao mesmo tempo; a vez gira e você fica no seu até acertar.' },
    ],
  },
  [GameMode.DILEMAS]: {
    rounds: { min: 3, max: 12, default: 6, label: 'Dilemas' },
    alcoholic: true,
  },
  [GameMode.AMIGOS_DE_MERDA]: {
    rounds: { min: 3, max: 15, default: 6, label: 'Perguntas' },
    alcoholic: true,
  },
  [GameMode.VERDADE_OU_DESAFIO]: {
    rounds: { min: 4, max: 20, default: 10, label: 'Rodadas' },
    intensity: true,
    alcoholic: true,
  },
  [GameMode.CARTAS_PODRES]: {
    rounds: { min: 3, max: 15, default: 8, label: 'Rodadas' },
  },
  [GameMode.STOP]: {
    rounds: { min: 3, max: 10, default: 5, label: 'Rodadas' },
    stopCategories: true,
  },
  [GameMode.CIDADE_DORME]: {},
  [GameMode.UNO_NO_MERCY]: {},
};

export const GAME_TITLES: Record<string, string> = {
  [GameMode.IMPOSTOR]: 'O Impostor',
  [GameMode.QUEM_SOU_EU]: 'Quem Sou Eu?',
  [GameMode.DILEMAS]: 'Dilemas',
  [GameMode.AMIGOS_DE_MERDA]: 'Amigos de Merda',
  [GameMode.VERDADE_OU_DESAFIO]: 'Verdade ou Desafio',
  [GameMode.CARTAS_PODRES]: 'Cartas Podres',
  [GameMode.STOP]: 'Stop!',
  [GameMode.CIDADE_DORME]: 'A Cidade Dorme',
  [GameMode.UNO_NO_MERCY]: 'Uno No Mercy',
};

export interface GameInfo {
  emoji: string;
  tagline: string;
  players: string;
  howTo: string[];
}

export const GAME_INFO: Record<string, GameInfo> = {
  [GameMode.IMPOSTOR]: {
    emoji: '🕵️',
    tagline: 'Blefe e descubra quem não sabe a palavra.',
    players: '3+ jogadores',
    howTo: [
      'Todos recebem a mesma palavra secreta — menos o impostor, que recebe só uma dica vaga.',
      'Cada um dá uma pista sobre a palavra, sem entregar de graça.',
      'Depois, todos votam em quem acham que é o impostor.',
      'Se for pego, o impostor ainda pode tentar adivinhar a palavra para roubar a vitória.',
    ],
  },
  [GameMode.QUEM_SOU_EU]: {
    emoji: '🎭',
    tagline: 'Adivinhe qual personagem você é.',
    players: '2+ jogadores',
    howTo: [
      'Cada um recebe um personagem secreto (sem ver o próprio).',
      'Na sua vez, vire o aparelho para a galera ver e dê pistas.',
      'Você faz perguntas de "sim ou não" para adivinhar quem é.',
      'Modo "Um por vez": cada um resolve o seu na vez. Modo "Roda": todos têm personagem, a vez gira e você fica no seu até acertar (quem acerta com mais gente travada pontua mais).',
    ],
  },
  [GameMode.DILEMAS]: {
    emoji: '🔥',
    tagline: 'Escolhas impossíveis que revelam a galera.',
    players: '2+ jogadores',
    howTo: [
      'Aparece um dilema com duas opções (A ou B).',
      'Cada um vota em segredo na sua opção.',
      'No fim, o resultado mostra como o grupo se dividiu.',
      'Sem resposta certa — é só pra gerar treta saudável. 😈',
    ],
  },
  [GameMode.AMIGOS_DE_MERDA]: {
    emoji: '💀',
    tagline: 'Quem é mais provável de... ?',
    players: '3+ jogadores',
    howTo: [
      'Aparece uma pergunta tipo "quem é mais capaz de...".',
      'Cada um vota em segredo em alguém do grupo.',
      'O reveal mostra quem levou mais votos na pergunta.',
      'No fim, sai o ranking do "pior do grupo". 😬',
    ],
  },
  [GameMode.VERDADE_OU_DESAFIO]: {
    emoji: '🌶️',
    tagline: 'O clássico ousado, com níveis de intensidade.',
    players: '2+ jogadores',
    howTo: [
      'Na sua vez, escolha Verdade ou Desafio.',
      'O app sorteia uma carta do nível que vocês configuraram.',
      'Cumpriu? Passa pro próximo.',
      'Tem modo alcoólico opcional pra deixar mais pesado. 🍻',
    ],
  },
  [GameMode.CARTAS_PODRES]: {
    emoji: '🃏',
    tagline: 'Complete a frase mais sem noção.',
    players: '3+ jogadores',
    howTo: [
      'A cada rodada, um jogador é o Juiz e lê uma carta preta com lacuna.',
      'Os outros escolhem em segredo uma carta branca da própria mão.',
      'O Juiz lê todas em voz alta e escolhe a mais engraçada.',
      'Quem foi escolhido ganha o ponto. O Juiz gira a cada rodada.',
    ],
  },
  [GameMode.STOP]: {
    emoji: '⏱️',
    tagline: 'Stop / Adedonha contra o relógio.',
    players: '2+ jogadores',
    howTo: [
      'Sorteamos uma letra e mostramos as categorias.',
      'Todos preenchem uma palavra de cada categoria com aquela letra.',
      'Quem terminar grita STOP (ou o tempo acaba).',
      'Confiram juntos: resposta única vale mais que repetida.',
    ],
  },
  [GameMode.CIDADE_DORME]: {
    emoji: '🌙',
    tagline: 'Dedução social: ache o assassino.',
    players: '4+ jogadores',
    howTo: [
      'Cada um recebe um papel secreto (Assassino, Médico, Detetive ou Cidadão).',
      'À noite, o assassino escolhe uma vítima, o médico salva alguém e o detetive investiga.',
      'De dia, a cidade discute e vota em quem eliminar.',
      'A cidade vence se pegar o assassino; o assassino vence se sobrar.',
    ],
  },
  [GameMode.UNO_NO_MERCY]: {
    emoji: '🃏',
    tagline: 'O Uno sem dó: +10, descartar cor e eliminação aos 25.',
    players: '2+ jogadores',
    howTo: [
      'Combine cor, número ou tipo com a carta do topo — ou jogue um coringa.',
      'Cartas de compra EMPILHAM: quem não devolver leva o total na cara.',
      'Cartas brutais: +6, +10, "Descartar cor" (joga fora toda uma cor) e "Pular todos".',
      'Regra da misericórdia: chegou a 25 cartas, você é ELIMINADO. Vence quem zerar a mão.',
    ],
  },
};
