import React, { useState, useEffect } from 'react';
import Button from './Button';
import { VotingSession, VotingResult, VoteType, VoteOption } from '../types';
import { socketService } from '../services/socket';

interface VotingInterfaceProps {
  session: VotingSession;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  onVoteCast?: (optionId: string) => void;
  onEndVoting?: () => void;
  isHost?: boolean;
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({
  session,
  playerId,
  players,
  onVoteCast,
  onEndVoting,
  isHost = false
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentResults, setCurrentResults] = useState<VotingResult[] | null>(null);

  // Verificar se o jogador já votou
  useEffect(() => {
    const playerVote = session.votes[playerId];
    if (playerVote) {
      setSelectedOption(playerVote);
      setHasVoted(true);
    }
  }, [session.votes, playerId]);

  // Atualizar resultados para votação aberta
  useEffect(() => {
    if (session.type === VoteType.OPEN && session.showResults) {
      const results = socketService.getVotingResults(session.id);
      setCurrentResults(results);
    }
  }, [session]);

  const handleVote = (optionId: string) => {
    if (hasVoted || !session.isActive) return;

    setSelectedOption(optionId);
    setHasVoted(true);

    // Enviar voto para o backend
    socketService.castVote(session.id, playerId, optionId);

    if (onVoteCast) {
      onVoteCast(optionId);
    }
  };

  const handleEndVoting = () => {
    socketService.endVotingSession(session.id);
    if (onEndVoting) {
      onEndVoting();
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Jogador Desconhecido';
  };

  const renderResults = () => {
    if (!currentResults) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-indigo-950">Resultados Parciais</h3>
        {currentResults.map(result => {
          const option = session.options.find(opt => opt.id === result.optionId);
          if (!option) return null;

          return (
            <div key={result.optionId} className="bg-white p-4 rounded-xl border-2 border-indigo-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-indigo-900">{option.label}</span>
                <span className="text-sm text-indigo-600">
                  {result.count} votos ({result.percentage.toFixed(1)}%)
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-indigo-100 rounded-full h-3 mb-2">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${result.percentage}%` }}
                />
              </div>

              {/* Mostrar votantes para votação aberta */}
              {session.type === VoteType.OPEN && result.voters.length > 0 && (
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
    <div className="space-y-6">
      {/* Cabeçalho da votação */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">🗳️</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
            session.type === VoteType.OPEN
              ? 'bg-green-100 text-green-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {session.type === VoteType.OPEN ? 'Votação Aberta' : 'Votação Secreta'}
          </span>
        </div>
        <h2 className="text-2xl font-black text-indigo-950">{session.question}</h2>
        <p className="text-indigo-600">
          {hasVoted ? '✅ Você já votou' : 'Selecione sua opção abaixo'}
        </p>
      </div>

      {/* Opções de voto */}
      <div className="grid gap-3">
        {session.options.map(option => {
          const isSelected = selectedOption === option.id;
          const isDisabled = hasVoted || !session.isActive;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isDisabled}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : isDisabled
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-indigo-900 border-indigo-200 hover:border-indigo-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  isSelected
                    ? 'bg-white border-white'
                    : 'border-current'
                }`}>
                  {isSelected && <div className="w-2 h-2 bg-indigo-600 rounded-full m-0.5" />}
                </div>
                <div>
                  <div className="font-semibold">{option.label}</div>
                  {option.description && (
                    <div className={`text-sm mt-1 ${
                      isSelected ? 'text-indigo-100' : 'text-indigo-600'
                    }`}>
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Resultados parciais para votação aberta */}
      {session.type === VoteType.OPEN && session.showResults && renderResults()}

      {/* Controles do host */}
      {isHost && session.isActive && (
        <div className="text-center pt-4 border-t border-indigo-200">
          <Button onClick={handleEndVoting} variant="secondary">
            🏁 Finalizar Votação
          </Button>
        </div>
      )}

      {/* Status da votação */}
      {!session.isActive && (
        <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
          <div className="text-green-600 font-semibold">Votação Finalizada</div>
          <div className="text-sm text-green-500 mt-1">
            Aguardando resultados...
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingInterface;