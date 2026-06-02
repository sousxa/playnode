
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY;
// Detecta se a chave é válida (não é o placeholder padrão)
const hasValidKey = !!apiKey && apiKey !== 'PLACEHOLDER_API_KEY';

const ai = hasValidKey ? new GoogleGenAI({ apiKey }) : null;

// --- Conteúdo de fallback (usado quando não há API key válida ou a IA falha) ---

const FALLBACK_WORDS: Record<string, string[]> = {
  animais: ['ELEFANTE', 'GIRAFA', 'PINGUIM', 'TUBARÃO', 'CAMALEÃO'],
  comidas: ['LASANHA', 'BRIGADEIRO', 'FEIJOADA', 'SUSHI', 'PIZZA'],
  filmes: ['MATRIX', 'TITANIC', 'VINGADORES', 'CIDADE DE DEUS', 'CORINGA'],
  esportes: ['FUTEBOL', 'VÔLEI', 'SURFE', 'BOXE', 'NATAÇÃO'],
  países: ['JAPÃO', 'BRASIL', 'EGITO', 'CANADÁ', 'ITÁLIA'],
  objetos: ['GUARDA-CHUVA', 'TELESCÓPIO', 'BÚSSOLA', 'VIOLÃO', 'ABAJUR'],
  profissões: ['BOMBEIRO', 'ASTRONAUTA', 'DENTISTA', 'CHEF', 'PILOTO'],
};

const FALLBACK_CHARACTERS = [
  'Pelé', 'Madonna', 'Batman', 'Harry Potter', 'Xuxa', 'Albert Einstein',
  'Mickey Mouse', 'Neymar', 'Cleópatra', 'Homem-Aranha', 'Anitta', 'Sherlock Holmes',
];

const FALLBACK_DILEMMAS = [
  {
    scenario: 'Você encontra uma carteira com R$ 1.000 e a identidade do dono. O que faz?',
    optionA: 'Devolve tudo, mesmo sem recompensa.',
    optionB: 'Fica com o dinheiro e descarta a carteira.',
  },
  {
    scenario: 'Seu melhor amigo te conta um segredo que pode magoar outra pessoa querida. Você...',
    optionA: 'Guarda o segredo e fica em silêncio.',
    optionB: 'Conta para a pessoa afetada.',
  },
  {
    scenario: 'Poderia ter superpoderes, mas perderia a memória de toda a sua infância.',
    optionA: 'Aceita os poderes e esquece a infância.',
    optionB: 'Recusa e mantém suas memórias.',
  },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateImpostorContent = async (category: string): Promise<string> => {
  const fallback = () => pick(FALLBACK_WORDS[category] || FALLBACK_WORDS.objetos);

  if (!ai) return fallback();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma palavra secreta para o jogo 'O Impostor'. A categoria é: ${category}. Retorne apenas a palavra secreta em português.`,
      config: {
        temperature: 0.9,
      },
    });
    return response.text.trim().toUpperCase();
  } catch (e) {
    console.warn('[geminiService] Falha na IA, usando fallback (Impostor):', e);
    return fallback();
  }
};

export const generateWhoAmICharacters = async (count: number, theme: string): Promise<string[]> => {
  const fallback = () => {
    // Embaralha e pega `count` personagens
    const shuffled = [...FALLBACK_CHARACTERS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  if (!ai) return fallback();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere ${count} nomes de personagens famosos (reais ou ficção) para o jogo 'Quem Sou Eu'. O tema é: ${theme}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.warn('[geminiService] Falha na IA, usando fallback (Quem Sou Eu):', e);
    return fallback();
  }
};

export const generateDilemma = async (): Promise<{ scenario: string; optionA: string; optionB: string }> => {
  if (!ai) return pick(FALLBACK_DILEMMAS);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Crie um dilema moral ou engraçado com duas opções difíceis para um grupo de amigos votarem.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING },
            optionA: { type: Type.STRING },
            optionB: { type: Type.STRING }
          },
          required: ["scenario", "optionA", "optionB"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.warn('[geminiService] Falha na IA, usando fallback (Dilema):', e);
    return pick(FALLBACK_DILEMMAS);
  }
};
