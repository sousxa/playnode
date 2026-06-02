# 🎮 Sistema de Turnos - Exemplo de Fluxo

## 📋 Estado Inicial (Após startGame)

```typescript
const gameState = {
  mode: 'IMPOSTOR',
  players: [
    { id: 'p1', name: 'Alice', isActive: true, hasActedThisTurn: false },
    { id: 'p2', name: 'Bob', isActive: true, hasActedThisTurn: false },
    { id: 'p3', name: 'Charlie', isActive: true, hasActedThisTurn: false }
  ],
  status: 'PLAYING',
  turnSystem: {
    turnOrder: ['p1', 'p2', 'p3'], // Ordem embaralhada
    currentTurnIndex: 0,
    currentPlayerId: 'p1', // Alice começa
    turnType: 'sequential',
    roundNumber: 1,
    phase: 'setup'
  },
  data: {
    secretWord: 'Elefante',
    impostorId: 'p2', // Bob é o impostor
    guesses: {}
  }
};
```

## 🔄 Fluxo de Turnos - Impostor (Sequencial)

### Fase 1: Setup (Distribuição de Palavras)
```
Turno 1: Alice vê "Elefante" ✅
Turno 2: Bob vê "VOCÊ É O IMPOSTOR!" ✅
Turno 3: Charlie vê "Elefante" ✅
→ Avança para phase: 'playing'
```

### Fase 2: Playing (Jogo Ativo)
```
Rodada 1:
Turno 1: Alice faz pergunta → playerActed('p1') → nextTurn()
Turno 2: Bob responde → playerActed('p2') → nextTurn()
Turno 3: Charlie responde → playerActed('p3') → nextTurn()
→ Volta para Turno 1 (currentTurnIndex = 0, roundNumber = 2)

Rodada 2:
Turno 1: Alice faz palpite "Elefante" → Registra guess → playerActed('p1')
→ Host clica "Iniciar Votação" → startVoting()
```

### Fase 3: Voting (Votação)
```
Todos votam simultaneamente:
Alice vota em Bob → playerActed('p1')
Bob vota em Charlie → playerActed('p2')
Charlie vota em Bob → playerActed('p3')
→ allPlayersActed() = true → Avança para reveal
```

## 🔄 Fluxo de Turnos - Dilemas (Simultâneo)

### Estado Inicial
```typescript
turnSystem: {
  turnOrder: ['p1', 'p2', 'p3'],
  currentTurnIndex: 0,
  currentPlayerId: '', // Não importa em turnos simultâneos
  turnType: 'simultaneous',
  roundNumber: 1,
  phase: 'playing'
}
```

### Fase: Playing
```
Todos agem ao mesmo tempo:
Alice clica Opção A → playerActed('p1')
Bob clica Opção B → playerActed('p2')
Charlie clica Opção A → playerActed('p3')
→ allPlayersActed() = true → Botão "Ver Resultados" aparece
→ Host clica "Ver Resultados" → startVoting() → phase = 'voting'
```

## 🎯 Eventos Socket

### Enviados pelo Cliente
```typescript
// Avançar turno (host)
socketService.nextTurn(roomCode);

// Jogador agiu
socketService.playerActed(roomCode, playerId);

// Iniciar votação
socketService.startVoting(roomCode);
```

### Recebidos pelo Cliente
```typescript
socketService.onRoomUpdated((room) => {
  // Estado atualizado com novo turno
  setGameState(room.gameState);
});
```

## 🔄 Lógica de Avanço Automático

```typescript
// No backend (socket.ts)
nextTurn(code: string) {
  const turnSystem = this.currentRoom.gameState.turnSystem;

  if (turnSystem.turnType === 'sequential') {
    turnSystem.currentTurnIndex = (turnSystem.currentTurnIndex + 1) % turnSystem.turnOrder.length;
    turnSystem.currentPlayerId = turnSystem.turnOrder[turnSystem.currentTurnIndex];

    // Reset ações
    this.currentRoom.gameState.players.forEach(p => p.hasActedThisTurn = false);

    // Nova rodada se voltou ao início
    if (turnSystem.currentTurnIndex === 0) {
      turnSystem.roundNumber++;
    }
  } else {
    turnSystem.roundNumber++;
  }

  this.broadcast('update-room', this.currentRoom);
}

allPlayersActed(): boolean {
  const turnSystem = this.currentRoom.gameState.turnSystem;

  if (turnSystem.turnType === 'simultaneous') {
    return this.currentRoom.gameState.players
      .filter(p => p.isActive)
      .every(p => p.hasActedThisTurn);
  } else {
    const currentPlayer = this.currentRoom.gameState.players
      .find(p => p.id === turnSystem.currentPlayerId);
    return currentPlayer ? currentPlayer.hasActedThisTurn : false;
  }
}
```

## 🎨 Destaque Visual (TurnIndicator)

- **Turnos Sequenciais**: Barra de progresso mostrando ordem, jogador atual destacado
- **Turnos Simultâneos**: Lista de jogadores com ✓ para quem já agiu
- **Seu Turno**: Destaque verde especial + animação
- **Fase Atual**: Badge colorido (Setup=Azul, Playing=Azul, Voting=Laranja)

Este sistema permite jogos flexíveis com turnos controlados pelo backend e refletidos instantaneamente no frontend!