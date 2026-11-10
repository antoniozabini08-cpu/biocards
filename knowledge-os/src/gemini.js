// Chamada direta do navegador para a Gemini API (sem servidor).
// A chave é informada pelo usuário e fica salva apenas neste navegador.

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MODEL_OPTIONS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];

const confidence = { type: 'STRING', enum: ['alta', 'media', 'baixa'] };

const schema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    concepts: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        id: { type: 'STRING' }, name: { type: 'STRING' }, definition: { type: 'STRING' },
        source_excerpt: { type: 'STRING' }, confidence
      }, required: ['id', 'name', 'definition', 'source_excerpt', 'confidence'] }
    },
    relationships: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        from: { type: 'STRING' }, to: { type: 'STRING' }, type: { type: 'STRING' }, explanation: { type: 'STRING' },
        evidence: { type: 'STRING' }, confidence
      }, required: ['from', 'to', 'type', 'explanation', 'evidence', 'confidence'] }
    },
    flashcards: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        front: { type: 'STRING' }, back: { type: 'STRING' }, concept: { type: 'STRING' }
      }, required: ['front', 'back', 'concept'] }
    },
    questions: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        type: { type: 'STRING', enum: ['multipla_escolha', 'discursiva', 'aplicacao'] },
        prompt: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } },
        answer: { type: 'STRING' }, explanation: { type: 'STRING' }, concept: { type: 'STRING' }
      }, required: ['type', 'prompt', 'options', 'answer', 'explanation', 'concept'] }
    },
    gaps: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['summary', 'concepts', 'relationships', 'flashcards', 'questions', 'gaps']
};

const buildPrompt = (note) => `Você é um organizador acadêmico rigoroso. Analise a anotação fornecida e retorne dados para um segundo cérebro.

REGRAS IMPORTANTES:
- Use somente o que está explicitamente sustentado pela anotação para afirmar fatos.
- Diferencie inferência de informação explícita. Quando uma relação for inferida ou incerta, reduza confidence e explique isso.
- Não invente fatos, referências ou detalhes ausentes.
- Extraia de 4 a 12 conceitos importantes, se o texto permitir. Use nomes curtos (1 a 4 palavras).
- Em relationships, os campos from e to devem repetir exatamente o id de um conceito listado em concepts.
- Relações devem ser semanticamente específicas e curtas (ex.: causa, estimula, inibe, é parte de, depende de, exemplifica).
- Gere até 8 flashcards concisos e até 5 questões variadas. Questões de aplicação só quando o conteúdo permitir; não invente cenários clínicos ou fatos externos.
- Para questões de múltipla escolha, crie 4 alternativas e indique em answer a alternativa correta por extenso. Para as demais, options deve ser uma lista vazia.
- source_excerpt e evidence devem apontar trechos ou ideias presentes na anotação.
- Em gaps, liste dúvidas, termos não definidos ou conexões que exigiriam fonte adicional.

ANOTAÇÃO:
${note}`;

export async function analyzeNote(note, { apiKey, model = DEFAULT_MODEL } = {}) {
  const text = String(note || '').trim();
  if (text.length < 30) throw new Error('Escreva uma anotação com pelo menos 30 caracteres.');
  if (text.length > 30000) throw new Error('Anotação muito extensa para este protótipo. Divida em partes menores.');
  if (!apiKey) throw new Error('Informe sua chave Gemini em Ajustes para analisar anotações.');
  if (!navigator.onLine) throw new Error('Sem conexão com a internet. A análise pela IA precisa estar online.');

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(text) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2,
          maxOutputTokens: 16384
        }
      })
    });
  } catch {
    throw new Error('Não foi possível falar com o Gemini. Verifique sua conexão com a internet.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Erro ${response.status}`;
    if (response.status === 400 && /api key/i.test(message)) throw new Error('Chave Gemini inválida. Confira a chave em Ajustes.');
    if (response.status === 403) throw new Error('A chave não tem permissão para usar a Gemini API. Confira a chave em Ajustes.');
    if (response.status === 404) throw new Error(`Modelo "${model}" não encontrado. Escolha outro em Ajustes.`);
    if (response.status === 429) throw new Error('Limite de uso da Gemini API atingido. Aguarde um pouco e tente novamente.');
    throw new Error(`O Gemini recusou a solicitação: ${message}`);
  }

  const candidate = data?.candidates?.[0];
  const raw = (candidate?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if (!raw) {
    if (data?.promptFeedback?.blockReason) throw new Error('O Gemini bloqueou esta anotação. Revise o conteúdo e tente novamente.');
    throw new Error('O Gemini não retornou conteúdo. Tente novamente.');
  }
  try {
    return normalizeResult(JSON.parse(raw));
  } catch {
    if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('A resposta ficou longa demais e foi cortada. Divida a anotação em partes menores.');
    throw new Error('A resposta do Gemini veio em formato inesperado. Tente novamente.');
  }
}

// Garante que todos os campos existam, para a interface nunca quebrar.
export function normalizeResult(r = {}) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    summary: String(r.summary || ''),
    concepts: arr(r.concepts).map((c, i) => ({ ...c, id: String(c.id || c.name || `c${i}`), name: String(c.name || c.id || `Conceito ${i + 1}`) })),
    relationships: arr(r.relationships),
    flashcards: arr(r.flashcards),
    questions: arr(r.questions).map(q => ({ ...q, options: arr(q.options), type: q.type || 'discursiva' })),
    gaps: arr(r.gaps)
  };
}
