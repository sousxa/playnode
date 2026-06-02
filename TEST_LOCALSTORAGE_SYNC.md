```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   🧪 GUIA DE TESTE - LocalStorageSync                     ║
║                                                                            ║
║                Teste Prático: 2 Abas = 2 Jogadores                        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 Objetivo

Validar que:
- ✅ 2 abas = 2 jogadores visíveis
- ✅ Sincronização automática
- ✅ Sem duplicação ou perda de dados
- ✅ Logging console funciona

---

## 📋 Pré-Requisitos

- ✅ npm run dev rodando (porta 3000)
- ✅ Chrome/Firefox aberto
- ✅ DevTools F12 pronto para usar

---

## 🧪 TESTE 1: Criar Sala + Entrar (2 Abas)

### Passo 1: Aba A - Criar Sala
```
1. Abrir http://localhost:3000
2. Nome: "João"
3. Clicar "Criar Nova Sala"
4. ✓ Deve gerar código tipo "WXYZ"
5. ✓ Deve mostrar 1 jogador ("Você")
```

**Console esperado (Aba A):**
```
[LocalStorageSync] Sala criada: WXYZ
[LocalStorageSync] Sala WXYZ salva no localStorage
[App] Sala atualizada. Jogadores: 1 ["João"]
```

---

### Passo 2: Aba B - Entrar com Código
```
1. Abrir http://localhost:3000 (NOVA ABA)
2. Nome: "Maria"
3. Clicar "Entrar com Código"
4. Código: WXYZ (copiar da Aba A)
5. Clicar "Entrar na Sala"
```

**Console esperado (Aba B):**
```
[LocalStorageSync] Solicitando sincronização da sala WXYZ
[LocalStorageSync] Player player_xxx_yyy adicionado. Total: 2
[LocalStorageSync] Sala WXYZ salva no localStorage
[App] Sala atualizada. Jogadores: 2 ["João", "Maria"]
```

---

### Passo 3: Verificar Sincronização
```
RESULTADO ESPERADO:

ABA A (João):
  ├─ Jogadores: 2
  ├─ Nomes: "Você", "Maria"
  └─ Console: Storage event disparado

ABA B (Maria):
  ├─ Jogadores: 2
  ├─ Nomes: "Você", "João"
  └─ Console: Sala sincronizada
```

**✅ TESTE 1 PASSOU SE:**
- Ambas abas mostram 2 jogadores
- Nomes aparecem corretamente
- Sem erros no console
- Storage events aparecem nos logs

---

## 🧪 TESTE 2: Modo Single-Device (Adicionar Manualmente)

### Setup
```
1. Aba A: Sala criada com João (host)
2. Aba A: Deve estar no Lobby
```

### Teste
```
1. Aba A: Procurar seção "Adicionar Jogadores" (se for host)
2. Nome: "Pedro"
3. Clicar "Adicionar"
4. ✓ Deve aparecer Pedro na lista (agora 2 jogadores)
5. Adicionar "Ana"
6. ✓ Deve mostrar 3 jogadores
```

**Console esperado:**
```
[LocalStorageSync] Player local_timestamp_xxx adicionado. Total: 2
[LocalStorageSync] Player local_timestamp_yyy adicionado. Total: 3
[LocalStorageSync] Sala atualizada via storage event
```

**✅ TESTE 2 PASSOU SE:**
- Cada "Adicionar" funciona
- Contador aumenta corretamente
- Sem duplicação de nomes
- Console mostra "Total: 2, Total: 3, Total: 4"

---

## 🧪 TESTE 3: Recarregar Página (Persistência)

### Setup
```
1. Aba A: 3 jogadores (João, Pedro, Ana)
2. Aba B: 3 jogadores visíveis
```

### Teste
```
1. Aba A: Pressionar F5 (recarregar)
2. ✓ Deve manter 3 jogadores
3. ✓ Não deve duplicar
4. ✓ Nome de cada um deve estar correto
5. Aba B: Deve continuar vendo 3 também
```

**Console esperado (depois de reload em A):**
```
[App] PlayerId recuperada do localStorage: player_xxx_yyy
[App] Sala atualizada. Jogadores: 3 ["João", "Pedro", "Ana"]
```

**✅ TESTE 3 PASSOU SE:**
- Após reload: mesmos 3 jogadores
- Sem erro "Sala não encontrada"
- Aba B sincroniza automaticamente
- Nenhum duplicado

---

## 🧪 TESTE 4: Link de Convite

### Setup
```
1. Aba A: Sala criada (código WXYZ)
2. Aba A: Console mostra código
```

### Teste
```
1. Aba A: Clicar "Copiar Link de Convite"
2. ✓ URL copiada com ?room=WXYZ
3. Aba C: Colar URL no navegador
   URL: http://localhost:3000?room=WXYZ
