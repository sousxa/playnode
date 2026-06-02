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
}

export const GAME_CONFIG_SCHEMA: Record<string, GameConfigSchema> = {
  [GameMode.IMPOSTOR]: {
    categories: impostorCategories,
    rounds: { min: 1, max: 8, default: 3, label: 'Rodadas' },
    impostorCount: true,
  },
  [GameMode.QUEM_SOU_EU]: {
    categories: whoAmICategories,
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
};

export const GAME_TITLES: Record<string, string> = {
  [GameMode.IMPOSTOR]: 'O Impostor',
  [GameMode.QUEM_SOU_EU]: 'Quem Sou Eu?',
  [GameMode.DILEMAS]: 'Dilemas',
  [GameMode.AMIGOS_DE_MERDA]: 'Amigos de Merda',
  [GameMode.VERDADE_OU_DESAFIO]: 'Verdade ou Desafio',
  [GameMode.CARTAS_PODRES]: 'Cartas Podres',
};
