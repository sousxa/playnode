# 📝 Mudanças de Código Específicas - Referência Rápida

## 1️⃣ `services/socket.ts` - Correção do SharedWorker

### Localização: Linhas 16-120
### Mudança: Remover código duplicado de join-room

**ANTES (quebrado):**
```javascript
// join-room case
// ... implementação incompleta ...

// update-room case
// ... implementação incompleta ...

// filterGameStateForPlayer function

} else if (type === 'update-room') {  // ❌ DUPLICADO!
  // ... código repetido ...
}
```

**DEPOIS (correto):**
```javascript
if (type === 'create-room') {
  rooms.set(payload.code, payload);
  clients.set(port, payload.hostId);
  
  clients.forEach((playerId, clientPort) => {
    const filteredRoom = filterGameStateForPlayer(payload, playerId);
    clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
  });
}
else if (type === 'join-room') {
  const room = rooms.get(payload.code);
  
  if (room) {
    clients.set(port, payload.playerId);
    
    const exists = room.players.find((p: any) => p.id === payload.playerId);
    if (!exists) {
      room.players.push({ 
        id: payload.playerId, 
        name: payload.playerName,
        isActive: true,
        hasActedThisTurn: false
      });
      console.log('Player adicionado. Total agora:', room.players.length);
    }
    
    // Broadcast para TODOS
    clients.forEach((playerId, clientPort) => {
      const filteredRoom = filterGameStateForPlayer(room, playerId);
      clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
    });
  }
}
```

---

## 2️⃣ `App.tsx` - PlayerId Persistente

### Localização: Linhas 11-25
### Mudança: Gerar ID única UMA VEZ e persistir

**ANTES (bug):**
```typescript
const [playerId] = useState(() => 
  localStorage.getItem('pnode_pid') || Math.random().toString(36).substr(2, 9)
);
// ❌ Problema: Math.random() gera novo ID a cada render em alguns casos
```

