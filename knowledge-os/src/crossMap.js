// Cruza os mapas de várias anotações em um só, sem chamar a IA.
// Conceitos com o mesmo nome (ignorando acentos, maiúsculas, artigos e plural
// simples) viram um único conceito; os que aparecem em 2+ anotações são "pontes".

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ARTICLES = /^(o|a|os|as|um|uma|uns|umas)\s+/;
export const conceptKey = (name) => norm(name).replace(ARTICLES, '');

const RANK = { alta: 3, media: 2, baixa: 1 };
const better = (a, b) => ((RANK[b] || 0) > (RANK[a] || 0) ? b : a);

export function analyzedNotes(notes) {
  return notes.filter(n => n.result && Array.isArray(n.result.concepts) && n.result.concepts.length > 0);
}

/**
 * @param notes      anotações salvas (já normalizadas)
 * @param noteIds    Set com os ids das anotações a incluir (padrão: todas analisadas)
 * @param onlyShared mostra só conceitos-ponte e seus vizinhos diretos
 * @param maxConcepts limite de conceitos desenhados (mantém os mais conectados)
 */
export function buildCrossMap(notes, { noteIds = null, onlyShared = false, maxConcepts = 90 } = {}) {
  const analyzed = analyzedNotes(notes);
  const used = noteIds ? analyzed.filter(n => noteIds.has(n.id)) : analyzed;

  // Plural simples: "hormônios" vira "hormônio" quando o singular também aparece.
  const allKeys = new Set();
  used.forEach(n => n.result.concepts.forEach(c => allKeys.add(conceptKey(c.name))));
  const canonical = (key) => (key.length > 4 && key.endsWith('s') && allKeys.has(key.slice(0, -1)) ? key.slice(0, -1) : key);

  const merged = new Map();
  const edges = new Map();
  used.forEach(note => {
    const local = new Map();
    note.result.concepts.forEach(c => {
      const key = canonical(conceptKey(c.name));
      if (!key) return;
      local.set(norm(c.id), key);
      local.set(norm(c.name), key);
      let m = merged.get(key);
      if (!m) { m = { id: key, names: new Map(), notes: new Map(), confidence: c.confidence }; merged.set(key, m); }
      m.names.set(c.name, (m.names.get(c.name) || 0) + 1);
      if (!m.notes.has(note.id)) m.notes.set(note.id, { noteId: note.id, title: note.title, definition: c.definition, excerpt: c.source_excerpt });
      m.confidence = better(m.confidence, c.confidence);
    });
    const resolve = (value) => {
      const k = norm(value);
      if (local.has(k)) return local.get(k);
      const g = canonical(conceptKey(value));
      return local.has(g) || [...local.values()].includes(g) ? g : null;
    };
    note.result.relationships.forEach(r => {
      const s = resolve(r.from), t = resolve(r.to);
      if (!s || !t || s === t) return;
      const key = `${s}>${t}>${norm(r.type)}`;
      let e = edges.get(key);
      if (!e) { e = { from: s, to: t, type: r.type, explanation: r.explanation, evidence: r.evidence, confidence: r.confidence, notes: new Map() }; edges.set(key, e); }
      e.notes.set(note.id, note.title);
      e.confidence = better(e.confidence, r.confidence);
    });
  });

  let concepts = [...merged.values()].map(m => {
    const name = [...m.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const occurrences = [...m.notes.values()];
    return {
      id: m.id, name, confidence: m.confidence, occurrences, noteCount: occurrences.length,
      definition: occurrences.find(o => o.definition)?.definition || '', source_excerpt: '',
      ...(occurrences.length > 1 ? { tier: 'shared' } : {})
    };
  });
  let relationships = [...edges.values()].map(({ notes: srcs, ...e }) => ({ ...e, sources: [...srcs.entries()].map(([noteId, title]) => ({ noteId, title })) }));

  // Pontes e pares de anotações que compartilham conceitos.
  const shared = concepts.filter(c => c.noteCount > 1).sort((a, b) => b.noteCount - a.noteCount || a.name.localeCompare(b.name, 'pt-BR'));
  const pairMap = new Map();
  shared.forEach(c => {
    const ids = c.occurrences.map(o => o.noteId);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const [a, b] = [ids[i], ids[j]].sort();
      const key = `${a}|${b}`;
      if (!pairMap.has(key)) pairMap.set(key, { a: used.find(n => n.id === a), b: used.find(n => n.id === b), concepts: [] });
      pairMap.get(key).concepts.push(c.name);
    }
  });
  const pairs = [...pairMap.values()].sort((x, y) => y.concepts.length - x.concepts.length);
  const linkedIds = new Set(shared.flatMap(c => c.occurrences.map(o => o.noteId)));
  const isolatedNotes = used.filter(n => !linkedIds.has(n.id));
  const totalConcepts = concepts.length;
  const totalRelationships = relationships.length;

  // Filtro: só pontes e vizinhos diretos.
  if (onlyShared && shared.length) {
    const keep = new Set(shared.map(c => c.id));
    relationships.forEach(r => { if (keep.has(r.from) || keep.has(r.to)) { keep.add(r.from); keep.add(r.to); } });
    concepts = concepts.filter(c => keep.has(c.id));
  }
  // Limite para o mapa continuar legível: mantém pontes e os mais conectados.
  let hidden = 0;
  if (concepts.length > maxConcepts) {
    const degree = new Map();
    relationships.forEach(r => { degree.set(r.from, (degree.get(r.from) || 0) + 1); degree.set(r.to, (degree.get(r.to) || 0) + 1); });
    const ranked = [...concepts].sort((a, b) => (b.noteCount * 10 + (degree.get(b.id) || 0)) - (a.noteCount * 10 + (degree.get(a.id) || 0)));
    const keep = new Set(ranked.slice(0, maxConcepts).map(c => c.id));
    hidden = concepts.length - keep.size;
    concepts = concepts.filter(c => keep.has(c.id));
  }
  const visible = new Set(concepts.map(c => c.id));
  relationships = relationships.filter(r => visible.has(r.from) && visible.has(r.to));

  return { concepts, relationships, shared, pairs, isolatedNotes, used, analyzed, totalConcepts, totalRelationships, hidden };
}
