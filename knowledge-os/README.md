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
- **Editor em blocos, estilo Notion:**
  - blocos: texto, título, subtítulo, subtítulo menor, lista com marcadores, lista numerada (com sublistas via Tab), **lista expansível** e separador; negrito e itálico;
  - escolha pela barra de blocos, digitando **"/"** (menu filtrável) ou com atalhos: `# `, `## `, `### `, `- `, `1. `, `> ` (lista expansível) e `---`;
  - na lista expansível: Enter no título entra no conteúdo; Enter numa linha vazia no fim sai da lista;
  - a IA recebe a estrutura (títulos e listas) junto com o texto.
- **Ler a nota como você escreveu:** modo **Ler** (as listas expansíveis abrem e fecham com um toque), **Baixar** a nota formatada como página `.html` (abre em qualquer navegador, sem o app) e **PDF** (abre a impressão; escolha "Salvar como PDF"). Anotações antigas, só em texto, são convertidas em blocos ao abrir.
- Editor com **salvamento automático**: salva sozinho enquanto você escreve, ao trocar de anotação e ao fechar a página.
- **Backup em arquivo** (Ajustes → Baixar backup / Importar backup): guarda todas as anotações e análises num .json, sem a chave Gemini. Serve para não perder nada e para passar as anotações para outro aparelho.
- Se o navegador não deixar salvar (janela anônima, arquivo aberto por um visualizador, cookies bloqueados), o app avisa na hora e oferece o backup.
- Extração de conceitos, relações, síntese e pontos a aprofundar usando Gemini.
- **Mapa de conhecimento interativo:**
  - setas mostram o sentido de cada relação, com o nome da relação na seta;
  - cores indicam conceitos centrais, conectados e sem conexões; linha tracejada = relação incerta;
  - toque em um conceito para destacar só as conexões dele e ver definição, trecho de origem e relações;
  - arraste conceitos para reorganizar; use os botões de zoom em mapas grandes;
  - toque em um conceito ou relação nas listas abaixo do mapa para encontrá-lo no mapa.
- **Aba Conexões (mapa cruzado):** junta os mapas de todas as anotações analisadas em um só.
  - conceitos com o mesmo nome em anotações diferentes viram um único conceito (ignora acentos, maiúsculas, artigos e plural simples);
  - os que aparecem em 2 ou mais anotações são **pontes** (destacados em dourado);
  - ao tocar num conceito, mostra a definição de cada anotação e de qual anotação vem cada relação;
  - lista as pontes e os pares de anotações com o que têm em comum; dá para abrir a anotação direto dali;
  - filtros: escolher quais anotações entram e mostrar só as pontes e seus vizinhos;
  - é calculado no próprio aparelho, sem chamar a IA; "Carregar anotações de exemplo" permite testar sem chave;
  - para continuar legível, desenha no máximo 70 conceitos (40 no celular), priorizando pontes e os mais conectados.
- **Cada nova anotação se liga às anteriores (com IA, na mesma chamada):**
  - ao tocar em **Organizar com IA**, o app escolhe no aparelho os conceitos das outras anotações mais parecidos com a nova (no máximo 200) e os envia junto;
  - na mesma resposta, a IA indica **equivalências** (mesmo conceito com outro nome, ex.: "Glicose no sangue" = "Glicemia") e **ligações** com conceitos das outras anotações, com explicação, trecho que justifica e confiança;
  - não há chamada extra: o pedido fica ~500 tokens maior com poucas anotações e ~2.500 com muitas;
  - as ligações aparecem no painel "Ligações com outras anotações" (no mapa da nota) e em dourado na aba Conexões; dá para remover as erradas;
  - anotações analisadas antes desta função mostram o botão "Ligar às outras anotações" (1 chamada).
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
- Ligações entre anotações são criadas quando uma nota é analisada: ela se liga às anteriores. Duas anotações antigas só se ligam se uma delas for reanalisada.
- Ligações entre anotações costumam ser inferências: confira antes de estudar por elas.
- Sem conta nem sincronização: as anotações ficam no navegador. Limpar os dados do navegador apaga as anotações; faça backups de vez em quando.
- A análise pelo Gemini exige internet.
- A IA pode errar. Confira conceitos, relações, questões e respostas antes de estudar por eles.
- Não insira dados identificáveis de pacientes nem outras informações sensíveis.
