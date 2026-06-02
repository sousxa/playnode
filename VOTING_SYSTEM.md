# Sistema de Votação para Jogos em Grupo

## Visão Geral

O sistema de votação permite criar sessões de votação flexíveis para jogos presenciais, suportando tanto votações abertas quanto secretas, com validação backend e tratamento de empates.

## Tipos de Votação

### Votação Aberta (`VoteType.OPEN`)
- ✅ Votos são visíveis para todos em tempo real
- ✅ Resultados parciais são exibidos durante a votação
- ✅ Votantes são identificados publicamente

### Votação Secreta (`VoteType.SECRET`)
- 🔒 Votos são mantidos em sigilo até o final
- 🔒 Resultados só são revelados após finalizar a votação
- 🔒 Votantes permanecem anônimos

## Componentes

### `VotingInterface`
Interface principal para participação na votação:
- Exibe pergunta e opções
- Permite seleção de uma opção por jogador
- Mostra progresso em tempo real (votação aberta)
- Controles especiais para o host

### `VotingResults`
Exibe resultados finais da votação:
- Mostra vencedor ou empate
- Estatísticas detalhadas
- Lista de votantes (votação aberta)
- Ações para continuar ou nova votação

## API Backend

### Criar Sessão de Votação
```typescript
const sessionId = socketService.createVotingSession(
  roomCode,
  "Pergunta da votação?",
  [
    { id: 'opt1', label: 'Opção 1', description: 'Descrição opcional' },
    { id: 'opt2', label: 'Opção 2' }
  ],
  VoteType.SECRET // ou VoteType.OPEN
);
```

### Votar
```typescript
const success = socketService.castVote(roomCode, playerId, 'opt1');
```

### Finalizar Votação
```typescript
const summary = socketService.endVotingSession(roomCode);
// Retorna: { sessionId, totalVotes, results, winner?, isTie, tieOptions? }
```

## Utilitários (`VotingUtils`)

### Votações Pré-configuradas

#### Sim/Não
```typescript
VotingUtils.createYesNoVote(roomCode, "Devemos continuar?", VoteType.OPEN);
```

#### Votar em Jogadores
```typescript
VotingUtils.createPlayerVote(roomCode, "Quem é o líder?", players, VoteType.SECRET);
```

#### Impostor
```typescript
VotingUtils.createImpostorVote(roomCode, players);
```

#### Dilemas
```typescript
VotingUtils.createDilemmaVote(
  roomCode,
  "Dilema moral?",
  "Opção A",
  "Opção B"
);
```

## Estados e Eventos

### Estados do TurnSystem
- `'voting'`: Fase ativa de votação
- `'results'`: Exibindo resultados finais

### Eventos Socket
- `'vote-cast'`: Voto registrado (votação aberta)
- `'voting-ended'`: Votação finalizada
- `'results-ready'`: Resultados disponíveis

## Validações

### Backend
- ✅ Apenas uma opção por jogador
- ✅ Opção deve existir na sessão
- ✅ Sessão deve estar ativa
- ✅ Jogador deve estar na sala

### Frontend
- ✅ Impede múltiplos votos
- ✅ Validação visual de seleção
- ✅ Estados de loading

## Tratamento de Empates

Quando há empate:
- `isTie: true`
- `tieOptions`: Array com IDs das opções empatadas
- `winner: undefined`
- Interface mostra todas as opções empatadas

## Exemplo de Implementação

```typescript
// 1. Criar votação
const sessionId = VotingUtils.createImpostorVote(roomCode, players);

// 2. Aguardar votos (interface automática)

// 3. Finalizar e obter resultados
const results = socketService.endVotingSession(roomCode);

if (results.isTie) {
  console.log("Empate entre:", results.tieOptions);
} else {
  console.log("Vencedor:", results.winner);
}
```

## UX Sugerida

### Estados Visuais
- 🔒 **Pré-voto**: Botões interativos, hover effects
- ✅ **Votado**: Confirmação visual, botão desabilitado
- 📊 **Resultados**: Barras de progresso, destaques para vencedor
- 🤝 **Empate**: Destaque especial para opções empatadas

### Feedback
- Toasts para confirmação de votos
- Animações suaves nas transições
- Cores consistentes (verde=sucesso, âmbar=empate)

### Acessibilidade
- Labels descritivos
- Navegação por teclado
- Contraste adequado
- Screen reader support

## Integração com Jogos Existentes

### Impostor
```typescript
// Durante fase de acusação
const sessionId = VotingUtils.createImpostorVote(roomCode, players);

// Após votação, verificar se acertou o impostor
```

### Quem Sou Eu
```typescript
// Para adivinhar personagens
const sessionId = VotingUtils.createCharacterGuessVote(roomCode, characters);
```

### Dilemas
```typescript
// Votações morais já integradas
// Usa o sistema legado + novo sistema de resultados
```

## Expansões Futuras

- Votações com múltiplas escolhas
- Votações por ranking/ordenação
- Sistema de delegação de votos
- Votações com pesos diferentes
- Histórico completo de votações
- Estatísticas por jogador