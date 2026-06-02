```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    📋 COMANDOS ESSENCIAIS - CHEAT SHEET                    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 SERVIDOR

```bash
# Iniciar dev server (já está rodando em background)
npm run dev

# Build de produção
npm run build

# Parar servidor (Ctrl+C no terminal)
# Ou fechar terminal
```

---

## 🌐 NAVEGADOR

```
LOCAL:
  http://localhost:3000

REDE LOCAL (de outro PC):
  http://192.168.X.X:3000
  (substitua com IP do seu PC)

SMARTPHONE/TABLET:
  • Na mesma rede: http://192.168.X.X:3000
  • Scannear QR code na sala
```

---

## 🛠️ DEBUGGING - Console (F12)

```javascript
// Ver localStorage
Object.keys(localStorage)
// Output: ["pnode_pid", "playnode_room_WXYZ", ...]

// Ver playerId atual
localStorage.getItem('pnode_pid')
// Output: "player_1705766234890_abc123"

// Ver sala específica
JSON.parse(localStorage.getItem('playnode_room_WXYZ'))

// Ver todas as salas
Object.keys(localStorage)
  .filter(k => k.startsWith('playnode_room_'))
  .forEach(k => console.log(k, localStorage.getItem(k)))

// Limpar localStorage (RESET COMPLETO)
localStorage.clear()
// Depois: recarregar página (F5)

// Deletar uma sala específica
localStorage.removeItem('playnode_room_WXYZ')

// Ver todos os logs do sistema
// No console, procure por: [LocalStorageSync] ou [App]
```

---

## 📱 TESTAR EM 2 ABAS

```
1. Aba A: http://localhost:3000
2. Aba B: http://localhost:3000 (nova aba)

Aba A: "João" → Criar sala → Código: WXYZ
Aba B: "Maria" → Entrar → Código: WXYZ

Resultado: Ambas veem 2 jogadores ✅
```

---

## 🖥️ TESTAR EM 2 DISPOSITIVOS (LAN)

```
PC A:
  1. npm run dev
  2. Notar IP (ex: 192.168.1.100)

PC B:
  1. Abrir http://192.168.1.100:3000
  2. Criar ou entrar em sala
  3. Sincronização automática ✅

Smartphone (mesma rede):
  1. Abrir http://192.168.1.100:3000
  2. Scannear QR code ou entrar com código
  3. Tudo sincroniza! ✅
```

---

## 🧪 VALIDAR SINCRONIZAÇÃO

```javascript
// Console (F12):

// 1. Ver se há storage events
// Abra duas abas, em uma delas execute:
window.addEventListener('storage', (e) => {
  console.log('🔄 Storage mudou:', e.key, e.newValue)
})
// Depois na outra aba, altere uma sala
// Deve ver: 🔄 Storage mudou: playnode_room_XXXX

// 2. Ver timestamp de atualização
const room = JSON.parse(localStorage.getItem('playnode_room_WXYZ'))
console.log('Criado:', new Date(room.createdAt))
console.log('Atualizado:', new Date(room.updatedAt))

// 3. Ver quantidade de jogadores
const room = JSON.parse(localStorage.getItem('playnode_room_WXYZ'))
console.log(`Total de jogadores: ${room.players.length}`)
room.players.forEach((p, i) => console.log(`${i+1}. ${p.name}`))
```

---

## 🐛 TROUBLESHOOTING RÁPIDO

```bash
# Problema: "Sala não encontrada"
# Solução:
localStorage.clear()
# Depois reload a página

# Problema: Duplica jogadores
# Solução:
localStorage.removeItem('pnode_pid')
# Depois reload

# Problema: Não sincroniza entre abas
# Verificar:
Object.keys(localStorage).filter(k => k.startsWith('playnode_room_'))
# Se vazio: criar sala novamente

# Problema: Console vazio
# Filtrar por:
# Console → Filter → "[LocalStorageSync]"
```

---

## 📊 ARQUIVOS IMPORTANTES

```
Code:
  services/localStorageSync.ts
  App.tsx
  components/SingleDeviceMode.tsx
  views/GameView.tsx

Docs:
  START_HERE.md
  LOCALSTORAGE_SYNC_GUIDE.md
  TEST_LOCALSTORAGE_SYNC.md
  MIGRATION_COMPLETE.md
  ALTERNATIVE_READY.md
  COMMANDS.md (este arquivo)
```

---

## 🔄 WORKFLOW TÍPICO

```
1. npm run dev
   ↓
2. Abrir http://localhost:3000 em 2 abas
   ↓
3. Aba A: Criar sala → Gera código
   ↓
4. Aba B: Entrar com código
   ↓
