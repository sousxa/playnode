// "Salas recentes": guarda no aparelho as últimas salas ONLINE em que o jogador
// entrou (código + nome usado), pra reentrar rápido se sair/cair sem querer.
// Os pontos ficam salvos no servidor (ranking da sala por uid) — voltar com a
// mesma identidade recupera a pontuação.

export interface RecentRoom {
  code: string;
  name: string;
  ts: number;
}

const KEY = 'catdecks_recent';
const MAX = 5;

export function getRecentRooms(): RecentRoom[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentRoom(code: string, name: string): void {
  const list = getRecentRooms().filter((r) => r.code !== code);
  list.unshift({ code, name, ts: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function removeRecentRoom(code: string): void {
  localStorage.setItem(KEY, JSON.stringify(getRecentRooms().filter((r) => r.code !== code)));
}
