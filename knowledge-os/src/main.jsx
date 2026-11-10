import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrainCircuit, BookOpen, Network, Layers, ClipboardList, Plus, Sparkles, LoaderCircle, Trash2, ChevronRight, CircleHelp, Lightbulb, Check, X, Settings, KeyRound, Eye, EyeOff } from 'lucide-react';
import KnowledgeMap from './KnowledgeMap.jsx';
import { analyzeNote, normalizeResult, DEFAULT_MODEL, MODEL_OPTIONS } from './gemini.js';
import { sampleNote, sampleResult, sampleTitle } from './sample.js';
import './style.css';

// localStorage pode falhar (modo privado, arquivo aberto localmente em alguns navegadores).
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* sem armazenamento */ } }
};
const loadNotes = () => { try { return JSON.parse(store.get('ko_notes', '[]')).map(n => ({ ...n, result: n.result ? normalizeResult(n.result) : null })); } catch { return []; } };
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const TAB_NAMES = { editor: 'Anotações', map: 'Mapa de conhecimento', cards: 'Flashcards', questions: 'Questões', settings: 'Ajustes' };

function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(sampleNote);
  const [title, setTitle] = useState(sampleTitle);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('map');
  const [revealed, setRevealed] = useState({});
  const [answers, setAnswers] = useState({});
  const [apiKey, setApiKey] = useState(() => store.get('ko_gemini_key', ''));
  const [model, setModel] = useState(() => store.get('ko_gemini_model', DEFAULT_MODEL));
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [modelDraft, setModelDraft] = useState(model);
  const [showKey, setShowKey] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mapRef = useRef(null);

  useEffect(() => { store.set('ko_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => {
    // Service worker só funciona em http(s); ao abrir o arquivo direto (file://) o app funciona sem ele.
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
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

  const showResult = (r) => { setResult(r); setRevealed({}); setAnswers({}); setSelectedConcept(null); };
  const saveNote = () => {
    const item = { id: activeId || newId(), title: title.trim() || 'Anotação sem título', text: draft, result, updated: new Date().toISOString() };
    setNotes(prev => [item, ...prev.filter(n => n.id !== item.id)]);
    setActiveId(item.id); setIsSample(false);
  };
  const loadNote = (item) => { setActiveId(item.id); setTitle(item.title); setDraft(item.text); showResult(item.result); setError(''); setIsSample(false); setTab(item.result ? 'map' : 'editor'); };
  const newNote = () => { setActiveId(null); setTitle('Nova anotação'); setDraft(''); showResult(null); setError(''); setIsSample(false); setTab('editor'); };
  const removeNote = (id) => { setNotes(prev => prev.filter(n => n.id !== id)); if (activeId === id) newNote(); };
  const loadSample = () => { setActiveId(null); setTitle(sampleTitle); setDraft(sampleNote); showResult(normalizeResult(sampleResult)); setError(''); setIsSample(true); setTab('map'); };

  const saveSettings = () => {
    const key = keyDraft.trim();
    const m = modelDraft.trim() || DEFAULT_MODEL;
    if (key) store.set('ko_gemini_key', key); else store.remove('ko_gemini_key');
    store.set('ko_gemini_model', m);
    setApiKey(key); setModel(m); setModelDraft(m);
    setSavedMsg(key ? 'Ajustes salvos neste navegador.' : 'Chave removida deste navegador.');
    setTimeout(() => setSavedMsg(''), 3000);
  };
  const clearKey = () => { setKeyDraft(''); store.remove('ko_gemini_key'); setApiKey(''); setSavedMsg('Chave removida deste navegador.'); setTimeout(() => setSavedMsg(''), 3000); };

  const analyze = async () => {
    if (!apiKey) { setError('Informe sua chave Gemini em Ajustes para analisar anotações.'); setTab('settings'); return; }
    setBusy(true); setError('');
    try {
      const r = await analyzeNote(draft, { apiKey, model });
      showResult(r); setTab('map'); setIsSample(false);
      const item = { id: activeId || newId(), title: title.trim() || 'Anotação sem título', text: draft, result: r, updated: new Date().toISOString() };
      setActiveId(item.id); setNotes(prev => [item, ...prev.filter(n => n.id !== item.id)]);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const selectFromList = (id) => {
    setSelectedConcept(id);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const conceptName = (ref) => {
    const c = result?.concepts.find(x => x.id === ref) || result?.concepts.find(x => x.name?.toLowerCase() === String(ref).toLowerCase());
    return c ? c.name : ref;
  };

  const navButton = (id, Icon, label, count) => <button className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={17}/> {label}{count != null && <span className="nav-count">{count}</span>}</button>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BrainCircuit size={21}/></div><div><strong>knowledge<span>OS</span></strong><small>SEU SEGUNDO CÉREBRO</small></div></div>
      <button className="new-note" onClick={newNote}><Plus size={17}/> Nova anotação</button>
      <div className="side-label">ESPAÇO DE TRABALHO</div>
      {navButton('editor', BookOpen, 'Anotações')}
      {navButton('map', Network, 'Mapa')}
      {navButton('cards', Layers, 'Flashcards', result?.flashcards?.length || 0)}
      {navButton('questions', ClipboardList, 'Questões', result?.questions?.length || 0)}
      {navButton('settings', Settings, 'Ajustes')}
      <div className="side-label recent-label">ANOTAÇÕES RECENTES</div>
      <div className="note-list">{notes.map(n => <div className={`note-link ${activeId === n.id ? 'selected' : ''}`} key={n.id}><button onClick={() => loadNote(n)}><span className="note-dot"/><span>{n.title}</span></button><button className="delete-note" title="Excluir" onClick={() => removeNote(n.id)}><Trash2 size={13}/></button></div>)}</div>
      <div className="sidebar-bottom"><div className={`api-status ${apiKey ? 'online' : ''}`}><span/>{apiKey ? 'Chave Gemini configurada' : 'Chave não configurada'}</div><small>Modelo: {model}</small></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Meu espaço <ChevronRight size={14}/> <strong>{TAB_NAMES[tab]}</strong></div><div className="top-actions"><span className={`connection-pill ${isOnline ? '' : 'offline'}`}>{isOnline ? 'Online' : 'Sem conexão'}</span>{installPrompt && <button className="install-button" onClick={installApp}>Instalar app</button>}{isInstalled && <span className="installed-label">Aplicativo instalado</span>}<span className="model-pill"><Sparkles size={14}/> Gemini AI</span><div className="avatar">K</div></div></header>
      <div className="content">
        {!apiKey && tab !== 'settings' && <div className="setup-banner"><Lightbulb size={18}/><div><strong>Adicione sua chave Gemini para analisar suas anotações</strong><p>O app roda inteiro no navegador. A chave fica salva só neste aparelho e é enviada direto para o Google. Enquanto isso, veja um mapa de exemplo.</p><div className="banner-actions"><button className="button primary small" onClick={() => setTab('settings')}><KeyRound size={14}/> Configurar chave</button>{!result && <button className="button secondary small" onClick={loadSample}>Ver exemplo</button>}</div></div></div>}
        {error && <div className="error-banner"><X size={17}/>{error}</div>}

        {tab === 'editor' && <section className="editor-view">
          <div className="page-heading"><div><div className="eyebrow">CAPTURA DE CONHECIMENTO</div><h1>Suas anotações</h1><p>Escreva livremente. A IA identifica os conceitos e constrói conexões.</p></div><button className="button secondary" onClick={saveNote}>Salvar anotação</button></div>
          <div className="editor-card"><input className="title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da anotação"/><div className="editor-meta"><span><span className="green-dot"/> Editor livre</span><span>{draft.length.toLocaleString('pt-BR')} caracteres</span></div><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Comece a escrever seu conhecimento aqui..."/><div className="editor-footer"><span>O conteúdo original será preservado.</span><button className="button primary" disabled={busy || draft.trim().length < 30} onClick={analyze}>{busy ? <><LoaderCircle className="spin" size={16}/> Analisando...</> : <><Sparkles size={16}/> Organizar com IA</>}</button></div></div>
          {notes.length > 0 && <div className="panel mobile-notes"><h3>Anotações salvas</h3>{notes.map(n => <div className={`note-link ${activeId === n.id ? 'selected' : ''}`} key={n.id}><button onClick={() => loadNote(n)}><span className="note-dot"/><span>{n.title}</span></button><button className="delete-note" title="Excluir" aria-label={`Excluir ${n.title}`} onClick={() => removeNote(n.id)}><Trash2 size={15}/></button></div>)}</div>}
          <div className="privacy-note"><Check size={15}/> Protótipo: as anotações ficam salvas neste navegador. Não use informações pessoais ou dados identificáveis de pacientes.</div>
        </section>}

        {tab === 'map' && <section>
          <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL</div><h1>Mapa de conhecimento</h1><p>{isSample ? 'Exemplo gerado a partir da anotação “Fisiologia da insulina”.' : 'Explore como suas ideias se conectam.'}</p></div><button className="button primary" onClick={() => setTab('editor')}><Plus size={16}/> Nova anotação</button></div>
          {!result ? <div className="empty-state"><div className="empty-icon"><Network size={30}/></div><h2>Seu conhecimento começa aqui</h2><p>Crie uma anotação e peça à IA para identificar conceitos e relações.</p><div className="banner-actions center"><button className="button primary" onClick={() => setTab('editor')}>Criar primeira anotação</button><button className="button secondary" onClick={loadSample}>Ver exemplo</button></div></div> : <>
            <div className="stats-row"><div className="stat-card"><span>CONCEITOS</span><strong>{result.concepts.length}</strong></div><div className="stat-card"><span>CONEXÕES</span><strong>{result.relationships.length}</strong></div><div className="stat-card"><span>FLASHCARDS</span><strong>{result.flashcards.length}</strong></div><div className="stat-card"><span>QUESTÕES</span><strong>{result.questions.length}</strong></div></div>
            <div className="panel graph-panel" ref={mapRef}><div className="panel-head"><div><h3>Rede de conceitos</h3><p>As setas mostram o sentido de cada relação.</p></div><span className="tiny-tag">{result.concepts.length} conceitos</span></div>
              <KnowledgeMap concepts={result.concepts} relationships={result.relationships} selectedId={selectedConcept} onSelect={setSelectedConcept}/>
            </div>
            <div className="map-layout">
              <div className="panel summary-panel"><div className="panel-head"><div><h3>Síntese da IA</h3><p>Resumo da anotação</p></div><Sparkles size={17} color="#8b7cf6"/></div><p className="summary-text">{result.summary}</p><div className="panel-divider"/><h4>Conceitos identificados</h4><div className="concept-list">{result.concepts.map(c => <button type="button" className={`concept-row ${selectedConcept === c.id ? 'selected' : ''}`} key={c.id} onClick={() => selectFromList(c.id)}><div><strong>{c.name}</strong><p>{c.definition}</p></div><span className={`confidence ${c.confidence}`}>{c.confidence}</span></button>)}</div></div>
              <div className="panel relation-panel"><div className="panel-head"><div><h3>Relações identificadas</h3><p>Confira se as conexões fazem sentido.</p></div></div>{result.relationships.map((r,i)=><div className="relation-row" key={i}><button type="button" className="relation-node" onClick={() => selectFromList(r.from)}>{conceptName(r.from)}</button><span className="relation-type">{r.type}</span><ChevronRight size={13} className="relation-arrow"/><button type="button" className="relation-node" onClick={() => selectFromList(r.to)}>{conceptName(r.to)}</button><p>{r.explanation} <small>Confiança: {r.confidence}</small></p></div>)}</div>
            </div>
            {result.gaps?.length > 0 && <div className="panel gaps-panel"><h3><CircleHelp size={17}/> Pontos que merecem aprofundamento</h3>{result.gaps.map((g,i)=><p key={i}>• {g}</p>)}</div>}
          </>}
        </section>}

        {tab === 'cards' && <section><div className="page-heading"><div><div className="eyebrow">APRENDIZAGEM ATIVA</div><h1>Flashcards</h1><p>Teste sua recuperação ativa. Clique no cartão para revelar a resposta.</p></div></div>{!result?.flashcards?.length ? <div className="empty-state"><div className="empty-icon"><Layers size={30}/></div><h2>Nenhum flashcard ainda</h2><p>Analise uma anotação para gerar cartões de estudo.</p><button className="button primary" onClick={() => setTab('editor')}>Ir para anotações</button></div> : <div className="cards-grid">{result.flashcards.map((c,i)=><button className={`flashcard ${revealed[i]?'revealed':''}`} key={i} onClick={()=>setRevealed(p=>({...p,[i]:!p[i]}))}><span className="card-number">CARTÃO {String(i+1).padStart(2,'0')}</span><span className="card-label">{revealed[i]?'RESPOSTA':'PERGUNTA'}</span><strong>{revealed[i]?c.back:c.front}</strong><span className="card-bottom">{c.concept} · {revealed[i]?'Clique para voltar':'Toque para revelar'}</span></button>)}</div>}</section>}

        {tab === 'questions' && <section><div className="page-heading"><div><div className="eyebrow">TESTE SEU CONHECIMENTO</div><h1>Questões</h1><p>Questões elaboradas a partir do conteúdo das suas anotações.</p></div></div>{!result?.questions?.length ? <div className="empty-state"><div className="empty-icon"><ClipboardList size={30}/></div><h2>Nenhuma questão ainda</h2><p>Analise uma anotação para gerar exercícios.</p><button className="button primary" onClick={() => setTab('editor')}>Ir para anotações</button></div> : <div className="question-list">{result.questions.map((q,i)=><div className="panel question-card" key={i}><div className="question-top"><span>QUESTÃO {i+1}</span><span className="tiny-tag">{q.type.replace('_',' ')}</span></div><h3>{q.prompt}</h3>{q.options?.length>0 && <div className="options">{q.options.map((o,j)=><button key={j} className={`option ${answers[i]===j?'chosen':''}`} onClick={()=>setAnswers(p=>({...p,[i]:j}))}><span>{String.fromCharCode(65+j)}</span>{o}</button>)}</div>}<button className="text-button" onClick={()=>setRevealed(p=>({...p,[`q${i}`]:!p[`q${i}`]}))}>{revealed[`q${i}`]?'Ocultar resposta':'Ver resposta e explicação'}</button>{revealed[`q${i}`]&&<div className="answer-box"><strong>Resposta: {q.answer}</strong><p>{q.explanation}</p></div>}</div>)}</div>}</section>}

        {tab === 'settings' && <section className="settings-view">
          <div className="page-heading"><div><div className="eyebrow">CONFIGURAÇÃO</div><h1>Ajustes</h1><p>O Knowledge OS roda inteiro no seu navegador, sem servidor.</p></div></div>
          <div className="panel settings-panel">
            <label htmlFor="api-key">Chave da Gemini API</label>
            <div className="key-field"><input id="api-key" type={showKey ? 'text' : 'password'} value={keyDraft} onChange={e => setKeyDraft(e.target.value)} placeholder="Cole sua chave aqui" autoComplete="off" spellCheck={false}/><button type="button" className="icon-button" onClick={() => setShowKey(s => !s)} aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}>{showKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
            <p className="field-help">Crie uma chave gratuita em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.</p>
            <label htmlFor="model">Modelo</label>
            <input id="model" list="model-options" value={modelDraft} onChange={e => setModelDraft(e.target.value)} placeholder={DEFAULT_MODEL}/>
            <datalist id="model-options">{MODEL_OPTIONS.map(m => <option key={m} value={m}/>)}</datalist>
            <p className="field-help">O padrão é {DEFAULT_MODEL}, rápido e econômico.</p>
            <div className="settings-actions"><button className="button primary" onClick={saveSettings}>Salvar ajustes</button>{apiKey && <button className="button secondary" onClick={clearKey}>Remover chave</button>}{savedMsg && <span className="saved-msg"><Check size={14}/> {savedMsg}</span>}</div>
          </div>
          <div className="panel privacy-panel">
            <h3>Como sua chave é usada</h3>
            <p>• A chave fica salva apenas no armazenamento deste navegador. Ela não vai para nenhum servidor além do Google.</p>
            <p>• Quem usar este aparelho e navegador pode ver a chave. Use uma chave só sua e não compartilhe o aparelho.</p>
            <p>• Cada análise consome a sua cota da Gemini API. Você pode limitar ou apagar a chave a qualquer momento no AI Studio.</p>
          </div>
        </section>}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
