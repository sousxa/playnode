# 🧪 Guia de Teste Prático - Correção do Bug de Múltiplos Jogadores

## 📌 Setup Inicial

### 1. Abra DevTools em dois navegadores

```
Navegador A: http://localhost:3000/
Navegador B: http://localhost:3000/
```

Ambos com **DevTools aberto** (F12 → Console)

## 🧬 Teste 1: Fluxo Básico (Recomendado Começar Aqui)

### Passo 1: Criar Sala (Navegador A)

1. Clique em **"Criar Sala"**
2. Digite nome: **"Host"**
3. Clique em **"Criar"**

**Esperado:**
- ✅ Vê tela de Lobby
- ✅ Vê 1 jogador: "🙋‍♂️ Você"
- ✅ Console mostra: `[App] Sala atualizada. Jogadores: 1`

```
Console A:
[App] PlayerId: player_173737...
[App] Criando nova sala
[App] Sala atualizada. Jogadores: 1 (Host)
```

### Passo 2: Copiar Link de Convite

1. No Navegador A, clique botão **"Copiar Link de Convite"**
2. Notification deve mostrar: "✅ Link Copiado!"

**Esperado:**
- ✅ Link no clipboard contém `?room=ABCD` (código da sala)

### Passo 3: Entrar com Outro Navegador

1. No Navegador B, **cole a URL** ou digite manualmente:
   ```
   http://localhost:3000/?room=ABCD
   ```
2. Digite nome: **"Jogador 2"**
3. Clique em **"Entrar"**

**Console esperado:**
```
Console B:
[App] PlayerId: player_173738...
[App] Sala encontrada na URL: ABCD
[App] Conectando com playerId: player_173738...
[App] Entrando em sala: ABCD
```

### Passo 4: Validar Estado em Ambos

**Navegador A:**
- ✅ Deve mostrar **2 jogadores**: "🙋‍♂️ Você" + "👤 Jogador 2"
- ✅ Console: `[App] Sala atualizada. Jogadores: 2`
- ✅ Se modo single-device ativado: botão "Adicionar jogador" visível

**Navegador B:**
- ✅ Deve mostrar **2 jogadores**: "🙋‍♂️ Você" + "👤 Host"
- ✅ Console: `[App] Sala atualizada. Jogadores: 2`
- ✅ Mensagem: "Aguardando o Host iniciar..."

**✓ Se ambos mostram 2, parabéns! Bug foi corrigido.**

---

## 🔄 Teste 2: Persistência (Recarregar não deve duplicar)

### Passo 1: Com 2 jogadores na sala

- Navegador A: 2 jogadores
- Navegador B: 2 jogadores

### Passo 2: Recarregar Navegador A

```
F5 (ou Ctrl+R)
```

**Esperado:**
- ✅ Após recarregar, ainda vê **2 jogadores**
- ✅ NÃO deve mostrar 3 (duplicação)
- ✅ Console:
  ```
  [App] PlayerId recuperada do localStorage: player_173737...
  [App] Sala atualizada. Jogadores: 2
  ```

### Passo 3: Recarregar Navegador B

```
F5 (ou Ctrl+R)
```

**Esperado:**
- ✅ Ainda **2 jogadores**
- ✅ Ambos sincronizados

**✓ Se mantém 2 em ambos, persistência OK.**

---

## ➕ Teste 3: Terceiro Dispositivo/Aba

### Passo 1: Abrir Navegador C

```
Nova aba do Firefox / Safari / Brave
http://localhost:3000/?room=ABCD
Digite "Jogador 3"
```

**Console esperado:**
```
[App] PlayerId: player_173739...
[App] Entrando em sala: ABCD
[SharedWorker] Solicitando sincronização da sala ABCD
```

### Passo 2: Verificar em Todos

- **Navegador A:** 3 jogadores ✅
- **Navegador B:** 3 jogadores ✅
- **Navegador C:** 3 jogadores ✅

**Console C:**
```
[App] Sala atualizada. Jogadores: 3
```

**✓ Se todos veem 3, sincronização multi-dispositivo OK.**

---

## 🎮 Teste 4: Modo Single-Device (Host Adiciona Localmente)

### Passo 1: Criar Sala (Navegador A)

1. Clique **"Criar Sala"**
2. Digite: **"Host Local"**

**Esperado:**
- 1 jogador visível
- Vê seção **"📱 Modo Single Device"** com input

### Passo 2: Adicionar Jogadores Localmente

1. No campo "Nome do jogador...", digita **"João"**
2. Clique **"Adicionar"** ou pressione **Enter**

**Esperado:**
- ✅ Contador muda para "2 jogadores adicionados"
- ✅ Nova linha aparece: "👤 João"
- ✅ Console: `[SingleDevice] Player local_xxx adicionado. Total agora: 2`