4. ✓ Deve mostrar form pré-preenchido com código
5. Nome: "Carlos"
6. Clicar "Entrar"
```

**Console esperado (Aba C):**
```
[App] Sala encontrada na URL: WXYZ
[App] Entrando em sala: WXYZ
[LocalStorageSync] Player player_zzz_aaa adicionado. Total: 4
```

**✅ TESTE 4 PASSOU SE:**
- URL detecta código automaticamente
- Entrada funciona sem copiar código manualmente
- Total sobe para 4 jogadores
- Aba A e B sincronizam com Aba C

---

## 🧪 TESTE 5: QR Code

### Setup
```
1. Aba A: Sala WXYZ criada
2. QR Code visível no Lobby
```

### Teste
```
1. Scannear QR Code com celular/outro PC
2. ✓ Deve ir para http://localhost:3000/?room=WXYZ
3. Nome no celular: "Mobile"
4. Entrar
5. ✓ Aba A deve mostrar novo jogador
```

**Console esperado:**
```
[LocalStorageSync] Player mobile_xxx adicionado. Total: 5
[App] Sala atualizada. Jogadores: 5
```

**✅ TESTE 5 PASSOU SE:**
- QR Code leva ao site correto
- Jogador mobile aparece
- Sincronização automática
- Sem erros de CORS

---

## 🐛 Troubleshooting

### ❌ "Sala não encontrada"
```
Causa: Código digitado errado ou sessão expirou
Solução:
  1. Copiar código exato de Aba A
  2. Limpar localStorage: localStorage.clear()
  3. Recarregar ambas abas
```

### ❌ "Jogadores não sincronizam"
```
Causa: Storage events não disparando
Solução:
  1. Abrir DevTools → Application → Local Storage
  2. Procurar por "playnode_room_XXXX"
  3. Verificar se updatedAt muda
  4. Se não mudar: recarregar página
```

### ❌ "Console vazio"
```
Causa: Logs não visíveis
Solução:
  1. DevTools → Console
  2. Filtrar por "[LocalStorageSync]"
  3. Se não aparecer: abrir erro JavaScript
  4. npm run dev pode ter erro
```

### ❌ "Duplica jogadores"
```
Causa: Same playerId entrando múltiplas vezes
Solução:
  1. localStorage.removeItem('pnode_pid')
  2. Recarregar página
  3. Novo playerId será gerado
```

---

## 📊 Checklist de Validação

```
TESTE 1: Criar + Entrar
  ☑️ Aba A: Sala criada
  ☑️ Aba B: Entra com código
  ☑️ Ambas mostram 2 jogadores
  ☑️ Nomes corretos
  ☑️ Console sem erros

TESTE 2: Modo Single-Device
  ☑️ Host vê opção "Adicionar"
  ☑️ Pode adicionar múltiplos
  ☑️ Contador aumenta corretamente
  ☑️ Nomes aparecem
  ☑️ Sem duplicação

TESTE 3: Recarregar
  ☑️ F5 em Aba A
  ☑️ Mantém jogadores
  ☑️ Sem duplicar
  ☑️ Aba B sincroniza
  ☑️ Sem erro "Sala não encontrada"

TESTE 4: Link
  ☑️ Link copiado corretamente
  ☑️ Nova aba detecta código
  ☑️ Form pré-preenchido
  ☑️ Entrada funciona
  ☑️ Total aumenta

TESTE 5: QR Code
  ☑️ QR gerado corretamente
  ☑️ Scanear leva ao site
  ☑️ Novo jogador aparece
  ☑️ Sincroniza automaticamente
  ☑️ Sem erro CORS
```

---

## 🎯 Resultado Final

Se todos os 5 testes passarem:

✅ **Sistema 100% funcional!**

```
Critérios de Sucesso Atendidos:
  ✓ Múltiplos dispositivos/abas
  ✓ Sincronização automática
  ✓ Sem perda de dados
  ✓ Logging detalhado
  ✓ Modo single-device
  ✓ Link/QR code
  ✓ Persistência
```

---

## 📝 Logs a Procurar

```javascript
// ✅ BOM - criação OK
[LocalStorageSync] Sala criada: ABCD
[LocalStorageSync] Sala ABCD salva no localStorage
[App] Sala atualizada. Jogadores: 1

// ✅ BOM - entrada OK
[LocalStorageSync] Player player_xxx adicionado. Total: 2
[LocalStorageSync] Sala ABCD salva no localStorage
[App] Sala atualizada. Jogadores: 2

// ✅ BOM - sincronização OK
[LocalStorageSync] Storage mudou de outra aba: playnode_room_ABCD
[App] Sala atualizada. Jogadores: 2

// ❌ RUIM - erro de parsing
[LocalStorageSync] Erro ao parsear sala: SyntaxError

// ❌ RUIM - sala não encontrada
Sala não encontrada. Verifique o código.

// ❌ RUIM - duplicação
Total: 2, Total: 2, Total: 2 (não aumenta)
```

---

## 🚀 Próximas Ações (Se Tudo Passar)

```
1. ✅ Executar todos os 5 testes
2. ✅ Documentar resultados
3. ✅ Se houver erros: ver Troubleshooting
4. ✅ Compartilhar logs com equipe
5. ✅ Deploy para produção
```

---

**Tempo esperado:** 10-15 minutos  
**Dificuldade:** Muito Fácil ⭐  
**Resultado:** Sistema pronto para usar ✅