// Chamada direta do navegador para a Gemini API (sem servidor).
// A chave é informada pelo usuário e fica salva apenas neste navegador.
import { contextBlock } from './linking.js';

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MODEL_OPTIONS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];

const confidence = { type: 'STRING', enum: ['alta', 'media', 'baixa'] };

// Com conceitos de anotações anteriores, a mesma chamada também devolve
// equivalências (same_as) e ligações com essas anotações (cross_links).
const buildSchema = (withContext) => ({
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    concepts: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        id: { type: 'STRING' }, name: { type: 'STRING' }, definition: { type: 'STRING' },
        source_excerpt: { type: 'STRING' }, confidence,
        ...(withContext ? { same_as: { type: 'STRING' } } : {})
      }, required: ['id', 'name', 'definition', 'source_excerpt', 'confidence', ...(withContext ? ['same_as'] : [])] }
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
    gaps: { type: 'ARRAY', items: { type: 'STRING' } },
    ...(withContext ? { cross_links: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        from: { type: 'STRING' }, to_ref: { type: 'STRING' }, type: { type: 'STRING' }, explanation: { type: 'STRING' },
        evidence: { type: 'STRING' }, confidence
      }, required: ['from', 'to_ref', 'type', 'explanation', 'evidence', 'confidence'] }
    } } : {})
  },
  required: ['summary', 'concepts', 'relationships', 'flashcards', 'questions', 'gaps', ...(withContext ? ['cross_links'] : [])]
});

const linkingInstructions = (candidates) => `

CONCEITOS DE ANOTAÇÕES ANTERIORES (servem só para ligar esta anotação às anteriores; não são parte da anotação):
${contextBlock(candidates)}

LIGAÇÃO COM AS ANOTAÇÕES ANTERIORES:
- same_as: para cada conceito desta anotação, se ele for O MESMO conceito de um item da lista acima (sinônimo, sigla, variação de nome), preencha same_as com o código do item (ex.: "k3"). Se for apenas parecido ou relacionado, deixe same_as como "".
- cross_links: até 8 relações relevantes entre um conceito desta anotação (from = id do conceito em concepts) e um item da lista acima (to_ref = código, ex.: "k3"). Use relações específicas e curtas.
- Só crie uma ligação quando o conteúdo desta anotação a sustentar ou a tornar plausível. evidence deve ser um trecho DESTA anotação. Se a ligação depender de inferência, use confidence "baixa" ou "media" e diga isso em explanation.
- Não crie cross_links para um item que já foi indicado em same_as do mesmo conceito. Não invente fatos externos. Se não houver ligação justificável, retorne cross_links como lista vazia.`;

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

// Texto completo enviado ao Gemini (exportado para testes e para estimar o tamanho).
export const buildRequestText = (note, candidates = []) => buildPrompt(note) + (candidates.length ? linkingInstructions(candidates) : '');

