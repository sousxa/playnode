import React from 'react';
import { GameMode } from '../types';
import type { GameConfig } from '../engine/types';
import Impostor from '../games/impostor/Impostor';
import QuemSouEu from '../games/quem-sou-eu/QuemSouEu';
import Dilemas from '../games/dilemas/Dilemas';
import AmigosDeMerda from '../games/amigos-de-merda/AmigosDeMerda';
import VerdadeOuDesafio from '../games/verdade-ou-desafio/VerdadeOuDesafio';
import CartasPodres from '../games/cartas-podres/CartasPodres';
import Stop from '../games/stop/Stop';
import CidadeDorme from '../games/cidade-dorme/CidadeDorme';

interface GameRoomProps {
  mode: GameMode;
  config: GameConfig;
  onExit: () => void;
  /** Reporta o placar do jogo para o ranking da sala (jogos competitivos). */
  onReportScores?: (scores: Record<string, number>) => void;
  /** Abre o ranking da sala. */
  onRanking?: () => void;
}

/** Renderiza o jogo escolhido, cada um com sua própria engine. */
const GameRoom: React.FC<GameRoomProps> = ({ mode, config, onExit, onReportScores, onRanking }) => {
  const scoreProps = { onReportScores, onRanking };
  switch (mode) {
    case GameMode.IMPOSTOR:
      return <Impostor config={config} onExit={onExit} {...scoreProps} />;
    case GameMode.QUEM_SOU_EU:
      return <QuemSouEu config={config} onExit={onExit} {...scoreProps} />;
    case GameMode.DILEMAS:
      return <Dilemas config={config} onExit={onExit} />;
    case GameMode.AMIGOS_DE_MERDA:
      return <AmigosDeMerda config={config} onExit={onExit} {...scoreProps} />;
    case GameMode.VERDADE_OU_DESAFIO:
      return <VerdadeOuDesafio config={config} onExit={onExit} />;
    case GameMode.CARTAS_PODRES:
      return <CartasPodres config={config} onExit={onExit} {...scoreProps} />;
    case GameMode.STOP:
      return <Stop config={config} onExit={onExit} />;
    case GameMode.CIDADE_DORME:
      return <CidadeDorme config={config} onExit={onExit} />;
    default:
      return null;
  }
};

export default GameRoom;