**DEPOIS (correto):**
```typescript
const [playerId] = useState(() => {
  const stored = localStorage.getItem('pnode_pid');
  if (stored) {
    console.log(`[App] PlayerId recuperada do localStorage: ${stored}`);
    return stored;
  }
  
  const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[App] PlayerId gerada (novo dispositivo): ${newId}`);
  localStorage.setItem('pnode_pid', newId);
  return newId;
});
// ✅ Garantido: ID é salva na primeira vez e reutilizada
```

---

## 3️⃣ `App.tsx` - Logging Detalhado

### Localização: Linhas 32-80
### Mudança: Adicionar console.log em pontos críticos

**ANTES:**
```typescript
useEffect(() => {
  localStorage.setItem('pnode_pid', playerId);
  // ...
  socketService.onRoomUpdated((room) => {
    setRoomCode(room.code);
    // ...
  });
}, [playerId]);
```

**DEPOIS:**
```typescript
useEffect(() => {
  localStorage.setItem('pnode_pid', playerId);
  console.log(`[App] Conectando com playerId: ${playerId}`);
  
  const params = new URLSearchParams(window.location.search);
  const roomFromUrl = params.get('room');
  if (roomFromUrl) {
    console.log(`[App] Sala encontrada na URL: ${roomFromUrl}`);
    setInitialRoomFromUrl(roomFromUrl.toUpperCase());
  }

  socketService.connect();
  
  socketService.onRoomUpdated((room) => {
    console.log(`[App] Sala atualizada. Jogadores: ${room.players.length}`, 
                room.players.map((p: any) => p.name));
    // ... resto do código ...
  });
  
  socketService.onError((msg) => {
    console.error(`[App] Erro: ${msg}`);
    setJoinError(msg);
    alert(msg);
  });
}, [playerId]);
```

---

## 4️⃣ `services/socket.ts` - JoinRoom Melhorado

### Localização: Linhas 310-365
### Mudança: Dupla validação com logging

**ANTES:**
```typescript
joinRoom(code: string, playerName: string, playerId: string) {
  return new Promise<void>((resolve, reject) => {
    let room = this.getRoomFromStorage(code);

    if (room) {
      const exists = room.players.find((p: any) => p.id === playerId);
      if (!exists) {
        room.players.push({ id: playerId, name: playerName });
        this.saveRoomToStorage(room);
      }
      this.currentRoom = room;
      this.trigger('room-updated', room);
      this.broadcast('update-room', room);
      resolve();
      return;
    }

    this.broadcast('join-room', { code, playerName, playerId });

    const timeout = setTimeout(() => {
      this.joinPendingRequests.delete(code);
      reject(new Error('Sala não encontrada.'));
    }, 3000);  // ❌ Timeout muito curto
```

**DEPOIS:**
```typescript
joinRoom(code: string, playerName: string, playerId: string) {
  return new Promise<void>((resolve, reject) => {
    let room = this.getRoomFromStorage(code);

    if (room) {
      const exists = room.players.find((p: any) => p.id === playerId);
      
      if (!exists) {
        room.players.push({ 
          id: playerId, 
          name: playerName,
          isActive: true,
          hasActedThisTurn: false 
        });
        console.log(`[Local Storage] Player ${playerId} adicionado. Total agora: ${room.players.length}`);
        this.saveRoomToStorage(room);
      }
      
      this.currentRoom = room;
      this.trigger('room-updated', room);
      this.broadcast('update-room', room);
      resolve();
      return;
    }

    console.log(`[SharedWorker] Solicitando sincronização da sala ${code}`);
    this.broadcast('join-room', { code, playerName, playerId });

    const timeout = setTimeout(() => {
      this.joinPendingRequests.delete(code);
      reject(new Error('Sala não encontrada. Verifique o código e tente novamente.'));
    }, 5000);  // ✅ Timeout aumentado

    this.joinPendingRequests.set(code, {
      resolve: (syncedRoom: any) => {
        const exists = syncedRoom.players.find((p: any) => p.id === playerId);
        
        if (!exists) {
          syncedRoom.players.push({ 
            id: playerId, 
            name: playerName,
            isActive: true,
            hasActedThisTurn: false 
          });
          console.log(`[SharedWorker Sync] Player ${playerId} adicionado. Total agora: ${syncedRoom.players.length}`);
        }
        
        this.saveRoomToStorage(syncedRoom);
        this.currentRoom = syncedRoom;
        this.trigger('room-updated', syncedRoom);
        this.broadcast('update-room', syncedRoom);
        resolve();
      },
      timeout
    });
  });
}
```

---

## 5️⃣ `services/socket.ts` - Novo: addLocalPlayer

### Localização: Linhas 257-290
### Mudança: Adicionar método para modo single-device

**NOVO (não existia):**
```typescript
/**
 * Modo Single-Device: Adicionar jogador manualmente pela host
 */
addLocalPlayer(code: string, playerId: string, playerName: string) {
  if (!this.currentRoom || this.currentRoom.code !== code) {
    throw new Error('Sala não encontrada');
  }

  const exists = this.currentRoom.players.find((p: any) => p.id === playerId);
  if (exists) {
    console.warn(`[SingleDevice] Jogador ${playerId} já existe`);
    return;
  }

  this.currentRoom.players.push({
    id: playerId,
    name: playerName,
    isActive: true,
    hasActedThisTurn: false
  });

  console.log(`[SingleDevice] Player ${playerId} (${playerName}) adicionado. Total agora: ${this.currentRoom.players.length}`);

  this.saveRoomToStorage(this.currentRoom);
  this.trigger('room-updated', this.currentRoom);
  this.broadcast('update-room', this.currentRoom);
}

/**
 * Modo Single-Device: Remover jogador
 */
removeLocalPlayer(code: string, playerId: string) {
  if (!this.currentRoom || this.currentRoom.code !== code) {
    throw new Error('Sala não encontrada');
  }

  if (playerId === this.currentRoom.hostId) {
    throw new Error('Não é possível remover o host');
  }

  this.currentRoom.players = this.currentRoom.players.filter((p: any) => p.id !== playerId);

  console.log(`[SingleDevice] Player ${playerId} removido. Total agora: ${this.currentRoom.players.length}`);

  this.saveRoomToStorage(this.currentRoom);
  this.trigger('room-updated', this.currentRoom);
  this.broadcast('update-room', this.currentRoom);
}
```

---

## 6️⃣ `views/Lobby.tsx` - Integrar SingleDeviceMode

### Localização: Linhas 1-10 e seção de main
### Mudança: Importar e renderizar componente

**ANTES:**
```typescript
import React, { useState } from 'react';
import Button from '../components/Button';
import { Player, GameMode } from '../types';
```

**DEPOIS:**
```typescript
import React, { useState } from 'react';
import Button from '../components/Button';
import SingleDeviceMode from '../components/SingleDeviceMode';
import { Player, GameMode } from '../types';
```

**Adicionar no JSX:**
```typescript
<main className="p-6 flex-1 space-y-8">
  <section>
    {/* ... lista de jogadores ... */}
  </section>

  {/* ✅ NOVO: Modo Single Device */}
  {isHost && (
    <SingleDeviceMode
      roomCode={roomCode}
      isHost={isHost}
      players={players}
    />
  )}

  {isHost ? (
    <section className="space-y-4">
      {/* ... opções de jogos ... */}
    </section>
  ) : (
    {/* ... aguardando host ... */}
  )}
</main>
```

---

## 🆕 Novo Arquivo: `components/SingleDeviceMode.tsx`

**Criado:** Linhas 1-125

Componente React que permite host adicionar jogadores localmente:

```typescript
interface SingleDeviceModeProps {
  roomCode: string;
  isHost: boolean;
  players: Array<{ id: string; name: string; isActive: boolean }>;
  onPlayerAdded?: () => void;
}

const SingleDeviceMode: React.FC<SingleDeviceModeProps> = ({
  roomCode,
  isHost,
  players,
  onPlayerAdded
}) => {
  // ... implementação ...
};
```

---

## 📊 Resumo das Mudanças

| Arquivo | Tipo | Linhas | Descrição |
|---------|------|--------|-----------|
| `services/socket.ts` | Modif | 16-120 | Fix SharedWorker (remover duplicação) |
| `services/socket.ts` | Modif | 250-310 | Fix joinRoom (validação + logging) |
| `services/socket.ts` | Novo | 257-290 | addLocalPlayer/removeLocalPlayer |
| `App.tsx` | Modif | 11-25 | PlayerId persistente |
| `App.tsx` | Modif | 32-80 | Logging detalhado |
| `App.tsx` | Modif | 95-115 | Logging em handleStartSession |
| `views/Lobby.tsx` | Modif | 1-10 | Import SingleDeviceMode |
| `views/Lobby.tsx` | Modif | 60-68 | Renderizar SingleDeviceMode |
| `components/SingleDeviceMode.tsx` | Novo | 1-125 | Componente modo single-device |

---

## ✅ Validação de Build

```bash
npm run build
# ✅ 41 modules transformed
# ✅ dist/assets/index-iBu8RcBD.js 494.31 kB
```

---

## 🔗 Relacionado

- [BUG_FIX_SUMMARY.md](./BUG_FIX_SUMMARY.md) - Resumo executivo
- [ROOM_BUGFIX.md](./ROOM_BUGFIX.md) - Explicação técnica
- [TEST_MULTIPLE_PLAYERS.md](./TEST_MULTIPLE_PLAYERS.md) - Guia de teste
- [VALIDATION_SCRIPT.md](./VALIDATION_SCRIPT.md) - Scripts de validação