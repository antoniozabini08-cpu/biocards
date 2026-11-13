import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrainCircuit, BookOpen, Network, Layers, ClipboardList, Plus, Sparkles, LoaderCircle, Trash2, ChevronRight, CircleHelp, Lightbulb, Check, X, Settings, KeyRound, Eye, EyeOff, Waypoints, Download, Upload, HardDrive, TriangleAlert, CircleCheck } from 'lucide-react';
import CrossView from './CrossView.jsx';
import NoteLinks from './NoteLinks.jsx';
import { buildConceptIndex, selectCandidates } from './linking.js';
import KnowledgeMap from './KnowledgeMap.jsx';
import { analyzeNote, normalizeResult, parseSavedNotes, DEFAULT_MODEL, MODEL_OPTIONS } from './gemini.js';
import { sampleNote, sampleResult, sampleTitle, sampleNotes } from './sample.js';
import './style.css';

// localStorage pode falhar (janela anônima, arquivo aberto por um visualizador,
// cookies bloqueados, espaço cheio). set() devolve false para o app poder avisar.
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* sem armazenamento */ } }
};
// Testa se o navegador realmente deixa gravar e ler de volta.
function storageWorks() {
  try { localStorage.setItem('ko_test', '1'); const ok = localStorage.getItem('ko_test') === '1'; localStorage.removeItem('ko_test'); return ok; } catch { return false; }
}
const isWebOrigin = /^https?:$/.test(location.protocol);

// Backup em arquivo: funciona em qualquer navegador e serve para trocar de aparelho.
// A chave Gemini nunca vai no backup.
function downloadBackup(notes) {
  const data = { app: 'knowledge-os', version: 1, exportedAt: new Date().toISOString(), notes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `knowledge-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Junta as notas de um backup com as atuais: a versão mais recente de cada nota vence.
function mergeBackup(current, text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('O arquivo não é um backup válido do Knowledge OS.'); }
  const list = Array.isArray(data) ? data : data?.notes;
  if (!Array.isArray(list)) throw new Error('O arquivo não é um backup válido do Knowledge OS.');
  const { notes: incoming } = parseSavedNotes(JSON.stringify(list));
  if (!incoming.length) throw new Error('O backup não tem anotações que possam ser recuperadas.');
  const byId = new Map(current.map(n => [n.id, n]));
  let added = 0, updated = 0, kept = 0;
  incoming.forEach(n => {
    const mine = byId.get(n.id);
    if (!mine) { byId.set(n.id, n); added++; }
    else if ((n.updated || '') > (mine.updated || '')) { byId.set(n.id, n); updated++; }
    else kept++;
  });
  const merged = [...byId.values()].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  return { merged, added, updated, kept };
}
// Carrega as anotações sem quebrar com dado corrompido. Antes de qualquer
// gravação, guarda uma cópia exata do conteúdo original, para nada se perder.
function loadNotes() {
  const raw = store.get('ko_notes', null);
  const { notes, damaged } = parseSavedNotes(raw);
  let backupKey = null;
  if (damaged) {
    backupKey = `ko_notes_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    store.set(backupKey, raw);
  }
  return { notes, backupKey };
}
const initialLoad = loadNotes();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const TAB_NAMES = { editor: 'Anotações', map: 'Mapa de conhecimento', cross: 'Conexões', cards: 'Flashcards', questions: 'Questões', settings: 'Ajustes' };

