import { VoteType, VoteOption } from '../types';
import { localStorageSyncService } from '../services/localStorageSync';

/**
 * Utilitários para facilitar a criação e gerenciamento de votações
 */
export class VotingUtils {

  /**
   * Cria uma votação simples de Sim/Não
   */
  static createYesNoVote(
    code: string,
    question: string,
    type: VoteType = VoteType.SECRET
  ) {
    const options: VoteOption[] = [
      { id: 'yes', label: 'Sim', description: 'Concordo com a proposta' },
      { id: 'no', label: 'Não', description: 'Discordo com a proposta' }
    ];

    console.log('[VotingUtils] Criar votação Sim/Não:', { question, type });
    return null; // Será implementado com armazenamento local
  }

  /**
   * Cria uma votação para escolher entre jogadores
   */
  static createPlayerVote(
    code: string,
    question: string,
    players: Array<{ id: string; name: string }>,
    type: VoteType = VoteType.SECRET
  ) {
    const options: VoteOption[] = players.map(player => ({
      id: player.id,
      label: player.name,
      description: `Votar em ${player.name}`
    }));

    console.log('[VotingUtils] Criar votação de jogadores:', { question, options: options.length });
    return null; // Será implementado com armazenamento local
  }

  /**
   * Cria uma votação para escolher uma opção de uma lista
   */
  static createMultipleChoiceVote(
    code: string,
    question: string,
    choices: Array<{ id: string; label: string; description?: string }>,
    type: VoteType = VoteType.SECRET
  ) {
    const options: VoteOption[] = choices.map(choice => ({
      id: choice.id,
      label: choice.label,
      description: choice.description
    }));

    console.log('[VotingUtils] Criar votação múltipla escolha:', { question, options: options.length });
    return null; // Será implementado com armazenamento local
  }

  /**
   * Cria uma votação para o jogo Impostor (quem é o impostor?)
   */
  static createImpostorVote(
    code: string,
    players: Array<{ id: string; name: string }>
  ) {
    return this.createPlayerVote(
      code,
      'Quem você acha que é o Impostor?',
      players,
      VoteType.SECRET
    );
  }

  /**
   * Cria uma votação para o jogo Quem Sou Eu (adivinhar personagem)
   */
  static createCharacterGuessVote(
    code: string,
    characters: string[]
  ) {
    const options: VoteOption[] = characters.map((character, index) => ({
      id: `char_${index}`,
      label: character,
      description: `Acho que você é ${character}`
    }));

    console.log('[VotingUtils] Criar votação de personagem:', { characters: characters.length });
    return null; // Será implementado com armazenamento local
  }

  /**
   * Cria uma votação para dilemas morais
   */
  static createDilemmaVote(
    code: string,
    dilemma: string,
    optionA: string,
    optionB: string
  ) {
    const options: VoteOption[] = [
      { id: 'A', label: optionA, description: 'Opção A do dilema' },
      { id: 'B', label: optionB, description: 'Opção B do dilema' }
    ];

    console.log('[VotingUtils] Criar votação dilema:', { dilemma });
    return null; // Será implementado com armazenamento local
  }

  /**
   * Exemplos de uso do sistema de votação
   */
  static examples = {
    // Votação simples
    simple: () => `
socketService.createVotingSession(
  roomCode,
  'Devemos continuar o jogo?',
  [
    { id: 'continue', label: 'Continuar', description: 'Vamos jogar mais uma rodada' },
    { id: 'stop', label: 'Parar', description: 'Já deu por hoje' }
  ],
  VoteType.OPEN
);
`,

    // Votação de jogadores
    players: () => `
VotingUtils.createPlayerVote(
  roomCode,
  'Quem deve ser o líder?',
  players,
  VoteType.SECRET
);
`,

    // Votação de Impostor
    impostor: () => `
VotingUtils.createImpostorVote(roomCode, players);
`,

    // Votação de dilema
    dilemma: () => `
VotingUtils.createDilemmaVote(
  roomCode,
  'Você salvaria 5 estranhos ou seu melhor amigo?',
  'Salvar 5 estranhos',
  'Salvar meu melhor amigo'
);
`
  };
}

export default VotingUtils;