import React from 'react';
import { Waypoints, X, BookOpen, RefreshCw, LoaderCircle } from 'lucide-react';

// Painel no mapa da anotação: equivalências e ligações com anotações anteriores,
// criadas pela IA na mesma chamada do "Organizar com IA".
export default function NoteLinks({ result, notes, activeId, onOpenNote, onRemove, onReconnect, busy, canAnalyze }) {
  const others = notes.filter(n => n.id !== activeId && n.result?.concepts?.length);
  if (!others.length) return null;
  const { checked, sameAs, crossLinks } = result.links || { checked: false, sameAs: [], crossLinks: [] };
  const conceptName = (id) => result.concepts.find(c => c.id === id)?.name || id;
  const existing = new Set(notes.map(n => n.id));
  const noteChips = (list) => list.map(n => existing.has(n.noteId)
    ? <button type="button" key={n.noteId} className="note-chip" onClick={() => onOpenNote(notes.find(x => x.id === n.noteId))}><BookOpen size={12} /> {n.title}</button>
    : <span key={n.noteId} className="note-chip gone">{n.title} (excluída)</span>);

  const reconnect = <button type="button" className="button secondary small" onClick={onReconnect} disabled={busy || !canAnalyze}>
    {busy ? <><LoaderCircle className="spin" size={14} /> Analisando...</> : <><RefreshCw size={14} /> {checked ? 'Reanalisar ligações' : 'Ligar às outras anotações'}</>}
  </button>;

  return <div className="panel links-panel">
    <div className="panel-head"><div><h3><Waypoints size={15} /> Ligações com outras anotações</h3><p>Criadas pela IA ao analisar esta anotação. Confira e remova as que não fizerem sentido.</p></div></div>

    {!checked ? <div className="links-empty">
      <p className="km-hint">Esta anotação foi analisada antes das ligações existirem, então ainda não foi comparada com as outras.</p>
      {reconnect}
      <p className="field-help">Reanalisa a anotação junto com os conceitos das outras: 1 chamada ao Gemini. Flashcards e questões são gerados de novo.</p>
    </div> : !sameAs.length && !crossLinks.length ? <div className="links-empty">
      <p className="km-hint">A IA não encontrou ligações justificáveis com as anotações anteriores.</p>
    </div> : <>
      {sameAs.length > 0 && <>
        <h4 className="links-sub">Mesmo conceito com outro nome</h4>
        <ul className="link-list">{sameAs.map((l, i) => <li key={`s${i}`} className="link-row">
          <div><strong>{conceptName(l.conceptId)}</strong> <span className="relation-type">= mesmo que</span> <strong>{l.targetName}</strong></div>
          <div className="link-notes">{noteChips(l.targetNotes)}</div>
          <button type="button" className="link-remove" aria-label={`Remover equivalência ${conceptName(l.conceptId)} = ${l.targetName}`} title="Remover" onClick={() => onRemove('sameAs', i)}><X size={14} /></button>
        </li>)}</ul>
      </>}
      {crossLinks.length > 0 && <>
        <h4 className="links-sub">Relações com conceitos de outras anotações</h4>
        <ul className="link-list">{crossLinks.map((l, i) => <li key={`c${i}`} className="link-row">
          <div><strong>{conceptName(l.from)}</strong> <span className="relation-type cross-type">{l.type}</span> <strong>{l.toName}</strong> <span className={`confidence ${l.confidence}`}>{l.confidence}</span></div>
          {l.explanation && <p>{l.explanation}</p>}
          {l.evidence && <p className="km-excerpt">“{l.evidence}”</p>}
          <div className="link-notes">{noteChips(l.toNotes)}</div>
          <button type="button" className="link-remove" aria-label={`Remover ligação ${conceptName(l.from)} ${l.type} ${l.toName}`} title="Remover" onClick={() => onRemove('crossLinks', i)}><X size={14} /></button>
        </li>)}</ul>
      </>}
    </>}
    {checked && <div className="links-footer">{reconnect}<span className="field-help">Útil depois de criar novas anotações: 1 chamada ao Gemini.</span></div>}
  </div>;
}
