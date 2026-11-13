// Prepara, sem IA, o "índice" de conceitos das anotações anteriores que vai junto
// na chamada do Organizar com IA, para a nota nova se ligar às antigas.
import { conceptKey } from './crossMap.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['para', 'pela', 'pelo', 'pelas', 'pelos', 'como', 'mais', 'menos', 'entre', 'sobre', 'quando', 'onde', 'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aquele', 'aquela', 'seus', 'suas', 'muito', 'pode', 'podem', 'tambem', 'ainda', 'apos', 'durante', 'cada', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'assim', 'desse', 'dessa', 'deste', 'desta', 'nesse', 'nessa', 'neste', 'nesta', 'sendo', 'estao', 'esta', 'sera', 'foram', 'qual', 'quais', 'porque', 'pois', 'mesmo', 'mesma', 'apenas', 'tanto', 'tipo', 'forma', 'parte']);
// Radical simples: primeiras 5 letras de palavras com 4+ letras (insulina/insulínica -> "insul").
const stems = (text) => new Set(norm(text).split(' ').filter(w => w.length >= 4 && !STOP.has(w)).map(w => w.slice(0, 5)));
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export const MAX_CANDIDATES = 200;   // conceitos anteriores enviados, no máximo
export const WITH_DEFINITION = 40;   // os mais relevantes vão com definição curta

// Todos os conceitos das outras anotações analisadas, sem repetir nomes.
export function buildConceptIndex(notes, excludeNoteId) {
  const map = new Map();
  for (const n of notes) {
    if (n.id === excludeNoteId || !n.result?.concepts?.length) continue;
    for (const c of n.result.concepts) {
      const key = conceptKey(c.name);
      if (!key) continue;
      let e = map.get(key);
      if (!e) { e = { key, name: c.name, definition: c.definition || '', notes: [] }; map.set(key, e); }
      if (!e.definition && c.definition) e.definition = c.definition;
      if (!e.notes.some(x => x.noteId === n.id)) e.notes.push({ noteId: n.id, title: n.title });
    }
  }
  return [...map.values()];
}

// Ordena pelos que têm palavras em comum com a nota nova e limita a quantidade,
// para a chamada não crescer sem parar conforme as anotações se acumulam.
export function selectCandidates(index, text, { max = MAX_CANDIDATES, withDefinition = WITH_DEFINITION } = {}) {
  const words = stems(text);
  return index
    .map(e => {
      let score = 0;
      stems(e.name).forEach(s => { if (words.has(s)) score += 3; });
      stems(e.definition).forEach(s => { if (words.has(s)) score += 1; });
      return { e, score: score + e.notes.length * 0.1 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ e, score }, i) => ({ ...e, ref: `k${i + 1}`, showDefinition: i < withDefinition && score >= 1, score }));
}

// Texto compacto que vai no prompt: "k3: Glicemia — Nível de glicose no sangue".
export function contextBlock(candidates) {
  return candidates.map(c => `${c.ref}: ${c.name}${c.showDefinition && c.definition ? ` — ${cut(c.definition, 90)}` : ''}`).join('\n');
}
