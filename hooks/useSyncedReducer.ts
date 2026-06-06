import { useEffect, useRef, useState } from 'react';
import { firebaseSyncService } from '../services/firebaseSync';

interface SyncOpts {
  online?: boolean;
  roomCode?: string;
  isHost?: boolean;
}

/**
 * Reducer de jogo que funciona local (mesmo aparelho) ou ONLINE (estado no
 * Firebase, compartilhado entre os celulares). No online, o HOST cria o estado
 * inicial e transmite; qualquer dispatch grava `reducer(estado, ação)` no RTDB
 * e todos recebem em tempo real. Estado começa `null` no online até o host criar.
 */
export function useSyncedReducer<S, A>(
  reducer: (s: S, a: A) => S,
  init: () => S,
  { online, roomCode, isHost }: SyncOpts,
): { state: S | null; dispatch: (a: A) => void; reset: () => void; resetRound: () => void } {
  const [state, setState] = useState<S | null>(() => (online ? null : init()));
  const ref = useRef<S | null>(state);
  ref.current = state;

  useEffect(() => {
    if (!online || !roomCode) return;
    let hostInitialized = false;
    const unsub = firebaseSyncService.onGameState(roomCode, (gs) => {
      if (gs) {
        // O Firebase descarta objetos/arrays vazios ({}, []). Mesclamos com o
        // template inicial para restaurar campos vazios (votes, answers, etc.)
        // e evitar "undefined" que quebra a tela.
        const merged = { ...init(), ...gs } as S;
        ref.current = merged;
        setState(merged);
      } else if (isHost && !hostInitialized) {
        hostInitialized = true;
        const initial = init();
        ref.current = initial;
        setState(initial);
        firebaseSyncService.updateGameState(roomCode, initial);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, roomCode]);

  const dispatch = (a: A) => {
    if (online && roomCode) {
      if (!ref.current) return;
      const before = ref.current;
      // Otimista: a UI responde na hora.
      const optimistic = reducer(before, a);
      ref.current = optimistic;
      setState(optimistic);
      // Atômico no servidor: aplica a ação SEMPRE sobre o estado mais recente
      // (não sobrescreve o estado inteiro). Evita perder votos quando 2+ pessoas
      // agem ao mesmo tempo — antes, um set() apagava o do outro e travava a votação.
      firebaseSyncService.transactGameState(roomCode, (cur: S | null) =>
        reducer(cur ? ({ ...init(), ...cur } as S) : before, a),
      );
    } else {
      setState((s) => reducer(s as S, a));
    }
  };

  // Aplica um estado novo (reinício) localmente e, se online, transmite. Só o host
  // pode reiniciar no online.
  const applyReset = (next: S) => {
    if (online && roomCode) {
      if (!isHost) return;
      ref.current = next;
      setState(next);
      firebaseSyncService.updateGameState(roomCode, next);
    } else {
      ref.current = next;
      setState(next);
    }
  };

  // Reinicia a PARTIDA do zero (zera pontos e tudo).
  const reset = () => applyReset(init());

  // Reinicia só a RODADA: estado fresco de uma partida nova, mas preservando os
  // pontos acumulados (campo `scores`, quando o jogo tiver). Serve pra "destravar"
  // sem perder o placar quando uma rodada bugou no meio.
  const resetRound = () => {
    const fresh = init() as any;
    const prev = ref.current as any;
    if (prev && fresh && typeof fresh.scores === 'object' && fresh.scores && typeof prev.scores === 'object') {
      fresh.scores = { ...fresh.scores, ...prev.scores };
    }
    applyReset(fresh as S);
  };

  return { state, dispatch, reset, resetRound };
}
