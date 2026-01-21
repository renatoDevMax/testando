# Atualização do whatsapp-web.js

## 📋 Mudanças Realizadas

### 1. Atualização da Biblioteca
- **Versão anterior**: `whatsapp-web.js@1.28.0`
- **Versão atual**: `whatsapp-web.js@1.34.4`
- **Motivo**: Corrigir o erro `Cannot read properties of undefined (reading 'markedUnread')` que estava ocorrendo ao enviar mensagens

### 2. Remoção da Versão Fixa do WhatsApp Web
- **Antes**: `webVersion: '2.2402.5'` (versão fixa e possivelmente desatualizada)
- **Agora**: Versão removida para permitir uso automático da versão mais recente
- **Motivo**: A versão fixa estava desatualizada e causando incompatibilidades com a estrutura interna do WhatsApp Web

### 3. Correção de Configuração do Puppeteer
- **Removido**: `--disable-javascript` (flag problemática)
- **Motivo**: O WhatsApp Web precisa de JavaScript para funcionar corretamente. Essa flag estava impedindo o carregamento adequado dos scripts internos

## 🔧 Arquivos Modificados

1. **package.json**
   - Atualizado `whatsapp-web.js` de `^1.28.0` para `^1.34.4`

2. **src/whatsapp/whatsapp.config.ts**
   - Removida propriedade `webVersion: '2.2402.5'`
   - Removida flag `--disable-javascript` do Puppeteer
   - Mantido `webVersionCache` para cache local

3. **src/whatsapp/whatsapp.service.ts**
   - Removida referência a `webVersion` na criação do cliente
   - Atualizado método `reinicializarCliente()` para não usar `webVersion`

## 📦 Próximos Passos

### Para aplicar as mudanças:

1. **Instalar dependências atualizadas:**
   ```bash
   npm install
   ```

2. **Limpar cache (recomendado):**
   ```bash
   # Remover cache antigo do WhatsApp Web
   rm -rf .wwebjs_cache/
   rm -rf whatsapp-sessions/
   ```

3. **Testar localmente:**
   ```bash
   npm run start:dev
   ```

4. **Fazer deploy na Railway:**
   - Fazer commit das mudanças
   - Fazer push para o repositório
   - Railway fará rebuild automático

## ⚠️ Observações Importantes

1. **Nova Autenticação Necessária**: 
   - Com a atualização, será necessário escanear o QR Code novamente
   - A sessão antiga pode não ser compatível com a nova versão

2. **Cache Limpo**:
   - Recomenda-se limpar o cache do WhatsApp Web (`.wwebjs_cache/`)
   - Isso garante que a versão mais recente seja baixada

3. **Monitoramento**:
   - Após o deploy, monitorar os logs para verificar se o erro `markedUnread` foi resolvido
   - Testar envio de mensagens para confirmar que está funcionando

## 🎯 Resultado Esperado

- ✅ Erro `markedUnread` resolvido
- ✅ Mensagens sendo enviadas corretamente
- ✅ Melhor compatibilidade com versões recentes do WhatsApp Web
- ✅ Uso automático da versão mais recente do WhatsApp Web

## 📚 Referências

- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Issue #5718 - markedUnread error](https://github.com/pedroslopez/whatsapp-web.js/issues/5718)
- [NPM Package](https://www.npmjs.com/package/whatsapp-web.js)