5. Ambas sincronizam automaticamente
   ↓
6. Console mostra [LocalStorageSync] logs
   ↓
7. ✅ Sistema funcionando!
```

---

## 📝 LOGS ESPERADOS

```javascript
// Criar sala:
[LocalStorageSync] Sala criada: WXYZ
[LocalStorageSync] Sala WXYZ salva no localStorage
[App] Sala atualizada. Jogadores: 1

// Entrar em sala:
[LocalStorageSync] Player player_456_def adicionado. Total: 2
[LocalStorageSync] Sala WXYZ salva no localStorage
[App] Sala atualizada. Jogadores: 2

// Sincronização (outra aba):
[LocalStorageSync] Storage mudou de outra aba: playnode_room_WXYZ
[App] Sala atualizada. Jogadores: 2
```

---

## 🎯 VALIDAÇÃO RÁPIDA (1 minuto)

```
Aba A: "João" → Criar sala
Aba B: "Maria" → Entrar com código de A

ABA A vê "Você" e "Maria"? ✅
ABA B vé "Você" e "João"? ✅

Se SIM: Sistema funciona perfeitamente! 🎉
Se NÃO: Executar localStorage.clear() e tentar novamente
```

---

## 🔧 DESENVOLVIMENTO LOCAL

```bash
# Iniciar servidor
cd c:\Users\user\Documents\jogo\playnode---jogos-presenciais
npm run dev

# Outro terminal: Ver logs
npm run dev > logs.txt

# Build para produção
npm run build

# Limpar cache de build
rm -rf dist node_modules
npm install
npm run build
```

---

## 📦 BUILD

```bash
# Ver tamanho
npm run build
# Output: 498.67 kB (gzip: 124.85 kB)

# Verificar módulos
npm run build 2>&1 | grep "modules"
# Output: ✓ 42 modules transformed

# Verificar erros
npm run build 2>&1 | grep -i "error"
# Se nada aparecer: build OK!
```

---

## 🎓 ENTENDER O SISTEMA

### localStorage Structure
```
pnode_pid          → ID único do jogador neste dispositivo
playnode_room_XXX  → Dados da sala XXX (JSON)
```

### Sync Flow
```
Muda em Aba A
    ↓
localStorage atualizado
    ↓
Storage Event dispara
    ↓
Aba B recebe event
    ↓
Listeners acionados
    ↓
UI atualizada (instantâneo)

Fallback (500ms):
    ↓
Se storage events falharem, polling detecta mudança
```

### PlayerId
```
Gerado uma vez: player_<timestamp>_<random>
Salvo em localStorage: pnode_pid
Mesmo ao recarregar: recuperado de localStorage
Única por dispositivo: cada PC tem seu próprio ID
```

---

## 🚀 DEPLOYMENT

```bash
# Build para produção
npm run build

# Arquivos gerados em:
# dist/index.html
# dist/assets/index-*.js
# dist/assets/*.css

# Deploy:
# 1. Copiar conteúdo de dist/
# 2. Para servidor web
# 3. Servir com HTTP simples ou CDN

# Teste após deploy:
# Abrir 2 abas em produção
# Validar sincronização
# Verificar console logs
```

---

## 📞 SUPORTE RÁPIDO

| Problema | Comando | Resultado |
|----------|---------|-----------|
| Sala não encontrada | localStorage.clear() | Reset completo |
| Duplica jogadores | localStorage.removeItem('pnode_pid') | Novo ID |
| Ver sala atual | JSON.stringify(localStorage, null, 2) | Dump de tudo |
| Ver logs | Console → Filter → "[Local" | Filtrado |
| Deletar sala | localStorage.removeItem('playnode_room_XXXX') | Sala deletada |
| Verificar sync | window.addEventListener('storage', ...) | Ver events |

---

## ✅ Checklist Pré-Deploy

```
☑️ npm run build sem erros
☑️ 2 abas sincronizam corretamente
☑️ 2 dispositivos sincronizam
☑️ localStorage.clear() funciona
☑️ Reload mantém dados
☑️ Console logs aparecem
☑️ Testes 1-5 passam
☑️ QR code funciona
☑️ Link compartilhável funciona
☑️ Modo single-device funciona
```

---

## 🎯 Quick Reference

```
START        npm run dev
TEST         Abra 2 abas, criar + entrar
DEBUG        F12 → Console → [Local
CLEAN        localStorage.clear()
BUILD        npm run build
LOGS         localStorage key pattern: playnode_*
DOCS         Leia START_HERE.md primeiro
```

---

**Salvaguarde este arquivo para referência rápida!**

Última atualização: 20 de Janeiro de 2026