function App() {
  const [notes, setNotes] = useState(initialLoad.notes);
  // Armazenamento: se o navegador não deixa gravar, o app avisa em vez de perder tudo calado.
  const [storageOk, setStorageOk] = useState(storageWorks);
  const [persisted, setPersisted] = useState(null); // true/false quando o navegador responde
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | pending | saved | error
  const [backupMsg, setBackupMsg] = useState('');
  const [lastBackup, setLastBackup] = useState(() => store.get('ko_last_backup', ''));
  const importRef = useRef(null);
  const [recoveryNotice, setRecoveryNotice] = useState(initialLoad.backupKey);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(sampleNote);
  const [title, setTitle] = useState(sampleTitle);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('map');
  // Estado de revisão (cartões virados, alternativas marcadas) pertence ao resultado
  // em exibição. Cada troca de nota/análise gera uma nova sessão e o estado anterior
  // deixa de valer automaticamente, sem depender de lembrar de zerar.
  const [session, setSession] = useState(0);
  const [review, setReview] = useState({ session: 0, revealed: {}, answers: {} });
  const current = review.session === session ? review : { session, revealed: {}, answers: {} };
  const revealed = current.revealed, answers = current.answers;
  const setRevealed = (fn) => setReview(r => { const base = r.session === session ? r : { session, revealed: {}, answers: {} }; return { ...base, revealed: fn(base.revealed) }; });
  const setAnswers = (fn) => setReview(r => { const base = r.session === session ? r : { session, revealed: {}, answers: {} }; return { ...base, answers: fn(base.answers) }; });
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

  useEffect(() => {
    const ok = store.set('ko_notes', JSON.stringify(notes));
    if (!ok) { setStorageOk(false); setSaveStatus('error'); }
  }, [notes]);
  // Pede ao navegador para não apagar os dados sozinho (vale para o app publicado/instalado).
  useEffect(() => {
    if (!isWebOrigin || !navigator.storage?.persisted) return;
    navigator.storage.persisted().then(async (already) => {
      if (already || !navigator.storage.persist) return setPersisted(already);
      setPersisted(await navigator.storage.persist());
    }).catch(() => {});
  }, []);

  // ---------- Salvamento automático ----------
  // O que você digita é salvo sozinho, 0,6 s depois de parar de digitar, ao trocar de
  // anotação e ao fechar/minimizar a página. Refs guardam os valores mais recentes
  // para o salvamento funcionar mesmo durante o fechamento da página.
  const live = useRef({});
  live.current = { notes, activeId, title, draft, result, isSample };
  const dirty = useRef(false);
  const timer = useRef(null);
  const saveNow = () => {
    clearTimeout(timer.current);
    if (!dirty.current) return live.current.activeId;
    dirty.current = false;
    const { notes: list, activeId: id, title: t, draft: text } = live.current;
    const existing = list.find(n => n.id === id);
    if (!existing && !text.trim()) return id; // nota nova ainda vazia: nada a salvar
    const item = {
      ...(existing || {}),
      id: existing ? existing.id : newId(),
      title: t.trim() || 'Anotação sem título',
      text,
      result: existing ? existing.result : (live.current.result || null),
      updated: new Date().toISOString()
    };
    const next = [item, ...list.filter(n => n.id !== item.id)];
    // Grava já (sem esperar o React), para não perder nada se a página estiver fechando.
    const ok = store.set('ko_notes', JSON.stringify(next));
    live.current = { ...live.current, notes: next, activeId: item.id };
    setNotes(next);
    if (!existing) { setActiveId(item.id); setIsSample(false); }
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    return item.id;
  };
  const edit = (setter) => (e) => {
    setter(e.target.value);
    dirty.current = true;
    setSaveStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, 600);
  };
  useEffect(() => {
    const flush = () => saveNow();
    const onHide = () => { if (document.visibilityState === 'hidden') saveNow(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); document.removeEventListener('visibilitychange', onHide); };
  }, []);

  const exportBackup = () => {
    saveNow();
    downloadBackup(live.current.notes);
    const when = new Date().toISOString();
    store.set('ko_last_backup', when); setLastBackup(when);
    setBackupMsg(`Backup baixado com ${live.current.notes.length} anotação(ões).`);
  };
  const importBackup = async (file) => {
    if (!file) return;
    try {
      saveNow();
      const { merged, added, updated, kept } = mergeBackup(live.current.notes, await file.text());
      setNotes(merged);
      setBackupMsg(`Backup importado: ${added} nova(s), ${updated} atualizada(s)${kept ? `, ${kept} já estavam iguais ou mais recentes aqui` : ''}.`);
    } catch (e) { setBackupMsg(e.message); }
    if (importRef.current) importRef.current.value = '';
  };
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

  const showResult = (r) => { setResult(r); setSession(n => n + 1); setSelectedConcept(null); };
  const saveNote = () => { dirty.current = true; saveNow(); };
  const loadNote = (item) => { saveNow(); setActiveId(item.id); setTitle(item.title); setDraft(item.text); showResult(item.result); setError(''); setIsSample(false); setTab(item.result ? 'map' : 'editor'); };
  const newNote = () => { saveNow(); setActiveId(null); setTitle('Nova anotação'); setDraft(''); showResult(null); setError(''); setIsSample(false); setTab('editor'); };
  const removeNote = (id) => {
    if (activeId === id) { clearTimeout(timer.current); dirty.current = false; }
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeId === id) newNote();
  };
  const loadSample = () => { setActiveId(null); setTitle(sampleTitle); setDraft(sampleNote); showResult(normalizeResult(sampleResult)); setError(''); setIsSample(true); setTab('map'); };

  // Adiciona as anotações de exemplo (sem duplicar) para experimentar a aba Conexões.
  const loadSampleNotes = () => {
    const now = new Date().toISOString();
    setNotes(prev => [...prev, ...sampleNotes.filter(sn => !prev.some(n => n.id === sn.id)).map(sn => ({ ...sn, result: normalizeResult(sn.result), updated: now }))]);
  };

  // Remove uma equivalência ou ligação que a IA criou e o usuário considerou errada.
  const removeLink = (kind, index) => {
    if (!result?.links) return;
    const links = { ...result.links, [kind]: result.links[kind].filter((_, i) => i !== index) };
    const updated = { ...result, links };
    setResult(updated);
    if (activeId) setNotes(prev => prev.map(n => (n.id === activeId ? { ...n, result: updated, updated: new Date().toISOString() } : n)));
  };

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
    // Salva antes de chamar a IA: a nota passa a existir (com id) mesmo se a análise falhar.
    dirty.current = true;
    const id = saveNow();
    const text = live.current.draft;
    setBusy(true); setError('');
    try {
      // Conceitos das outras anotações vão na mesma chamada, para a nota nova se ligar a elas.
      const context = selectCandidates(buildConceptIndex(live.current.notes, id), text);
      const r = await analyzeNote(text, { apiKey, model, context });
      // Usa a versão mais recente da nota (o texto pode ter sido editado durante a análise).
      const latest = live.current.notes.find(n => n.id === id) || { id, title: live.current.title.trim() || 'Anotação sem título', text };
      const item = { ...latest, result: r, analyzedText: text, updated: new Date().toISOString() };
      const next = [item, ...live.current.notes.filter(n => n.id !== id)];
      live.current = { ...live.current, notes: next };
      setNotes(next);
      if (live.current.activeId === id) { showResult(r); setTab('map'); setIsSample(false); }
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
      {navButton('cross', Waypoints, 'Conexões')}
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
        {!storageOk && <div className="error-banner storage-banner"><TriangleAlert size={18}/><div><strong>Este navegador não está deixando o app salvar</strong><p>Suas anotações vão se perder ao fechar. Isso costuma acontecer em janela anônima, quando o arquivo é aberto por um visualizador (WhatsApp, Gmail, gerenciador de arquivos) ou com cookies bloqueados. Abra o app direto no Chrome ou no Edge, fora da janela anônima, e baixe um backup agora.</p><div className="banner-actions"><button className="button primary small" onClick={exportBackup}><Download size={14}/> Baixar backup agora</button><button className="button secondary small" onClick={() => setTab('settings')}>Mais detalhes</button></div></div></div>}
        {recoveryNotice && <div className="setup-banner"><Lightbulb size={18}/><div><strong>Algumas anotações salvas estavam corrompidas</strong><p>Recuperamos tudo o que foi possível. Uma cópia do conteúdo original foi guardada neste navegador ({recoveryNotice}).</p><div className="banner-actions"><button className="button secondary small" onClick={() => setRecoveryNotice(null)}>Entendi</button></div></div></div>}
        {error && <div className="error-banner"><X size={17}/>{error}</div>}

        {tab === 'editor' && <section className="editor-view">
          <div className="page-heading"><div><div className="eyebrow">CAPTURA DE CONHECIMENTO</div><h1>Suas anotações</h1><p>Escreva livremente. A IA identifica os conceitos e constrói conexões.</p></div><button className="button secondary" onClick={saveNote}>Salvar anotação</button></div>
          <div className="editor-card"><input className="title-input" value={title} onChange={edit(setTitle)} placeholder="Título da anotação"/><div className="editor-meta"><span className={`save-status ${saveStatus}`}>{saveStatus === 'error' ? <><TriangleAlert size={12}/> Não foi possível salvar neste navegador</> : saveStatus === 'pending' ? <><LoaderCircle className="spin" size={12}/> Salvando…</> : saveStatus === 'saved' ? <><CircleCheck size={12}/> Salvo automaticamente</> : <><span className="green-dot"/> Salvamento automático</>}</span><span>{draft.length.toLocaleString('pt-BR')} caracteres</span></div><textarea value={draft} onChange={edit(setDraft)} placeholder="Comece a escrever seu conhecimento aqui..."/><div className="editor-footer"><span>O texto é salvo sozinho enquanto você escreve.</span><button className="button primary" disabled={busy || draft.trim().length < 30} onClick={analyze}>{busy ? <><LoaderCircle className="spin" size={16}/> Analisando...</> : <><Sparkles size={16}/> Organizar com IA</>}</button></div></div>
          {notes.length > 0 && <div className="panel mobile-notes"><h3>Anotações salvas</h3>{notes.map(n => <div className={`note-link ${activeId === n.id ? 'selected' : ''}`} key={n.id}><button onClick={() => loadNote(n)}><span className="note-dot"/><span>{n.title}</span></button><button className="delete-note" title="Excluir" aria-label={`Excluir ${n.title}`} onClick={() => removeNote(n.id)}><Trash2 size={15}/></button></div>)}</div>}
          <div className="privacy-note"><Check size={15}/> As anotações ficam salvas neste navegador. Faça um backup em Ajustes de vez em quando. Não use informações pessoais ou dados identificáveis de pacientes.</div>
        </section>}

        {tab === 'map' && <section>
          <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL</div><h1>Mapa de conhecimento</h1><p>{isSample ? 'Exemplo gerado a partir da anotação “Fisiologia da insulina”.' : 'Explore como suas ideias se conectam.'}</p></div><button className="button primary" onClick={() => setTab('editor')}><Plus size={16}/> Nova anotação</button></div>
          {!result ? <div className="empty-state"><div className="empty-icon"><Network size={30}/></div><h2>Seu conhecimento começa aqui</h2><p>Crie uma anotação e peça à IA para identificar conceitos e relações.</p><div className="banner-actions center"><button className="button primary" onClick={() => setTab('editor')}>Criar primeira anotação</button><button className="button secondary" onClick={loadSample}>Ver exemplo</button></div></div> : <>
            {(() => { const n = notes.find(x => x.id === activeId); return n?.analyzedText && n.analyzedText.trim() !== draft.trim() ? <div className="setup-banner"><Lightbulb size={18}/><div><strong>O texto mudou depois da última análise</strong><p>O mapa, os flashcards e as questões ainda são da versão anterior.</p><div className="banner-actions"><button className="button primary small" onClick={analyze} disabled={busy || !apiKey}><Sparkles size={14}/> Analisar de novo</button></div></div></div> : null; })()}
            <div className="stats-row"><div className="stat-card"><span>CONCEITOS</span><strong>{result.concepts.length}</strong></div><div className="stat-card"><span>CONEXÕES</span><strong>{result.relationships.length}</strong></div><div className="stat-card"><span>FLASHCARDS</span><strong>{result.flashcards.length}</strong></div><div className="stat-card"><span>QUESTÕES</span><strong>{result.questions.length}</strong></div></div>
            <div className="panel graph-panel" ref={mapRef}><div className="panel-head"><div><h3>Rede de conceitos</h3><p>As setas mostram o sentido de cada relação.</p></div><span className="tiny-tag">{result.concepts.length} conceitos</span></div>
              <KnowledgeMap concepts={result.concepts} relationships={result.relationships} selectedId={selectedConcept} onSelect={setSelectedConcept}/>
            </div>
            <div className="map-layout">
              <div className="panel summary-panel"><div className="panel-head"><div><h3>Síntese da IA</h3><p>Resumo da anotação</p></div><Sparkles size={17} color="#8b7cf6"/></div><p className="summary-text">{result.summary}</p><div className="panel-divider"/><h4>Conceitos identificados</h4><div className="concept-list">{result.concepts.map(c => <button type="button" className={`concept-row ${selectedConcept === c.id ? 'selected' : ''}`} key={c.id} onClick={() => selectFromList(c.id)}><div><strong>{c.name}</strong><p>{c.definition}</p></div><span className={`confidence ${c.confidence}`}>{c.confidence}</span></button>)}</div></div>
              <div className="panel relation-panel"><div className="panel-head"><div><h3>Relações identificadas</h3><p>Confira se as conexões fazem sentido.</p></div></div>{result.relationships.map((r,i)=><div className="relation-row" key={i}><button type="button" className="relation-node" onClick={() => selectFromList(r.from)}>{conceptName(r.from)}</button><span className="relation-type">{r.type}</span><ChevronRight size={13} className="relation-arrow"/><button type="button" className="relation-node" onClick={() => selectFromList(r.to)}>{conceptName(r.to)}</button><p>{r.explanation} <small>Confiança: {r.confidence}</small></p></div>)}</div>
            </div>
            {activeId && <NoteLinks result={result} notes={notes} activeId={activeId} onOpenNote={loadNote} onRemove={removeLink} onReconnect={analyze} busy={busy} canAnalyze={Boolean(apiKey) && draft.trim().length >= 30}/>}
            {result.gaps?.length > 0 && <div className="panel gaps-panel"><h3><CircleHelp size={17}/> Pontos que merecem aprofundamento</h3>{result.gaps.map((g,i)=><p key={i}>• {g}</p>)}</div>}
          </>}
        </section>}

        {tab === 'cross' && <CrossView notes={notes} onOpenNote={loadNote} onGoEditor={() => setTab('editor')} onLoadSamples={loadSampleNotes}/>}

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
          <div className="panel privacy-panel storage-panel">
            <h3><HardDrive size={15}/> Suas anotações</h3>
            <p className={`storage-state ${storageOk ? 'ok' : 'bad'}`}>{storageOk ? <><CircleCheck size={14}/> Salvando automaticamente neste navegador ({notes.length} anotação(ões)).</> : <><TriangleAlert size={14}/> Este navegador não está deixando salvar: as anotações se perdem ao fechar.</>}</p>
            {storageOk && <p>• {isWebOrigin ? (persisted ? 'O navegador confirmou que não vai apagar estes dados sozinho.' : 'O navegador pode apagar estes dados se faltar espaço; instale o app (menu ⋮ → Instalar app) para mais garantia.') : 'Você abriu o arquivo direto do aparelho: use sempre o mesmo arquivo e o mesmo navegador.'}</p>}
            <p>• Os dados somem se você limpar os dados do navegador, usar janela anônima ou abrir o arquivo por um visualizador (WhatsApp, Gmail, gerenciador de arquivos). Faça backups de vez em quando.</p>
            <div className="settings-actions">
              <button className="button primary" onClick={exportBackup} disabled={!notes.length}><Download size={15}/> Baixar backup</button>
              <button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={15}/> Importar backup</button>
              <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => importBackup(e.target.files?.[0])}/>
            </div>
            {backupMsg && <p className="saved-msg">{backupMsg}</p>}
            <p className="field-help">{lastBackup ? `Último backup: ${new Date(lastBackup).toLocaleString('pt-BR')}.` : 'Nenhum backup feito ainda.'} O backup é um arquivo .json com todas as anotações e análises. Ele não inclui a sua chave Gemini. Também serve para passar as anotações para outro aparelho.</p>
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
