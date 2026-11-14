import React, { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import { Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, ListCollapse, Minus, Bold, Italic, Undo2, Redo2 } from 'lucide-react';
import { baseExtensions, docToText } from './noteDoc.js';

// Blocos disponíveis na barra e no menu "/" (estilo Notion).
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const BLOCKS = [
  { id: 'paragraph', label: 'Texto', hint: 'Parágrafo comum', icon: Pilcrow, keys: 'texto paragrafo normal p', run: c => c.setParagraph(), active: e => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList') },
  { id: 'h1', label: 'Título', hint: 'Atalho: # e espaço', icon: Heading1, keys: 'titulo h1 cabecalho heading', run: c => c.setHeading({ level: 1 }), active: e => e.isActive('heading', { level: 1 }) },
  { id: 'h2', label: 'Subtítulo', hint: 'Atalho: ## e espaço', icon: Heading2, keys: 'subtitulo h2 secao', run: c => c.setHeading({ level: 2 }), active: e => e.isActive('heading', { level: 2 }) },
  { id: 'h3', label: 'Subtítulo menor', hint: 'Atalho: ### e espaço', icon: Heading3, keys: 'subtitulo menor h3 topico', run: c => c.setHeading({ level: 3 }), active: e => e.isActive('heading', { level: 3 }) },
  { id: 'bullet', label: 'Lista com marcadores', hint: 'Atalho: - e espaço', icon: List, keys: 'lista marcadores bullet topicos pontos', run: c => c.toggleBulletList(), active: e => e.isActive('bulletList') },
  { id: 'ordered', label: 'Lista numerada', hint: 'Atalho: 1. e espaço', icon: ListOrdered, keys: 'lista numerada numeros ordenada 1', run: c => c.toggleOrderedList(), active: e => e.isActive('orderedList') },
  { id: 'toggle', label: 'Lista expansível', hint: 'Atalho: > e espaço', icon: ListCollapse, keys: 'lista expansivel alternavel toggle recolher abrir', run: c => c.toggleBlock(), active: e => e.isActive('details') },
  { id: 'divider', label: 'Separador', hint: 'Atalho: ---', icon: Minus, keys: 'separador divisor linha hr', run: c => c.setHorizontalRule(), active: () => false }
];

export default function NoteEditor({ initialDoc, onChange, autoFocus }) {
  const [, force] = useState(0); // re-renderiza a barra quando a seleção muda
  const [slash, setSlash] = useState(null); // { from, to, query, index, x, y }
  const slashRef = useRef(null);
  slashRef.current = slash;
  const dismissedAt = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => node.type.name === 'heading' ? 'Título'
          : node.type.name === 'detailsSummary' ? 'Título da lista expansível'
          : 'Escreva, ou digite "/" para escolher um bloco'
      })
    ],
    content: initialDoc,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { class: 'nb-content nb-editor', 'aria-label': 'Texto da anotação' },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current;
        if (!s) return false;
        const items = filterBlocks(s.query);
        if (event.key === 'ArrowDown') { setSlash({ ...s, index: (s.index + 1) % Math.max(items.length, 1) }); return true; }
        if (event.key === 'ArrowUp') { setSlash({ ...s, index: (s.index - 1 + items.length) % Math.max(items.length, 1) }); return true; }
        if ((event.key === 'Enter' || event.key === 'Tab') && items.length) { applyBlock(items[s.index] || items[0], s); return true; }
        if (event.key === 'Escape') { dismissedAt.current = s.from; setSlash(null); return true; }
        return false;
      }
    },
    onUpdate: ({ editor: e }) => {
      const doc = e.getJSON();
      onChangeRef.current?.(doc, docToText(doc));
      detectSlash(e);
    },
    onSelectionUpdate: ({ editor: e }) => { detectSlash(e); force(n => n + 1); },
    onTransaction: () => force(n => n + 1)
  });

  // Menu "/": aparece quando o texto antes do cursor termina em "/palavra".
  function detectSlash(e) {
    const { $from, empty } = e.state.selection;
    if (!empty || !['paragraph', 'heading'].includes($from.parent.type.name)) return setSlash(null);
    const before = $from.parent.textBetween(0, $from.parentOffset, '\n', ' ');
    const m = before.match(/(?:^|\s)\/([\p{L}\d]*)$/u);
    if (!m) { dismissedAt.current = null; return setSlash(null); }
    const from = $from.pos - m[1].length - 1;
    if (dismissedAt.current === from) return setSlash(null);
    const coords = e.view.coordsAtPos(from);
    const prev = slashRef.current;
    setSlash({ from, to: $from.pos, query: m[1], index: prev && prev.from === from ? Math.min(prev.index, Math.max(filterBlocks(m[1]).length - 1, 0)) : 0, x: coords.left, y: coords.bottom });
  }
  function applyBlock(block, s) {
    const ed = editorRef.current;
    if (!ed) return;
    let chain = ed.chain().focus();
    if (s) chain = chain.deleteRange({ from: s.from, to: s.to });
    block.run(chain).run();
    setSlash(null);
  }

  editorRef.current = editor;
  if (!editor) return null;
  const items = slash ? filterBlocks(slash.query) : [];
  const menuX = slash ? Math.max(8, Math.min(slash.x, window.innerWidth - 268)) : 0;
  const menuY = slash ? (slash.y + 300 > window.innerHeight ? Math.max(8, slash.y - 310) : slash.y + 6) : 0;

  return <div className="nb-wrap">
    <div className="nb-toolbar" role="toolbar" aria-label="Tipo de bloco">
      {BLOCKS.map(b => <button type="button" key={b.id} title={`${b.label} — ${b.hint}`} aria-label={b.label} aria-pressed={b.active(editor)}
        className={b.active(editor) ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => applyBlock(b)}><b.icon size={17} /></button>)}
      <span className="nb-sep" />
      <button type="button" title="Negrito (Ctrl+B)" aria-label="Negrito" aria-pressed={editor.isActive('bold')} className={editor.isActive('bold') ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
      <button type="button" title="Itálico (Ctrl+I)" aria-label="Itálico" aria-pressed={editor.isActive('italic')} className={editor.isActive('italic') ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
      <span className="nb-sep" />
      <button type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" disabled={!editor.can().undo()} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></button>
      <button type="button" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" disabled={!editor.can().redo()} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></button>
    </div>
    <EditorContent editor={editor} />
    {slash && <div className="nb-slash" role="listbox" aria-label="Escolher bloco" style={{ left: menuX, top: menuY }}>
      {items.length === 0 ? <div className="nb-slash-empty">Nenhum bloco encontrado</div> : items.map((b, i) =>
        <button type="button" role="option" aria-selected={i === slash.index} key={b.id} className={i === slash.index ? 'on' : ''}
          onMouseDown={e => e.preventDefault()} onMouseEnter={() => setSlash({ ...slash, index: i })} onClick={() => applyBlock(b, slash)}>
          <span className="nb-slash-icon"><b.icon size={16} /></span><span><strong>{b.label}</strong><small>{b.hint}</small></span>
        </button>)}
    </div>}
  </div>;
}

function filterBlocks(query) {
  const q = norm(query || '');
  return q ? BLOCKS.filter(b => norm(b.label).includes(q) || b.keys.split(' ').some(k => k.startsWith(q))) : BLOCKS;
}
