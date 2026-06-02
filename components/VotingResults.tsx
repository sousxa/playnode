import React from 'react';
import Button from './Button';
import { VotingSummary, VotingSession, VoteOption } from '../types';

interface VotingResultsProps {
  summary: VotingSummary;
  session: VotingSession;
  players: Array<{ id: string; name: string }>;
  onContinue?: () => void;
  onNewVote?: () => void;
}

const VotingResults: React.FC<VotingResultsProps> = ({
  summary,
  session,
  players,
  onContinue,
  onNewVote
}) => {
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Jogador Desconhecido';
  };

  const getOptionLabel = (optionId: string) => {
    const option = session.options.find(opt => opt.id === optionId);
    return option ? option.label : 'Opção Desconhecida';
  };

  const renderWinner = () => {
    if (summary.isTie) {
      return (
        <div className="text-center space-y-2">
          <div className="text-4xl">🤝</div>
          <h3 className="text-2xl font-black text-amber-600">EMPATE!</h3>
          <p className="text-amber-700">
            As seguintes opções empataram:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {summary.tieOptions?.map(optionId => (
              <span key={optionId} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                {getOptionLabel(optionId)}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (summary.winner) {
      return (
        <div className="text-center space-y-2">
          <div className="text-4xl">🏆</div>
          <h3 className="text-2xl font-black text-green-600">VENCEDOR!</h3>
          <p className="text-xl font-bold text-green-700">
            {getOptionLabel(summary.winner)}
          </p>
        </div>
      );
    }

    return (
      <div className="text-center space-y-2">
        <div className="text-4xl">❓</div>
        <h3 className="text-2xl font-black text-gray-600">Sem Vencedor</h3>
        <p className="text-gray-700">Nenhum voto foi registrado</p>
      </div>
    );
  };

  const renderDetailedResults = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-indigo-950">Resultados Detalhados</h4>
        {summary.results
          .sort((a, b) => b.count - a.count) // Ordenar por votos (decrescente)
          .map(result => {
            const option = session.options.find(opt => opt.id === result.optionId);
            if (!option) return null;

            const isWinner = summary.winner === result.optionId;
            const isTie = summary.tieOptions?.includes(result.optionId);

            return (
              <div
                key={result.optionId}
                className={`p-4 rounded-xl border-2 ${
                  isWinner
                    ? 'bg-green-50 border-green-300'
                    : isTie
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white border-indigo-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-900">{option.label}</span>
                    {isWinner && <span className="text-green-600">🏆</span>}
                    {isTie && <span className="text-amber-600">🤝</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-950">
                      {result.count} {result.count === 1 ? 'voto' : 'votos'}
                    </div>
                    <div className="text-sm text-indigo-600">
                      {result.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="w-full bg-indigo-100 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isWinner
                        ? 'bg-green-500'
                        : isTie
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>

                {/* Mostrar votantes */}
                {result.voters.length > 0 && (
                  <div className="text-xs text-indigo-500">
                    Votado por: {result.voters.map(id => getPlayerName(id)).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Resultado principal */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-dashed border-indigo-100 shadow-inner">
        {renderWinner()}
      </div>

      {/* Estatísticas */}
      <div className="text-center space-y-2">
        <div className="text-sm text-indigo-600">
          Total de votos: <span className="font-bold">{summary.totalVotes}</span>
        </div>
        <div className="text-sm text-indigo-600">
          Total de participantes: <span className="font-bold">{players.length}</span>
        </div>
        <div className="text-sm text-indigo-600">
          Abstenções: <span className="font-bold">{players.length - summary.totalVotes}</span>
        </div>
      </div>

      {/* Resultados detalhados */}
      {renderDetailedResults()}

      {/* Ações */}
      <div className="flex gap-4 pt-4 border-t border-indigo-200">
        {onContinue && (
          <Button onClick={onContinue} className="flex-1">
            Continuar Jogo
          </Button>
        )}
        {onNewVote && (
          <Button onClick={onNewVote} variant="secondary" className="flex-1">
            Nova Votação
          </Button>
        )}
      </div>
    </div>
  );
};

export default VotingResults;