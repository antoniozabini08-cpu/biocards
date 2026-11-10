import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrainCircuit, BookOpen, Network, Layers, ClipboardList, Search, Plus, Sparkles, LoaderCircle, Trash2, ChevronRight, CircleHelp, Lightbulb, Check, X, Menu } from 'lucide-react';
import './style.css';

const starter = `A insulina é um hormônio produzido pelas células beta das ilhotas pancreáticas. Após uma refeição, o aumento da glicemia estimula sua secreção. Nos tecidos muscular e adiposo, a insulina ativa a via PI3K/Akt, promovendo a translocação do transportador GLUT4 para a membrana plasmática. Isso aumenta a captação de glicose pelas células. Na resistência à insulina, a resposta intracelular ao hormônio está prejudicada, reduzindo a eficiência desse processo.`;

function App() {
  const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem('ko_notes') || '[]'));
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(starter);
  const [title, setTitle] = useState('Fisiologia da insulina');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('map');
  const [revealed, setRevealed] = useState({});
  const [answers, setAnswers] = useState({});
  const [health, setHealth] = useState({ configured: false, model: '...' });
  const [search, setSearch] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => { localStorage.setItem('ko_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {}); }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const onInstalled = () => { setIsInstalled(true); setInstallPrompt(null); };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('appinstalled', onInstalled); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  const installApp = async () => { if (!installPrompt) return; await installPrompt.prompt(); setInstallPrompt(null); };

  const saveNote = () => {
    const item = { id: activeId || crypto.randomUUID(), title: title.trim() || 'Anotação sem título', text: draft, result, updated: new Date().toISOString() };
    setNotes(prev => [item, ...prev.filter(n => n.id !== item.id)]);
    setActiveId(item.id);
  };
  const loadNote = (item) => { setActiveId(item.id); setTitle(item.title); setDraft(item.text); setResult(item.result); setError(''); setTab(item.result ? 'map' : 'editor'); };
  const newNote = () => { setActiveId(null); setTitle('Nova anotação'); setDraft(''); setResult(null); setError(''); setTab('editor'); };
  const removeNote = (id) => { setNotes(prev => prev.filter(n => n.id !== id)); if (activeId === id) newNote(); };

  const analyze = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao analisar.');
      setResult(data.result); setTab('map');
      const item = { id: activeId || crypto.randomUUID(), title: title.trim() || 'Anotação sem título', text: draft, result: data.result, updated: new Date().toISOString() };
      setActiveId(item.id); setNotes(prev => [item, ...prev.filter(n => n.id !== item.id)]);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
  const concepts = result?.concepts || [];
  const nodes = useMemo(() => concepts.slice(0, 10), [result]);
  const positions = nodes.map((n, i) => { const a = (Math.PI * 2 * i / Math.max(nodes.length, 1)) - Math.PI / 2; return { ...n, x: 50 + 39 * Math.cos(a), y: 50 + 39 * Math.sin(a) }; });
  const findNode = (name) => positions.find(n => n.name === name);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BrainCircuit size={21}/></div><div><strong>knowledge<span>OS</span></strong><small>SEU SEGUNDO CÉREBRO</small></div></div>
      <button className="new-note" onClick={newNote}><Plus size={17}/> Nova anotação</button>
      <div className="side-label">ESPAÇO DE TRABALHO</div>
      <button className={`nav-item ${tab === 'editor' ? 'active' : ''}`} onClick={() => setTab('editor')}><BookOpen size={17}/> Anotações</button>
      <button className={`nav-item ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}><Network size={17}/> Mapa de conhecimento</button>
      <button className={`nav-item ${tab === 'cards' ? 'active' : ''}`} onClick={() => setTab('cards')}><Layers size={17}/> Flashcards <span className="nav-count">{result?.flashcards?.length || 0}</span></button>
      <button className={`nav-item ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}><ClipboardList size={17}/> Questões <span className="nav-count">{result?.questions?.length || 0}</span></button>
      <div className="side-label recent-label">ANOTAÇÕES RECENTES</div>
      <div className="note-list">{filteredNotes.map(n => <div className={`note-link ${activeId === n.id ? 'selected' : ''}`} key={n.id}><button onClick={() => loadNote(n)}><span className="note-dot"/><span>{n.title}</span></button><button className="delete-note" title="Excluir" onClick={() => removeNote(n.id)}><Trash2 size={13}/></button></div>)}</div>
      <div className="sidebar-bottom"><div className={`api-status ${health.configured ? 'online' : ''}`}><span/>{health.configured ? 'Gemini conectado' : 'API não configurada'}</div><small>Modelo: {health.model}</small></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Meu espaço <ChevronRight size={14}/> <strong>{tab === 'editor' ? 'Anotações' : tab === 'map' ? 'Mapa de conhecimento' : tab === 'cards' ? 'Flashcards' : 'Questões'}</strong></div><div className="top-actions"><span className={`connection-pill ${isOnline ? '' : 'offline'}`}>{isOnline ? 'Online' : 'Sem conexão'}</span>{installPrompt && <button className="install-button" onClick={installApp}>Instalar app</button>}{isInstalled && <span className="installed-label">Aplicativo instalado</span>}<span className="model-pill"><Sparkles size={14}/> Gemini AI</span><div className="avatar">K</div></div></header>
      <div className="content">
        {!health.configured && <div className="setup-banner"><Lightbulb size={18}/><div><strong>Configure sua chave Gemini para começar</strong><p>Copie <code>.env.example</code> para <code>.env</code>, adicione sua chave e reinicie o servidor. Sua chave fica no backend, não no navegador.</p></div></div>}
        {error && <div className="error-banner"><X size={17}/>{error}</div>}

        {tab === 'editor' && <section className="editor-view">
          <div className="page-heading"><div><div className="eyebrow">CAPTURA DE CONHECIMENTO</div><h1>Suas anotações</h1><p>Escreva livremente. A IA identifica os conceitos e constrói conexões.</p></div><button className="button secondary" onClick={saveNote}>Salvar anotação</button></div>
          <div className="editor-card"><input className="title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da anotação"/><div className="editor-meta"><span><span className="green-dot"/> Editor livre</span><span>{draft.length.toLocaleString('pt-BR')} caracteres</span></div><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Comece a escrever seu conhecimento aqui..."/><div className="editor-footer"><span>O conteúdo original será preservado.</span><button className="button primary" disabled={busy || draft.trim().length < 30} onClick={analyze}>{busy ? <><LoaderCircle className="spin" size={16}/> Analisando...</> : <><Sparkles size={16}/> Organizar com IA</>}</button></div></div>
          <div className="privacy-note"><Check size={15}/> Protótipo: as anotações ficam salvas neste navegador. Não use informações pessoais ou dados identificáveis de pacientes.</div>
        </section>}

        {tab === 'map' && <section>
          <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL</div><h1>Mapa de conhecimento</h1><p>Explore como suas ideias se conectam.</p></div><button className="button primary" onClick={() => setTab('editor')}><Plus size={16}/> Nova anotação</button></div>
          {!result ? <div className="empty-state"><div className="empty-icon"><Network size={30}/></div><h2>Seu conhecimento começa aqui</h2><p>Crie uma anotação e peça à IA para identificar conceitos e relações.</p><button className="button primary" onClick={() => setTab('editor')}>Criar primeira anotação</button></div> : <>
            <div className="stats-row"><div className="stat-card"><span>CONCEITOS</span><strong>{result.concepts.length}</strong></div><div className="stat-card"><span>CONEXÕES</span><strong>{result.relationships.length}</strong></div><div className="stat-card"><span>FLASHCARDS</span><strong>{result.flashcards.length}</strong></div><div className="stat-card"><span>QUESTÕES</span><strong>{result.questions.length}</strong></div></div>
            <div className="map-layout"><div className="panel graph-panel"><div className="panel-head"><div><h3>Rede de conceitos</h3><p>Conexões extraídas da sua anotação</p></div><span className="tiny-tag">{result.concepts.length} nós</span></div><div className="graph-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none">{result.relationships.map((r,i) => { const a=findNode(r.from), b=findNode(r.to); return a&&b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8191a8" strokeWidth="0.35" strokeOpacity=".75"/> : null; })}</svg>{positions.map((n,i) => <div key={n.id} className={`graph-node node-${i%5}`} style={{left:`${n.x}%`,top:`${n.y}%`}} title={n.definition}>{n.name}</div>)}</div><div className="graph-legend"><span><i className="legend-dot"/> Conceito extraído</span><span><i className="legend-line"/> Relação identificada</span></div></div>
              <div className="panel summary-panel"><div className="panel-head"><div><h3>Síntese da IA</h3><p>Resumo da anotação</p></div><Sparkles size={17} color="#8b7cf6"/></div><p className="summary-text">{result.summary}</p><div className="panel-divider"/><h4>Conceitos identificados</h4><div className="concept-list">{result.concepts.map(c => <div className="concept-row" key={c.id}><div><strong>{c.name}</strong><p>{c.definition}</p></div><span className={`confidence ${c.confidence}`}>{c.confidence}</span></div>)}</div></div></div>
            <div className="panel relation-panel"><div className="panel-head"><div><h3>Relações identificadas</h3><p>Confira se as conexões fazem sentido.</p></div></div>{result.relationships.map((r,i)=><div className="relation-row" key={i}><strong>{r.from}</strong><span className="relation-type">{r.type}</span><strong>{r.to}</strong><p>{r.explanation} <small>Confiança: {r.confidence}</small></p></div>)}</div>
            {result.gaps?.length > 0 && <div className="panel gaps-panel"><h3><CircleHelp size={17}/> Pontos que merecem aprofundamento</h3>{result.gaps.map((g,i)=><p key={i}>• {g}</p>)}</div>}
          </>}
        </section>}

        {tab === 'cards' && <section><div className="page-heading"><div><div className="eyebrow">APRENDIZAGEM ATIVA</div><h1>Flashcards</h1><p>Teste sua recuperação ativa. Clique no cartão para revelar a resposta.</p></div></div>{!result?.flashcards?.length ? <div className="empty-state"><div className="empty-icon"><Layers size={30}/></div><h2>Nenhum flashcard ainda</h2><p>Analise uma anotação para gerar cartões de estudo.</p><button className="button primary" onClick={() => setTab('editor')}>Ir para anotações</button></div> : <div className="cards-grid">{result.flashcards.map((c,i)=><button className={`flashcard ${revealed[i]?'revealed':''}`} key={i} onClick={()=>setRevealed(p=>({...p,[i]:!p[i]}))}><span className="card-number">CARTÃO {String(i+1).padStart(2,'0')}</span><span className="card-label">{revealed[i]?'RESPOSTA':'PERGUNTA'}</span><strong>{revealed[i]?c.back:c.front}</strong><span className="card-bottom">{c.concept} · {revealed[i]?'Clique para voltar':'Toque para revelar'}</span></button>)}</div>}</section>}

        {tab === 'questions' && <section><div className="page-heading"><div><div className="eyebrow">TESTE SEU CONHECIMENTO</div><h1>Questões</h1><p>Questões elaboradas a partir do conteúdo das suas anotações.</p></div></div>{!result?.questions?.length ? <div className="empty-state"><div className="empty-icon"><ClipboardList size={30}/></div><h2>Nenhuma questão ainda</h2><p>Analise uma anotação para gerar exercícios.</p><button className="button primary" onClick={() => setTab('editor')}>Ir para anotações</button></div> : <div className="question-list">{result.questions.map((q,i)=><div className="panel question-card" key={i}><div className="question-top"><span>QUESTÃO {i+1}</span><span className="tiny-tag">{q.type.replace('_',' ')}</span></div><h3>{q.prompt}</h3>{q.options?.length>0 && <div className="options">{q.options.map((o,j)=><button key={j} className={`option ${answers[i]===j?'chosen':''}`} onClick={()=>setAnswers(p=>({...p,[i]:j}))}><span>{String.fromCharCode(65+j)}</span>{o}</button>)}</div>}<button className="text-button" onClick={()=>setRevealed(p=>({...p,[`q${i}`]:!p[`q${i}`]}))}>{revealed[`q${i}`]?'Ocultar resposta':'Ver resposta e explicação'}</button>{revealed[`q${i}`]&&<div className="answer-box"><strong>Resposta: {q.answer}</strong><p>{q.explanation}</p></div>}</div>)}</div>}</section>}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
