import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Waypoints, ArrowRight, ArrowLeft, BookOpen, Link2, Filter } from 'lucide-react';
import KnowledgeMap from './KnowledgeMap.jsx';
import { buildCrossMap, analyzedNotes } from './crossMap.js';

const LEGEND = [
  { swatch: 'shared', label: 'Ponte entre anotações' },
  { swatch: 'central', label: 'Conceito central' },
  { swatch: 'linked', label: 'Conceito conectado' },
  { swatch: 'isolated', label: 'Sem conexões' }
];
const LINES = [
  { line: '', label: 'Relação dentro de uma anotação' },
  { line: 'km-line-cross', label: 'Ligação entre anotações (IA)' },
  { line: 'km-line-dashed', label: 'Incerta' }
];
const AUTO_FILTER_ABOVE = 45; // acima disso, começa mostrando só pontes e vizinhos
const MAX_DESKTOP = 70, MAX_PHONE = 40; // limite de conceitos desenhados para o mapa continuar legível

function useIsPhone() {
  const query = '(max-width: 650px)';
  const [phone, setPhone] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setPhone(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}

export default function CrossView({ notes, onOpenNote, onGoEditor, onLoadSamples }) {
  const analyzed = useMemo(() => analyzedNotes(notes), [notes]);
  const [excluded, setExcluded] = useState(() => new Set());
  const [onlyShared, setOnlyShared] = useState(null); // null = decide sozinho pelo tamanho
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);
  const maxConcepts = useIsPhone() ? MAX_PHONE : MAX_DESKTOP;

  const noteIds = useMemo(() => new Set(analyzed.filter(n => !excluded.has(n.id)).map(n => n.id)), [analyzed, excluded]);
  const full = useMemo(() => buildCrossMap(notes, { noteIds, maxConcepts }), [notes, noteIds, maxConcepts]);
  const filterOn = (onlyShared ?? full.totalConcepts > AUTO_FILTER_ABOVE) && full.shared.length > 0;
  const view = useMemo(() => (filterOn ? buildCrossMap(notes, { noteIds, onlyShared: true, maxConcepts }) : full), [filterOn, full, notes, noteIds, maxConcepts]);

  const openNote = (id) => { const n = notes.find(x => x.id === id); if (n) onOpenNote(n); };
  const focus = (id) => { setSelected(id); mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const toggleNote = (id) => setExcluded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const heading = <div className="page-heading"><div><div className="eyebrow">VISÃO INTEGRADA</div><h1>Conexões entre anotações</h1><p>Um mapa único com os conceitos de todas as anotações analisadas. Os conceitos em destaque aparecem em mais de uma anotação.</p></div></div>;

  if (analyzed.length < 2) {
    return <section>{heading}
      <div className="empty-state"><div className="empty-icon"><Waypoints size={30} /></div>
        <h2>{analyzed.length === 0 ? 'Nenhuma anotação analisada ainda' : 'Falta pelo menos mais uma anotação analisada'}</h2>
        <p>Analise duas ou mais anotações com a IA para cruzar o conhecimento entre elas. O cruzamento é feito no próprio aparelho e não gasta cota do Gemini.</p>
        <div className="banner-actions center"><button className="button primary" onClick={onGoEditor}>Ir para anotações</button><button className="button secondary" onClick={onLoadSamples}>Carregar anotações de exemplo</button></div>
      </div>
    </section>;
  }

  const renderDetails = (node, { nodes, onSelect }) => <>
    <div className="km-details-head"><div><span className={`km-swatch km-${node.tier}`} /><strong>{node.name}</strong></div>{node.noteCount > 1 ? <span className="tiny-tag shared-tag">ponte · {node.noteCount} anotações</span> : <span className="tiny-tag cross-tag">1 anotação</span>}</div>
    <div className="cross-defs">{node.occurrences.map(o => <div className="cross-def" key={o.noteId}>
      <button type="button" className="note-chip" onClick={() => openNote(o.noteId)} title="Abrir esta anotação"><BookOpen size={12} /> {o.title}</button>
      {o.nameInNote && o.nameInNote !== node.name && <span className="alias-note">chamado de “{o.nameInNote}” nesta anotação{o.viaAI ? ' (equivalência indicada pela IA)' : ''}</span>}
      <p>{o.definition || 'Sem definição nesta anotação.'}</p>
    </div>)}</div>
    {node.degree === 0 ? <p className="km-hint">Nenhuma relação foi identificada para este conceito.</p> : <ul className="km-relations">
      {node.out.map(e => <li key={`o${e.index}`}><ArrowRight size={13} /><span className="relation-type">{e.type}</span><button type="button" onClick={() => onSelect(nodes[e.t].id)}>{nodes[e.t].name}</button>{e.cross && <span className="cross-badge">entre anotações</span>}<small className="source-note">{e.sources.map(s => s.title).join(', ')}</small></li>)}
      {node.in.map(e => <li key={`i${e.index}`}><ArrowLeft size={13} /><button type="button" onClick={() => onSelect(nodes[e.s].id)}>{nodes[e.s].name}</button><span className="relation-type">{e.type}</span>{e.cross && <span className="cross-badge">entre anotações</span>}<small className="source-note">{e.sources.map(s => s.title).join(', ')}</small></li>)}
    </ul>}
  </>;

  return <section>
    {heading}
    <div className="stats-row">
      <div className="stat-card"><span>ANOTAÇÕES</span><strong>{full.used.length}</strong></div>
      <div className="stat-card"><span>CONCEITOS</span><strong>{full.totalConcepts}</strong></div>
      <div className="stat-card"><span>PONTES</span><strong>{full.shared.length}</strong></div>
      <div className="stat-card"><span>LIGAÇÕES ENTRE NOTAS</span><strong>{full.crossCount}</strong></div>
    </div>

    <div className="panel cross-filters">
      <div className="panel-head"><div><h3><Filter size={15} /> Anotações no mapa</h3><p>Toque para incluir ou tirar uma anotação do cruzamento.</p></div></div>
      <div className="chip-row">{analyzed.map(n => <button type="button" key={n.id} className={`filter-chip ${excluded.has(n.id) ? '' : 'on'}`} aria-pressed={!excluded.has(n.id)} onClick={() => toggleNote(n.id)}>{n.title}</button>)}</div>
      <label className={`switch-row ${full.shared.length ? '' : 'disabled'}`}><input type="checkbox" checked={filterOn} disabled={!full.shared.length} onChange={e => setOnlyShared(e.target.checked)} /> Mostrar só as pontes e os conceitos ligados a elas</label>
    </div>

    {full.used.length === 0 ? <div className="empty-state"><h2>Nenhuma anotação selecionada</h2><p>Inclua pelo menos uma anotação acima.</p></div> : <>
      <div className="panel graph-panel" ref={mapRef}>
        <div className="panel-head"><div><h3>Mapa integrado</h3><p>{filterOn ? `Mostrando ${view.concepts.length} de ${full.totalConcepts} conceitos: as pontes e os conceitos ligados a elas.` : 'As setas mostram o sentido de cada relação.'}</p></div><span className="tiny-tag">{view.concepts.length} conceitos</span></div>
        {view.hidden > 0 && <p className="km-warning">Para manter o mapa legível, {view.hidden} conceitos menos conectados ficaram de fora. Tire algumas anotações do cruzamento ou ative o filtro de pontes.</p>}
        <KnowledgeMap concepts={view.concepts} relationships={view.relationships} selectedId={selected} onSelect={setSelected}
          legend={LEGEND} lines={LINES} renderDetails={renderDetails} maxHeight={(narrow) => (narrow ? 2000 : 2400)} />
      </div>

      <div className="map-layout">
        <div className="panel">
          <div className="panel-head"><div><h3><Waypoints size={15} /> Pontes entre anotações</h3><p>Conceitos que aparecem em mais de uma anotação.</p></div></div>
          {full.shared.length === 0 ? <p className="km-hint">Nenhum conceito em comum entre as anotações selecionadas.</p>
            : <div className="bridge-list">{full.shared.map(c => <button type="button" key={c.id} className={`bridge-row ${selected === c.id ? 'selected' : ''}`} onClick={() => focus(c.id)}>
              <strong>{c.name}</strong><span className="bridge-count">{c.noteCount} anotações</span>
              <span className="bridge-notes">{c.occurrences.map(o => o.title).join(' · ')}</span>
            </button>)}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><div><h3><Link2 size={15} /> Anotações relacionadas</h3><p>Conceitos em comum e ligações criadas pela IA.</p></div></div>
          {full.pairs.length === 0 ? <p className="km-hint">Nenhum par de anotações relacionado ainda.</p>
            : <div className="pair-list">{full.pairs.map(p => <div className="pair-row" key={`${p.a.id}|${p.b.id}`}>
              <div className="pair-notes"><button type="button" className="note-chip" onClick={() => onOpenNote(p.a)}>{p.a.title}</button><span>↔</span><button type="button" className="note-chip" onClick={() => onOpenNote(p.b)}>{p.b.title}</button></div>
              {p.concepts.length > 0 && <p>{p.concepts.length} em comum: {p.concepts.join(', ')}</p>}
              {p.links.length > 0 && <p className="pair-links">{p.links.length} {p.links.length === 1 ? 'ligação' : 'ligações'}: {p.links.join('; ')}</p>}
            </div>)}</div>}
          {full.isolatedNotes.length > 0 && <p className="km-hint isolated-hint">Ainda sem relação com as outras: {full.isolatedNotes.map(n => n.title).join(', ')}.</p>}
        </div>
      </div>
    </>}
  </section>;
}