export async function analyzeNote(note, { apiKey, model = DEFAULT_MODEL, context = [] } = {}) {
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
        contents: [{ role: 'user', parts: [{ text: buildRequestText(text, context) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: buildSchema(context.length > 0),
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
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('A resposta ficou longa demais e foi cortada. Divida a anotação em partes menores.');
    throw new Error('A resposta do Gemini veio em formato inesperado. Tente novamente.');
  }
  const result = normalizeResult(parsed);
  result.links = context.length ? buildLinks(parsed, result, context) : { checked: true, sameAs: [], crossLinks: [] };
  return result;
}

// Converte os códigos temporários (k1, k2…) da resposta em referências estáveis
// (nome normalizado do conceito anterior + anotações onde ele aparece).
export function buildLinks(parsed, result, context) {
  const refs = new Map(context.map(c => [c.ref, c]));
  const target = (ref) => refs.get(str(ref).trim());
  const rawConcepts = list(isObj(parsed) ? parsed.concepts : []).filter(isObj);
  const sameAs = [];
  rawConcepts.forEach((rc, i) => {
    const t = target(rc.same_as), c = result.concepts[i];
    if (t && c) sameAs.push({ conceptId: c.id, targetKey: t.key, targetName: t.name, targetNotes: t.notes });
  });
  const byId = new Map(result.concepts.map(c => [c.id, c]));
  const byName = new Map(result.concepts.map(c => [c.name.toLowerCase(), c]));
  const seen = new Set();
  const crossLinks = [];
  list(isObj(parsed) ? parsed.cross_links : []).filter(isObj).forEach(l => {
    const from = byId.get(str(l.from)) || byName.get(str(l.from).toLowerCase());
    const t = target(l.to_ref);
    if (!from || !t) return;
    if (sameAs.some(x => x.conceptId === from.id && x.targetKey === t.key)) return;
    const type = str(l.type).trim() || 'relaciona';
    const key = `${from.id}>${t.key}>${type}`;
    if (seen.has(key)) return;
    seen.add(key);
    crossLinks.push({ from: from.id, toKey: t.key, toName: t.name, toNotes: t.notes, type, explanation: str(l.explanation), evidence: str(l.evidence), confidence: conf(l.confidence) });
  });
  return { checked: true, sameAs, crossLinks: crossLinks.slice(0, 8) };
}

// Garante que todos os campos existam e tenham o tipo certo, para a interface
// nunca quebrar — vale para respostas da IA e para dados salvos corrompidos.
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');
const list = (v) => (Array.isArray(v) ? v : []);
const conf = (v) => (['alta', 'media', 'baixa'].includes(v) ? v : 'media');
const QUESTION_TYPES = ['multipla_escolha', 'discursiva', 'aplicacao'];

export function normalizeResult(r) {
  const src = isObj(r) ? r : {};
  const usedIds = new Set();
  const concepts = list(src.concepts).filter(isObj).map((c, i) => {
    const name = str(c.name).trim() || str(c.id).trim() || `Conceito ${i + 1}`;
    let id = str(c.id).trim() || name;
    if (usedIds.has(id)) { let k = 2; while (usedIds.has(`${id}-${k}`)) k++; id = `${id}-${k}`; }
    usedIds.add(id);
    return { id, name, definition: str(c.definition), source_excerpt: str(c.source_excerpt), confidence: conf(c.confidence) };
  });
  const relationships = list(src.relationships).filter(isObj)
    .map(x => ({ from: str(x.from), to: str(x.to), type: str(x.type).trim() || 'relaciona', explanation: str(x.explanation), evidence: str(x.evidence), confidence: conf(x.confidence) }))
    .filter(x => x.from && x.to);
  const flashcards = list(src.flashcards).filter(isObj)
    .map(x => ({ front: str(x.front), back: str(x.back), concept: str(x.concept) }))
    .filter(x => x.front || x.back);
  const questions = list(src.questions).filter(isObj)
    .map(x => ({ type: QUESTION_TYPES.includes(x.type) ? x.type : 'discursiva', prompt: str(x.prompt), options: list(x.options).map(str).filter(Boolean), answer: str(x.answer), explanation: str(x.explanation), concept: str(x.concept) }))
    .filter(x => x.prompt);
  const gaps = list(src.gaps).map(str).filter(Boolean);
  return { summary: str(src.summary), concepts, relationships, flashcards, questions, gaps, links: normalizeLinks(src.links, usedIds) };
}

function normalizeLinks(l, conceptIds) {
  const src = isObj(l) ? l : {};
  const notesList = (v) => list(v).filter(isObj).map(n => ({ noteId: str(n.noteId), title: str(n.title) })).filter(n => n.noteId);
  return {
    checked: src.checked === true,
    sameAs: list(src.sameAs).filter(isObj)
      .map(x => ({ conceptId: str(x.conceptId), targetKey: str(x.targetKey), targetName: str(x.targetName), targetNotes: notesList(x.targetNotes) }))
      .filter(x => conceptIds.has(x.conceptId) && x.targetKey),
    crossLinks: list(src.crossLinks).filter(isObj)
      .map(x => ({ from: str(x.from), toKey: str(x.toKey), toName: str(x.toName), toNotes: notesList(x.toNotes), type: str(x.type).trim() || 'relaciona', explanation: str(x.explanation), evidence: str(x.evidence), confidence: conf(x.confidence) }))
      .filter(x => conceptIds.has(x.from) && x.toKey)
  };
}

// Lê as anotações salvas sem nunca quebrar. Recupera o que der; se algo estiver
// corrompido, devolve `damaged: true` para o app guardar uma cópia do original.
export function parseSavedNotes(raw) {
  if (raw == null || raw === '') return { notes: [], damaged: false };
  let data;
  try { data = JSON.parse(raw); } catch { return { notes: [], damaged: true }; }
  if (!Array.isArray(data)) return { notes: [], damaged: true };
  let damaged = false;
  const seen = new Set();
  const notes = [];
  data.forEach((n, i) => {
    if (!isObj(n)) { damaged = true; return; }
    let id = str(n.id).trim() || `recuperada-${i}`;
    while (seen.has(id)) id += '-b';
    seen.add(id);
    const title = str(n.title).trim() || 'Anotação sem título';
    const text = str(n.text);
    let result = null;
    if (isObj(n.result)) result = normalizeResult(n.result);
    else if (n.result != null) damaged = true;
    if (id !== n.id || title !== n.title || text !== n.text) damaged = true;
    notes.push({ id, title, text, result, updated: str(n.updated), analyzedText: str(n.analyzedText) });
  });
  return { notes, damaged };
}