### Passo 3: Adicionar Mais um

1. Digite **"Maria"** no input
2. Clique **"Adicionar"**

**Esperado:**
- ✅ Contador: "3 jogadores adicionados"
- ✅ Lista: "🙋‍♂️ Você", "👤 João", "👤 Maria"

### Passo 4: Recarregar

```
F5
```

**Esperado:**
- ✅ Mantém **3 jogadores** (persistência do localStorage)
- ✅ Não apaga, não duplica

**✓ Se mantém 3 e sincroniza, modo single-device OK.**

---

## 🔍 Teste 5: Verificar Console Logs (Debug)

Abra Console (F12) e procure por sequências esperadas:

### Criação de Sala
```
[App] PlayerId: player_173737...
[App] Conectando com playerId: player_173737...
[App] Criando nova sala
[App] Sala atualizada. Jogadores: 1 (Host)
```

### Entrada de novo Jogador
```
[App] PlayerId: player_173738...
[App] Entrando em sala: ABCD
[SharedWorker] Solicitando sincronização da sala ABCD
[App] Sala atualizada. Jogadores: 2
```

### Sincronização com localStorage
```
[App] PlayerId recuperada do localStorage: player_173737...
[Local Storage] Player player_173737 adicionado. Total agora: 2
```

**✓ Se todos estes logs aparecem em ordem, fluxo OK.**

---

## ⚠️ Sinais de Erro (Se Ver, Bug Ainda Existe)

### ❌ Erro 1: Sempre 1 Jogador
```
[App] Sala atualizada. Jogadores: 1
[App] Sala atualizada. Jogadores: 1
...
```

**Diagnóstico:** Verificar se playerId é único em cada navegador
```javascript
// DevTools Console:
localStorage.getItem('pnode_pid')
// Deve ser DIFERENTE em A e B
```

### ❌ Erro 2: Jogadores Duplicam
```
[App] Sala atualizada. Jogadores: 2
[App] Sala atualizada. Jogadores: 3  // após recarregar
```

**Diagnóstico:** Duplicação no array de players
```javascript
// Verificar em localStorage:
JSON.parse(localStorage.getItem('pnode_room_ABCD')).players
// Não deve ter IDs duplicados
```

### ❌ Erro 3: Desincronização Entre Abas
```
Aba A: "2 jogadores"
Aba B: "1 jogador"
```

**Diagnóstico:** SharedWorker não sincronizando
- Verificar se ambas abas estão na MESMA sala
- Verificar Console for "sync-room" messages

### ❌ Erro 4: Timeout ao Entrar
```
[App] Entrando em sala: ABCD
// 5 segundos de silêncio...
Error: "Sala não encontrada"
```

**Diagnóstico:** Sala não existe no SharedWorker
- A sala foi criada no localStorage apenas
- Transferir para SharedWorker manualmente

---

## 📱 Teste em Dispositivos Reais

Se tiver acesso a múltiplos dispositivos:

1. **Servidor deve estar acessível na rede:**
   ```
   npm run dev
   # Anotar IP: 192.168.X.X:3000
   ```

2. **De outro dispositivo, abra:**
   ```
   http://192.168.X.X:3000/
   ```

3. **Testar entrada cruzada:**
   - Celular A cria sala
   - Tablet B entra
   - Laptop C entra
   
   **Esperado:** Todos veem 3 jogadores

---

## 🎯 Critério de Sucesso Final

```
✅ Teste 1: A=1, A+B=2 (ambos)
✅ Teste 2: Recarregar mantém 2 em ambos
✅ Teste 3: A+B+C=3 (todos veem 3)
✅ Teste 4: Single device = 3 após recarregar
✅ Teste 5: Console logs aparecem em ordem esperada
```

**Se todos ✅, o bug está CORRIGIDO!**

---

## 📊 Checklist Rápido

```
[ ] PlayerId diferente em cada aba (localStorage)
[ ] Primeiro dispositivo vê 1 jogador
[ ] Segundo dispositivo vê 2 jogadores
[ ] Ambos sincronizam automaticamente
[ ] Recarregar não duplica
[ ] Terceiro dispositivo adiciona para 3
[ ] Modo single-device funciona
[ ] Nenhum erro no Console
[ ] Funciona com link ?room=XXXX
```

---

## 💡 Dicas de Debug

### Ver estado da sala em localStorage:
```javascript
JSON.parse(localStorage.getItem('pnode_room_ABCD'))
```

### Ver playerId local:
```javascript
localStorage.getItem('pnode_pid')
```

### Limpar dados (resetar teste):
```javascript
localStorage.clear()
// Depois recarregar página
```

### Verificar SharedWorker:
```javascript
// Open Chrome DevTools → Sources → Shared workers
// Deve aparecer socket.ts worker em execução
```

---

**Bom teste! 🚀**