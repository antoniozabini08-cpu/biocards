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

// Mais duas anotações de exemplo, que compartilham conceitos com a da insulina,
// para experimentar a aba Conexões sem chave Gemini.
const c = (id, name, definition, source_excerpt, confidence = 'alta') => ({ id, name, definition, source_excerpt, confidence });
const r = (from, to, type, explanation, confidence = 'alta') => ({ from, to, type, explanation, evidence: explanation, confidence });

export const sampleNotes = [
  { id: 'exemplo-insulina', title: 'Fisiologia da insulina (exemplo)', text: sampleNote, result: { ...sampleResult, links: { checked: true, sameAs: [], crossLinks: [] } } },
  {
    id: 'exemplo-diabetes', title: 'Diabetes tipo 2 (exemplo)',
    text: 'O diabetes mellitus tipo 2 é caracterizado por hiperglicemia crônica. Sua principal base fisiopatológica é a resistência à insulina, associada a uma disfunção progressiva das células beta pancreáticas. A obesidade, especialmente a gordura visceral, aumenta a resistência à insulina. Com o tempo, as células beta não conseguem compensar com maior secreção de insulina, e a glicemia se eleva.',
    result: {
      summary: 'O diabetes tipo 2 combina resistência à insulina, agravada pela obesidade visceral, com falência progressiva das células beta, o que eleva a glicemia de forma crônica.',
      concepts: [
        c('dm2', 'Diabetes tipo 2', 'Doença caracterizada por hiperglicemia crônica.', 'caracterizado por hiperglicemia crônica'),
        c('hiper', 'Hiperglicemia', 'Glicemia persistentemente elevada.', 'hiperglicemia crônica'),
        c('resist', 'Resistência à insulina', 'Principal base fisiopatológica do diabetes tipo 2.', 'Sua principal base fisiopatológica é a resistência à insulina'),
        c('beta', 'Células beta', 'Células pancreáticas que sofrem disfunção progressiva.', 'disfunção progressiva das células beta'),
        c('obes', 'Obesidade visceral', 'Excesso de gordura visceral que aumenta a resistência à insulina.', 'A obesidade, especialmente a gordura visceral'),
        c('secr', 'Secreção de insulina', 'Resposta compensatória das células beta que falha com o tempo.', 'compensar com maior secreção de insulina'),
        c('glic', 'Glicemia', 'Nível de glicose no sangue, que se eleva com a progressão.', 'a glicemia se eleva')
      ],
      relationships: [
        r('dm2', 'hiper', 'caracteriza-se por', 'O diabetes tipo 2 é caracterizado por hiperglicemia crônica.'),
        r('resist', 'dm2', 'é base de', 'A resistência à insulina é a principal base fisiopatológica.'),
        r('obes', 'resist', 'aumenta', 'A obesidade visceral aumenta a resistência à insulina.'),
        r('beta', 'secr', 'realizam', 'As células beta tentam compensar com maior secreção.'),
        r('secr', 'resist', 'compensa', 'A maior secreção tenta compensar a resistência.', 'media'),
        r('beta', 'dm2', 'disfunção contribui para', 'A disfunção das células beta participa da doença.'),
        r('hiper', 'glic', 'é elevação de', 'Hiperglicemia é a glicemia elevada.', 'media')
      ],
      flashcards: [
        { front: 'Qual a principal base fisiopatológica do diabetes tipo 2?', back: 'A resistência à insulina.', concept: 'Resistência à insulina' },
        { front: 'Que tipo de gordura mais aumenta a resistência à insulina?', back: 'A gordura visceral.', concept: 'Obesidade visceral' }
      ],
      questions: [
        { type: 'discursiva', prompt: 'Por que a glicemia se eleva com a progressão do diabetes tipo 2?', options: [], answer: 'Porque as células beta deixam de conseguir compensar a resistência à insulina com maior secreção.', explanation: 'A anotação descreve a falha da compensação ao longo do tempo.', concept: 'Células beta' }
      ],
      gaps: ['A anotação não explica os mecanismos da disfunção das células beta.'],
      links: { checked: true, sameAs: [], crossLinks: [
        { from: 'resist', toKey: 'captacao de glicose', toName: 'Captação de glicose', toNotes: [{ noteId: 'exemplo-insulina', title: 'Fisiologia da insulina (exemplo)' }], type: 'reduz', explanation: 'Inferência: a anotação anterior descreve que a resistência reduz a eficiência da captação; esta anotação não detalha o mecanismo.', evidence: 'Sua principal base fisiopatológica é a resistência à insulina', confidence: 'media' }
      ] }
    }
  },
  {
    id: 'exemplo-exercicio', title: 'Exercício físico e glicose (exemplo)',
    text: 'Durante o exercício físico, a contração muscular estimula a translocação do GLUT4 para a membrana por uma via independente da insulina, mediada em parte pela AMPK. Por isso o exercício aumenta a captação de glicose mesmo na resistência à insulina. O treino regular também melhora a sensibilidade à insulina.',
    result: {
      summary: 'A contração muscular leva o GLUT4 à membrana por uma via independente da insulina (AMPK), aumentando a captação de glicose mesmo na resistência à insulina; o treino regular melhora a sensibilidade à insulina.',
      concepts: [
        c('exerc', 'Exercício físico', 'Atividade que aumenta a captação de glicose.', 'o exercício aumenta a captação de glicose'),
        c('contr', 'Contração muscular', 'Estímulo que transloca o GLUT4 sem depender da insulina.', 'a contração muscular estimula a translocação do GLUT4'),
        c('ampk', 'AMPK', 'Via que medeia em parte a translocação do GLUT4 no exercício.', 'mediada em parte pela AMPK'),
        c('glut4', 'Transportador GLUT4', 'Transportador de glicose levado à membrana durante a contração.', 'translocação do GLUT4 para a membrana'),
        c('capt', 'Captação de glicose', 'Entrada de glicose no músculo, aumentada pelo exercício.', 'aumenta a captação de glicose'),
        c('resist', 'Resistência à insulina', 'Condição em que o exercício ainda aumenta a captação de glicose.', 'mesmo na resistência à insulina'),
        c('sens', 'Sensibilidade à insulina', 'Resposta à insulina, melhorada pelo treino regular.', 'melhora a sensibilidade à insulina')
      ],
      relationships: [
        r('exerc', 'contr', 'envolve', 'O exercício envolve contração muscular.', 'media'),
        r('contr', 'ampk', 'ativa', 'A contração ativa a AMPK, em parte.', 'media'),
        r('ampk', 'glut4', 'promove translocação', 'A AMPK participa da translocação do GLUT4.', 'media'),
        r('glut4', 'capt', 'aumenta', 'O GLUT4 na membrana aumenta a captação de glicose.'),
        r('exerc', 'resist', 'contorna', 'O exercício aumenta a captação mesmo na resistência à insulina.'),
        r('exerc', 'sens', 'melhora', 'O treino regular melhora a sensibilidade à insulina.')
      ],
      flashcards: [
        { front: 'A translocação do GLUT4 no exercício depende da insulina?', back: 'Não. Ocorre por uma via independente, mediada em parte pela AMPK.', concept: 'GLUT4' }
      ],
      questions: [],
      gaps: ['A anotação não detalha como a AMPK é ativada pela contração.'],
      links: { checked: true,
        sameAs: [{ conceptId: 'glut4', targetKey: 'glut4', targetName: 'GLUT4', targetNotes: [{ noteId: 'exemplo-insulina', title: 'Fisiologia da insulina (exemplo)' }] }],
        crossLinks: [
          { from: 'ampk', toKey: 'via pi3k akt', toName: 'Via PI3K/Akt', toNotes: [{ noteId: 'exemplo-insulina', title: 'Fisiologia da insulina (exemplo)' }], type: 'via alternativa a', explanation: 'A AMPK leva o GLUT4 à membrana por uma via independente da insulina, alternativa à via PI3K/Akt.', evidence: 'por uma via independente da insulina, mediada em parte pela AMPK', confidence: 'alta' },
          { from: 'capt', toKey: 'glicemia', toName: 'Glicemia', toNotes: [{ noteId: 'exemplo-insulina', title: 'Fisiologia da insulina (exemplo)' }, { noteId: 'exemplo-diabetes', title: 'Diabetes tipo 2 (exemplo)' }], type: 'tende a reduzir', explanation: 'Inferência: mais captação de glicose pelo músculo tende a reduzir a glicemia; a anotação não afirma isso.', evidence: 'o exercício aumenta a captação de glicose', confidence: 'baixa' },
          { from: 'exerc', toKey: 'obesidade visceral', toName: 'Obesidade visceral', toNotes: [{ noteId: 'exemplo-diabetes', title: 'Diabetes tipo 2 (exemplo)' }], type: 'contrapõe efeito de', explanation: 'A obesidade visceral aumenta a resistência à insulina e o exercício melhora a sensibilidade; é uma conexão inferida entre as anotações.', evidence: 'O treino regular também melhora a sensibilidade à insulina', confidence: 'baixa' }
        ] }
    }
  }
];
