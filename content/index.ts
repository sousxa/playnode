import impostorJson from './impostor.json';
import whoAmIJson from './quemsoueu.json';
import dilemmasJson from './dilemmas.json';

// ── Impostor ──
export interface ImpostorItem {
  word: string;
  difficulty?: string;
  hints: string[];
}
export interface ImpostorCategory {
  id: string;
  label: string;
  items: ImpostorItem[];
}
export interface ImpostorContent {
  game: string;
  version: string;
  categories: ImpostorCategory[];
}

// ── Quem Sou Eu ──
export interface WhoAmIItem {
  name: string;
  tags?: string[];
  difficulty?: string;
}
export interface WhoAmICategory {
  id: string;
  label: string;
  icon?: string;
  items: WhoAmIItem[];
}
export interface WhoAmIContent {
  game: string;
  version: string;
  categories: WhoAmICategory[];
}

// ── Dilemas ──
export interface DilemmaItem {
  id: string;
  scenario: string;
  optionA: string;
  optionB: string;
  alcoholic: boolean;
}
export interface DilemmasContent {
  game: string;
  version: string;
  items: DilemmaItem[];
}

export const impostorContent = impostorJson as ImpostorContent;
export const whoAmIContent = whoAmIJson as WhoAmIContent;
export const dilemmasContent = dilemmasJson as DilemmasContent;
