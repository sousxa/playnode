/** Embaralha um array (Fisher–Yates). Não muta o original. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Escolhe um item aleatório do array. */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Escolhe N itens distintos aleatórios (ou todos, se N >= tamanho). */
export function sampleN<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
