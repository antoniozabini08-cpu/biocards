# Knowledge OS — Web app instalável (PWA)

Protótipo de segundo cérebro com interface responsiva para Android e desktop. Pode ser instalado pela tela inicial do Chrome como um aplicativo (PWA), sem Play Store.

## O que já está incluído
- Editor de anotações e armazenamento local no navegador.
- Extração de conceitos, relações, síntese e pontos a aprofundar usando Gemini.
- Mapa visual de conceitos.
- Geração e revisão de flashcards.
- Geração de questões com respostas e explicações.
- Interface adaptada a celular, com navegação inferior.
- Manifesto PWA, ícones, service worker e cache básico da interface.
- Chave Gemini mantida no backend, nunca no JavaScript do navegador.

## Requisitos
- Node.js 20 ou superior.
- Chave Gemini API: https://aistudio.google.com/apikey

## Executar no computador
```bash
npm install
cp .env.example .env
```
Edite `.env` e informe `GEMINI_API_KEY`. Não compartilhe essa chave.

```bash
npm run dev
```
Abra `http://localhost:5173` no computador. O frontend encaminha `/api` para o backend local.

## Instalar no Android
Para instalar como PWA, o app precisa estar hospedado em um endereço HTTPS (ou em `localhost`, apenas para testes locais). Depois:
1. Abra o endereço HTTPS no Chrome do Android.
2. Abra o menu ⋮ do Chrome.
3. Escolha **Instalar app** ou **Adicionar à tela inicial**.
4. Confirme. O Knowledge OS aparecerá na tela inicial e abrirá em modo de aplicativo.

O botão **Instalar app** também aparece no cabeçalho quando o Chrome disponibiliza a instalação.

## Publicar para acessar pelo Android
Este projeto tem frontend e backend, então não basta abrir o arquivo HTML no celular. Publique a aplicação em um serviço que execute Node.js e ofereça HTTPS. Configure no ambiente do serviço:
- `GEMINI_API_KEY`: sua chave privada.
- `GEMINI_MODEL`: opcional; padrão `gemini-2.5-flash`.
- `PORT`: normalmente fornecida pelo próprio serviço.

Comandos de produção:
```bash
npm install
npm run build
npm start
```
O servidor Express entrega os arquivos compilados de `dist` e atende as rotas `/api`.

## Limitações importantes
- O protótipo não tem autenticação nem banco de dados remoto.
- Anotações e resultados ficam no armazenamento local do navegador/aparelho. Limpar os dados do navegador pode apagá-los; não há sincronização entre dispositivos.
- O service worker mantém arquivos da interface em cache para carregamento básico offline, mas a análise pelo Gemini exige internet e o backend disponível.
- O mapa é uma visualização simples, ainda não é uma rede integrada entre todas as anotações.
- A IA pode errar. Confira conceitos, relações, questões e respostas antes de usar para estudar.
- Não insira dados identificáveis de pacientes nem outras informações sensíveis.
- Antes de abrir ao público, implemente autenticação, banco de dados, limites de uso, proteção contra abuso e controles de privacidade.

## Custos
Cada análise consome tokens da Gemini API. O custo varia conforme o tamanho das notas e a resposta. Consulte os preços e limites atuais: https://ai.google.dev/gemini-api/docs/pricing
