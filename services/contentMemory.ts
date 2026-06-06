// Memória de conteúdo entre PARTIDAS (no aparelho): lembra o que já saiu nas
// últimas rodadas pra evitar repetir as mesmas perguntas/palavras/cartas logo
// em seguida. Dentro de uma partida cada jogo já evita repetir; isto cuida do
// "abri de novo e veio a mesma coisa".

const enabled = typeof window !== 'undefined' && !!window.localStorage;

function read(key: string): string[] {
  if (!enabled) return [];
  try {
    const v = JSON.parse(localStorage.getItem('seen_' + key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** O que saiu recentemente (mais antigos primeiro). */
export function getSeen(key: string): string[] {
  return read(key);
}

/** Marca itens como vistos (janela rolante, mantém os últimos `cap`). */
export function markSeen(key: string, items: string[], cap = 120): void {
  if (!enabled || !items.length) return;
  const next = read(key).filter((x) => !items.includes(x)).concat(items);
  try {
    localStorage.setItem('seen_' + key, JSON.stringify(next.slice(-cap)));
  } catch {
    /* cota cheia / indisponível: ignora */
  }
}
