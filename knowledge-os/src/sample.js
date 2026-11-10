// Resultado de exemplo para a anotação inicial. Permite ver o mapa sem chave Gemini.
export const sampleTitle = 'Fisiologia da insulina';

export const sampleNote = `A insulina é um hormônio produzido pelas células beta das ilhotas pancreáticas. Após uma refeição, o aumento da glicemia estimula sua secreção. Nos tecidos muscular e adiposo, a insulina ativa a via PI3K/Akt, promovendo a translocação do transportador GLUT4 para a membrana plasmática. Isso aumenta a captação de glicose pelas células. Na resistência à insulina, a resposta intracelular ao hormônio está prejudicada, reduzindo a eficiência desse processo.`;

export const sampleResult = {
  summary: 'A insulina, secretada pelas células beta em resposta ao aumento da glicemia, ativa a via PI3K/Akt nos tecidos muscular e adiposo. Isso leva o GLUT4 à membrana e aumenta a captação de glicose. Na resistência à insulina, essa resposta intracelular fica prejudicada.',
  concepts: [
    { id: 'insulina', name: 'Insulina', definition: 'Hormônio produzido pelas células beta das ilhotas pancreáticas.', source_excerpt: 'A insulina é um hormônio produzido pelas células beta…', confidence: 'alta' },
    { id: 'celulas_beta', name: 'Células beta', definition: 'Células das ilhotas pancreáticas que produzem insulina.', source_excerpt: 'células beta das ilhotas pancreáticas', confidence: 'alta' },
    { id: 'glicemia', name: 'Glicemia', definition: 'Concentração de glicose no sangue; aumenta após uma refeição.', source_excerpt: 'Após uma refeição, o aumento da glicemia…', confidence: 'alta' },
    { id: 'pi3k_akt', name: 'Via PI3K/Akt', definition: 'Via de sinalização intracelular ativada pela insulina.', source_excerpt: 'a insulina ativa a via PI3K/Akt', confidence: 'alta' },
    { id: 'glut4', name: 'GLUT4', definition: 'Transportador de glicose translocado para a membrana plasmática.', source_excerpt: 'translocação do transportador GLUT4', confidence: 'alta' },
    { id: 'membrana', name: 'Membrana plasmática', definition: 'Destino da translocação do GLUT4.', source_excerpt: 'para a membrana plasmática', confidence: 'alta' },
    { id: 'captacao', name: 'Captação de glicose', definition: 'Entrada de glicose nas células, aumentada pelo GLUT4 na membrana.', source_excerpt: 'aumenta a captação de glicose pelas células', confidence: 'alta' },
    { id: 'tecidos', name: 'Músculo e tecido adiposo', definition: 'Tecidos onde a insulina atua sobre a via PI3K/Akt.', source_excerpt: 'Nos tecidos muscular e adiposo', confidence: 'alta' },
    { id: 'resistencia', name: 'Resistência à insulina', definition: 'Estado em que a resposta intracelular à insulina está prejudicada.', source_excerpt: 'Na resistência à insulina, a resposta intracelular…', confidence: 'alta' }
  ],
  relationships: [
    { from: 'celulas_beta', to: 'insulina', type: 'produzem', explanation: 'As células beta produzem a insulina.', evidence: 'produzido pelas células beta', confidence: 'alta' },
    { from: 'glicemia', to: 'insulina', type: 'estimula secreção', explanation: 'O aumento da glicemia estimula a secreção de insulina.', evidence: 'o aumento da glicemia estimula sua secreção', confidence: 'alta' },
    { from: 'insulina', to: 'pi3k_akt', type: 'ativa', explanation: 'A insulina ativa a via PI3K/Akt.', evidence: 'a insulina ativa a via PI3K/Akt', confidence: 'alta' },
    { from: 'pi3k_akt', to: 'tecidos', type: 'atua em', explanation: 'A via é ativada nos tecidos muscular e adiposo.', evidence: 'Nos tecidos muscular e adiposo', confidence: 'alta' },
    { from: 'pi3k_akt', to: 'glut4', type: 'promove translocação', explanation: 'A via promove a translocação do GLUT4.', evidence: 'promovendo a translocação do transportador GLUT4', confidence: 'alta' },
    { from: 'glut4', to: 'membrana', type: 'desloca-se para', explanation: 'O GLUT4 é levado até a membrana plasmática.', evidence: 'para a membrana plasmática', confidence: 'alta' },
    { from: 'glut4', to: 'captacao', type: 'aumenta', explanation: 'O GLUT4 na membrana aumenta a captação de glicose.', evidence: 'Isso aumenta a captação de glicose', confidence: 'media' },
    { from: 'captacao', to: 'glicemia', type: 'reduz', explanation: 'Inferência: mais glicose entrando nas células tende a reduzir a glicemia. Não está explícito no texto.', evidence: 'Inferido a partir da captação de glicose', confidence: 'baixa' },
    { from: 'resistencia', to: 'insulina', type: 'prejudica resposta', explanation: 'Na resistência, a resposta intracelular à insulina está prejudicada.', evidence: 'a resposta intracelular ao hormônio está prejudicada', confidence: 'alta' },
    { from: 'resistencia', to: 'captacao', type: 'reduz eficiência', explanation: 'A resistência reduz a eficiência do processo de captação.', evidence: 'reduzindo a eficiência desse processo', confidence: 'media' }
  ],
  flashcards: [
    { front: 'Quais células produzem a insulina?', back: 'As células beta das ilhotas pancreáticas.', concept: 'Células beta' },
    { front: 'O que estimula a secreção de insulina após uma refeição?', back: 'O aumento da glicemia.', concept: 'Glicemia' },
    { front: 'Qual via de sinalização a insulina ativa no músculo e no tecido adiposo?', back: 'A via PI3K/Akt.', concept: 'Via PI3K/Akt' },
    { front: 'Qual o efeito da translocação do GLUT4 para a membrana?', back: 'Aumenta a captação de glicose pelas células.', concept: 'GLUT4' },
    { front: 'O que caracteriza a resistência à insulina?', back: 'A resposta intracelular ao hormônio está prejudicada.', concept: 'Resistência à insulina' }
  ],
  questions: [
    { type: 'multipla_escolha', prompt: 'Qual evento segue a ativação da via PI3K/Akt pela insulina?', options: ['Secreção de glucagon', 'Translocação do GLUT4 para a membrana plasmática', 'Destruição das células beta', 'Redução da captação de glicose'], answer: 'Translocação do GLUT4 para a membrana plasmática', explanation: 'A anotação afirma que a via PI3K/Akt promove a translocação do GLUT4.', concept: 'Via PI3K/Akt' },
    { type: 'discursiva', prompt: 'Explique por que a resistência à insulina reduz a captação de glicose.', options: [], answer: 'Porque a resposta intracelular à insulina está prejudicada, o que reduz a eficiência da sinalização que leva o GLUT4 à membrana.', explanation: 'A ligação com o GLUT4 é uma inferência a partir da sequência descrita na anotação.', concept: 'Resistência à insulina' }
  ],
  gaps: [
    'A anotação não explica quais etapas da via PI3K/Akt ficam prejudicadas na resistência à insulina.',
    'Não é dito o que acontece com a glicemia depois do aumento da captação de glicose.',
    'Outros tecidos-alvo da insulina (por exemplo, o fígado) não são mencionados.'
  ]
};
