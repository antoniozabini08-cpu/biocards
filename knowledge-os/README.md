# Knowledge OS — Segundo cérebro (PWA)

Protótipo de segundo cérebro que roda **inteiro no navegador**, sem servidor. Funciona no computador e no Android, e pode ser instalado na tela inicial como aplicativo (PWA).

## Usar agora, sem instalar nada
O arquivo pronto está em **`site/index.html`**: todo o app está nesse único arquivo.

- **Abrir direto:** dê dois cliques em `site/index.html`. O app abre no navegador.
- **Publicar (Netlify, GitHub Pages etc.):** envie a pasta `site/` inteira. No Netlify, basta arrastar a pasta para a área de deploy.

Depois de abrir:
1. Vá em **Ajustes** e cole sua chave da Gemini API (crie em https://aistudio.google.com/apikey).
2. Em **Anotações**, escreva ou cole o conteúdo e toque em **Organizar com IA**.
3. Sem chave, você ainda pode tocar em **Ver exemplo** para conhecer o mapa.

## O que o app faz
- Editor de anotações, salvas no armazenamento do navegador.
- Extração de conceitos, relações, síntese e pontos a aprofundar usando Gemini.
- **Mapa de conhecimento interativo:**
  - setas mostram o sentido de cada relação, com o nome da relação na seta;
  - cores indicam conceitos centrais, conectados e sem conexões; linha tracejada = relação incerta;
  - toque em um conceito para destacar só as conexões dele e ver definição, trecho de origem e relações;
  - arraste conceitos para reorganizar; use os botões de zoom em mapas grandes;
  - toque em um conceito ou relação nas listas abaixo do mapa para encontrá-lo no mapa.
- Flashcards e questões com respostas e explicações.
- Interface para celular com navegação inferior; instalável como PWA.

## Instalar no Android
O app precisa estar publicado em um endereço HTTPS (por exemplo, no Netlify):
1. Abra o endereço no Chrome do Android.
2. Menu ⋮ → **Instalar app** (ou **Adicionar à tela inicial**).

Abrindo o arquivo direto do celular (sem publicar), o app funciona, mas não pode ser instalado nem usado offline.

## Sobre a chave Gemini
- A chave fica salva apenas no navegador do aparelho e é enviada direto para o Google. Não passa por nenhum outro servidor.
- Quem usar o mesmo aparelho e navegador pode ver a chave. Use uma chave só sua e, se precisar, apague-a em **Ajustes** ou no AI Studio.
- Cada análise consome a sua cota da Gemini API: https://ai.google.dev/gemini-api/docs/pricing

## Desenvolvimento
Requer Node.js 20 ou superior.
```bash
npm install
npm run dev     # servidor de desenvolvimento em http://localhost:5173
npm run build   # gera site/index.html (um único arquivo)
```
Depois de alterar o código em `src/`, rode `npm run build` para atualizar a pasta `site/`.

## Limitações
- Sem conta nem sincronização: as anotações ficam no navegador. Limpar os dados do navegador apaga as anotações.
- A análise pelo Gemini exige internet.
- A IA pode errar. Confira conceitos, relações, questões e respostas antes de estudar por eles.
- Não insira dados identificáveis de pacientes nem outras informações sensíveis.
