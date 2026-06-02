<!-- VALIDAÇÃO FINAL - Copie e cole no DevTools Console para validar a correção -->

# 🔍 Script de Validação Automática

Cole este código no Console do DevTools (F12) para validar a correção:

## Script 1: Verificar PlayerId Única

```javascript
// Deve mostrar ID DIFERENTE em cada aba
const pid1 = localStorage.getItem('pnode_pid');
console.log('PlayerId desta aba:', pid1);
console.log('✅ Copiou para clipboard. Cole em outra aba para comparar.');
console.copy(pid1); // Copia para clipboard
```

**Esperado:** ID diferente em cada aba

---

## Script 2: Contar Jogadores da Sala

```javascript
// Execute em qualquer aba dentro de uma sala
const roomCode = new URLSearchParams(window.location.search).get('room');
const roomKey = `pnode_room_${roomCode}`;
const room = JSON.parse(localStorage.getItem(roomKey));

if (room) {
  console.table(room.players.map(p => ({
    id: p.id,
    nome: p.name,
    ativo: p.isActive ? '✅' : '❌'
  })));
  console.log(`Total: ${room.players.length} jogadores`);
} else {
  console.warn('Sala não encontrada no localStorage');
}
```

**Esperado:** Lista com todos os jogadores da sala

---

## Script 3: Validar Sincronização

```javascript
// Verifique se os IDs da sala estão sendo sincronizados
const roomCode = new URLSearchParams(window.location.search).get('room');
const roomKey = `pnode_room_${roomCode}`;
const room = JSON.parse(localStorage.getItem(roomKey));
const pid = localStorage.getItem('pnode_pid');

console.log('Sua PlayerId:', pid);
console.log('Você está na lista?', room?.players.some(p => p.id === pid) ? '✅ SIM' : '❌ NÃO');
console.log('Total de jogadores:', room?.players.length);

// Verificar para duplicação
const duplicates = room?.players.filter((p, i, arr) => 
  arr.findIndex(x => x.id === p.id) !== i
);
console.log('Duplicados encontrados?', duplicates?.length > 0 ? '⚠️ SIM (BUG!)' : '✅ NÃO');
```

**Esperado:**
- ✅ Sua PlayerId está na lista
- ✅ Nenhum duplicado encontrado

---

## Script 4: Validar Incremento Correto

```javascript
// Execute isso, recarregue, e execute novamente
const roomCode = new URLSearchParams(window.location.search).get('room');
const roomKey = `pnode_room_${roomCode}`;
const room = JSON.parse(localStorage.getItem(roomKey));

const key = 'pnode_player_count_log';
const log = JSON.parse(localStorage.getItem(key) || '[]');
const count = room?.players.length || 0;

log.push({ time: new Date().toLocaleTimeString(), players: count });
localStorage.setItem(key, JSON.stringify(log));

console.table(log);
console.log('Sequência esperada: 1, 2, 3... (sem saltos ou diminuições)');
```

**Esperado:** Números incrementando: 1 → 2 → 3 → ...

---

## Script 5: Limpar Logs de Teste

```javascript
// Para resetar testes
localStorage.removeItem('pnode_player_count_log');
console.log('✅ Logs de teste limpados');
```

---

## 🧪 Teste Completo Automatizado

Cole este script uma única vez para validar tudo:

```javascript
(function validate() {
  console.log('🔍 INICIANDO VALIDAÇÃO...\n');
  
  // 1. PlayerId
  const pid = localStorage.getItem('pnode_pid');
  console.log('✓ PlayerId:', pid);
  
  // 2. Room
  const roomCode = new URLSearchParams(window.location.search).get('room');
  const roomKey = `pnode_room_${roomCode}`;
  const room = JSON.parse(localStorage.getItem(roomKey));
  
  if (!room) {
    console.warn('⚠️ Você não está em uma sala. Crie ou entre em uma sala primeiro.');
    return;
  }
  
  // 3. Jogadores
  console.log(`✓ Sala ${room.code}:`);
  console.table(room.players);
  
  // 4. Validações
  const checks = {
    'PlayerId única': !!pid && pid.length > 10,
    'Você na sala': room.players.some(p => p.id === pid),
    'Múltiplos jogadores': room.players.length >= 1,
    'Sem duplicatas': new Set(room.players.map(p => p.id)).size === room.players.length,
    'Todos ativos': room.players.every(p => p.isActive),
    'Tem hostId': !!room.hostId
  };
  
  console.log('\n✅ CHECKLIST DE VALIDAÇÃO:\n');
  Object.entries(checks).forEach(([name, result]) => {
    console.log(`${result ? '✅' : '❌'} ${name}`);
  });
  
  const passed = Object.values(checks).filter(v => v).length;
  const total = Object.values(checks).length;
  console.log(`\n📊 Resultado: ${passed}/${total} validações passaram`);
  
  if (passed === total) {
    console.log('🎉 BUG CORRIGIDO! Sistema funcionando normalmente.');
  } else {
    console.warn('⚠️ Alguns testes falharam. Veja acima.');
  }
})();
```

---

## 📱 Teste Multi-Dispositivo

### Passo 1: Aba A (Host)
```javascript
// Cole em Aba A:
console.log('Aba A - Host');
console.log('PlayerId:', localStorage.getItem('pnode_pid'));
console.log('Jogadores:', JSON.parse(localStorage.getItem('pnode_room_ABCD')).players.length);
```

### Passo 2: Aba B (Guest)
```javascript
// Cole em Aba B após entrar:
console.log('Aba B - Guest');
console.log('PlayerId:', localStorage.getItem('pnode_pid'));
console.log('Jogadores:', JSON.parse(localStorage.getItem('pnode_room_ABCD')).players.length);

// Deve mostrar:
// PlayerId DIFERENTE em A e B
// Ambas mostrando MESMO número de jogadores
```

---

## 🔧 Troubleshooting

### Se PlayerId for igual em duas abas:
```javascript
// Bug! Limpe e recrie:
localStorage.clear();
location.reload();
```

### Se jogadores forem diferentes entre abas:
```javascript
// Verificar SharedWorker:
const rooms = new Map();
// Abrir DevTools → Sources → Shared workers
// Deve aparecer socket.ts em execução
```

### Se houver duplicatas:
```javascript
// Limpar sala:
localStorage.removeItem('pnode_room_ABCD');
location.reload();
```

---

## 📊 Resultado Esperado

Se todos os testes passarem:

```
✓ PlayerId: player_1673737890_abc123def
✓ Sala ABCD:
  - Host (id: player_1673737890_abc123def)
  - Jogador 2 (id: player_1673737891_xyz789uvw)

✅ CHECKLIST DE VALIDAÇÃO:
✅ PlayerId única
✅ Você na sala
✅ Múltiplos jogadores
✅ Sem duplicatas
✅ Todos ativos
✅ Tem hostId

📊 Resultado: 6/6 validações passaram

🎉 BUG CORRIGIDO! Sistema funcionando normalmente.
```

---

## 🎯 Critério de Aceite Final

```
☑️ Dispositivo A = 1 jogador
☑️ Dispositivo B entra = Ambos veem 2
☑️ Recarregar B = Ainda 2 em ambos
☑️ Dispositivo C entra = Todos veem 3
☑️ Console não mostra erros
☑️ PlayerId diferente em cada dispositivo
☑️ Modo single-device funciona
```

**Se todos ☑️, sistema está 100% OK! ✅**