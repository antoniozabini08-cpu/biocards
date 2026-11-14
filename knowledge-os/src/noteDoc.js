// Formato das anotações com blocos (estilo Notion) e conversões:
// - docToText: texto estruturado (Markdown simples) usado pela IA, pela busca e pelo contador
// - docToHTML: HTML seguro usado no modo de leitura e no arquivo baixado
// - textToDoc: converte anotações antigas (só texto) para blocos
import StarterKit from '@tiptap/starter-kit';
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { Extension, InputRule, getSchema } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

// Lista expansível no estilo do Notion:
// - toggleBlock: a linha atual vira o título da lista, com o conteúdo vazio e aberto
// - "> " no começo de uma linha cria a lista
// - Enter no título leva o cursor para dentro do conteúdo (sem criar linhas extras);
//   Enter numa linha vazia no fim do conteúdo sai da lista
const ToggleShortcut = Extension.create({
  name: 'toggleShortcut',
  priority: 1000,
  addCommands() {
    return {
      toggleBlock: () => ({ tr, dispatch, commands }) => {
        const { $from } = tr.selection;
        const block = $from.parent;
        if (!['paragraph', 'heading'].includes(block.type.name)) return commands.setDetails();
        const { schema } = tr.doc.type;
        const text = block.textContent;
        const details = schema.nodes.details.create({ open: true }, [
          schema.nodes.detailsSummary.create(null, text ? schema.text(text) : null),
          schema.nodes.detailsContent.create(null, schema.nodes.paragraph.create())
        ]);
        const parent = $from.node(-1), index = $from.index(-1);
        if (!parent.canReplaceWith(index, index + 1, details.type)) return commands.setDetails();
        if (dispatch) {
          const start = $from.before();
          tr.replaceWith(start, $from.after(), details);
          tr.setSelection(TextSelection.create(tr.doc, start + 2 + text.length));
          tr.scrollIntoView();
        }
        return true;
      }
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { $head, empty } = state.selection;
        if (!empty || $head.parent.type.name !== 'detailsSummary') return false;
        const details = $head.node($head.depth - 1);
        if (!details.attrs.open) return false; // fechada: o Enter padrão cria uma linha depois da lista
        const first = details.child(1).firstChild;
        if (!first || first.type.name !== 'paragraph' || first.content.size) return false;
        view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, $head.after() + 2)).scrollIntoView());
        return true;
      }
    };
  },
  addInputRules() {
    return [new InputRule({
      find: /^>\s$/,
      handler: ({ range, chain }) => { chain().deleteRange(range).toggleBlock().run(); }
    })];
  }
});

export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    codeBlock: false,
    link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }
  }),
  Details.configure({ persist: true }),
  DetailsSummary,
  DetailsContent,
  ToggleShortcut
];

const schema = getSchema(baseExtensions);

export const emptyDoc = () => ({ type: 'doc', content: [{ type: 'paragraph' }] });

// Confere se o conteúdo salvo é válido para o editor; se não for, devolve null.
export function sanitizeDoc(doc) {
  if (!doc || typeof doc !== 'object' || doc.type !== 'doc') return null;
  try { schema.nodeFromJSON(doc).check(); return doc; } catch { return null; }
}

// Anotação antiga (texto puro): cada linha vira um parágrafo; linhas com "# ", "- ",
// "1. " e "---" viram título, lista e separador.
export function textToDoc(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const content = [];
  const para = (t) => (t ? { type: 'paragraph', content: [{ type: 'text', text: t }] } : { type: 'paragraph' });
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { if (content.length && content[content.length - 1].content) content.push({ type: 'paragraph' }); continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) content.push({ type: 'heading', attrs: { level: m[1].length }, content: [{ type: 'text', text: m[2] }] });
    else if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) content.push({ type: 'horizontalRule' });
    else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) pushItem(content, 'bulletList', para(m[1]));
    else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) pushItem(content, 'orderedList', para(m[2]), Number(m[1]));
    else content.push(para(line));
  }
  while (content.length > 1 && !content[content.length - 1].content && content[content.length - 1].type === 'paragraph') content.pop();
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}
function pushItem(content, listType, paragraph, start) {
  const last = content[content.length - 1];
  const item = { type: 'listItem', content: [paragraph] };
  if (last && last.type === listType) last.content.push(item);
  else content.push({ type: listType, ...(listType === 'orderedList' ? { attrs: { start: start || 1 } } : {}), content: [item] });
}

// ---------- Documento -> texto estruturado (para a IA) ----------
const inlineText = (nodes = []) => nodes.map(n => (n.type === 'text' ? n.text : n.type === 'hardBreak' ? '\n' : inlineText(n.content))).join('');

export function docToText(doc) {
  const out = [];
  const walk = (nodes = [], indent = '') => {
    for (const n of nodes) {
      switch (n.type) {
        case 'heading': out.push(`${indent}${'#'.repeat(n.attrs?.level || 1)} ${inlineText(n.content)}`); break;
        case 'paragraph': out.push(indent + inlineText(n.content).replace(/\n/g, `\n${indent}`)); break;
        case 'horizontalRule': out.push(`${indent}---`); break;
        case 'bulletList':
        case 'orderedList': {
          let i = n.attrs?.start || 1;
          for (const item of n.content || []) {
            const marker = n.type === 'bulletList' ? '- ' : `${i++}. `;
            const [first, ...rest] = item.content || [];
            out.push(indent + marker + (first ? (first.type === 'paragraph' || first.type === 'heading' ? inlineText(first.content) : '') : ''));
            if (first && first.type !== 'paragraph' && first.type !== 'heading') walk([first], indent + '   ');
            walk(rest, indent + '   ');
          }
          break;
        }
        case 'details': {
          const summary = (n.content || []).find(c => c.type === 'detailsSummary');
          const body = (n.content || []).find(c => c.type === 'detailsContent');
          out.push(`${indent}▸ ${inlineText(summary?.content)}`);
          walk(body?.content, indent + '   ');
          break;
        }
        default: if (n.content) walk(n.content, indent);
      }
    }
  };
  walk(doc?.content);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- Documento -> HTML seguro (leitura e arquivo baixado) ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (href) => (/^(https?:|mailto:)/i.test(String(href || '').trim()) ? String(href).trim() : null);

function inlineHTML(nodes = []) {
  return nodes.map(n => {
    if (n.type === 'hardBreak') return '<br>';
    if (n.type !== 'text') return inlineHTML(n.content);
    let html = esc(n.text || '');
    for (const m of n.marks || []) {
      if (m.type === 'bold') html = `<strong>${html}</strong>`;
      else if (m.type === 'italic') html = `<em>${html}</em>`;
      else if (m.type === 'underline') html = `<u>${html}</u>`;
      else if (m.type === 'strike') html = `<s>${html}</s>`;
      else if (m.type === 'code') html = `<code>${html}</code>`;
      else if (m.type === 'link' && safeHref(m.attrs?.href)) html = `<a href="${esc(safeHref(m.attrs.href))}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }
    return html;
  }).join('');
}

export function docToHTML(doc, { openToggles = false } = {}) {
  const walk = (nodes = []) => nodes.map(n => {
    switch (n.type) {
      case 'heading': { const l = Math.min(3, Math.max(1, n.attrs?.level || 1)); return `<h${l}>${inlineHTML(n.content)}</h${l}>`; }
      case 'paragraph': return n.content?.length ? `<p>${inlineHTML(n.content)}</p>` : '<p class="nb-empty"><br></p>';
      case 'horizontalRule': return '<hr>';
      case 'bulletList': return `<ul>${walk(n.content)}</ul>`;
      case 'orderedList': return `<ol${(n.attrs?.start || 1) !== 1 ? ` start="${Number(n.attrs.start) || 1}"` : ''}>${walk(n.content)}</ol>`;
      case 'listItem': return `<li>${walk(n.content)}</li>`;
      case 'details': {
        const summary = (n.content || []).find(c => c.type === 'detailsSummary');
        const body = (n.content || []).find(c => c.type === 'detailsContent');
        return `<details${openToggles || n.attrs?.open ? ' open' : ''}><summary>${inlineHTML(summary?.content) || '<span class="nb-muted">Sem título</span>'}</summary><div class="nb-toggle-body">${walk(body?.content)}</div></details>`;
      }
      default: return n.content ? walk(n.content) : '';
    }
  }).join('');
  return walk(doc?.content);
}

// Página HTML independente: abre em qualquer navegador, sem o app e sem internet.
export function noteToStandaloneHTML({ title, doc, updated }) {
  const date = updated ? new Date(updated).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || 'Anotação')}</title>
<style>
:root{--bg:#fbfaf7;--fg:#1f2430;--muted:#6b7280;--line:#e3e0d8;--accent:#5b4fd6;--toggle:#f2f0ea}
@media (prefers-color-scheme:dark){:root{--bg:#121826;--fg:#e8edf5;--muted:#93a0b4;--line:#2b384d;--accent:#a69aff;--toggle:#18233a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.7 Georgia,"Times New Roman",serif}
article{max-width:720px;margin:0 auto;padding:40px 20px 80px}
.doc-title{font:700 2rem/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0 0 6px}
.meta{color:var(--muted);font:13px system-ui,sans-serif;margin:0 0 28px;padding-bottom:16px;border-bottom:1px solid var(--line)}
h1,h2,h3{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.3;margin:1.6em 0 .4em}
h1{font-size:1.6rem}h2{font-size:1.3rem}h3{font-size:1.1rem}
p{margin:.35em 0}.nb-empty{margin:0;line-height:1}
ul,ol{padding-left:1.6em;margin:.35em 0}li>p{margin:.15em 0}
hr{border:0;border-top:1px solid var(--line);margin:1.6em 0}
details{margin:.4em 0;padding:.25em .6em;border-radius:8px}
details[open]{background:var(--toggle)}
summary{cursor:pointer;font-weight:600}
.nb-toggle-body{padding:.2em 0 .3em 1.2em}
.nb-muted{color:var(--muted);font-weight:400}
a{color:var(--accent)}code{font-family:ui-monospace,monospace;font-size:.9em;background:var(--toggle);padding:1px 4px;border-radius:4px}
@media print{body{background:#fff;color:#000}details{background:none!important}}
</style>
</head>
<body>
<article>
<h1 class="doc-title">${esc(title || 'Anotação')}</h1>
<p class="meta">Knowledge OS · ${esc(date)}</p>
${docToHTML(doc)}
</article>
<script>window.addEventListener('beforeprint',function(){document.querySelectorAll('details').forEach(function(d){d.open=true})});</script>
</body>
</html>`;
}

const fileName = (title) => (String(title || 'anotacao').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'anotacao');

export function downloadNoteHTML(note) {
  const blob = new Blob([noteToStandaloneHTML(note)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName(note.title)}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Abre a anotação formatada numa aba nova e chama a impressão (dá para "Salvar como PDF").
export function printNote(note) {
  const html = noteToStandaloneHTML(note).replace('</body>', '<script>window.addEventListener("load",function(){document.querySelectorAll("details").forEach(function(d){d.open=true});setTimeout(function(){window.print()},300)});</script></body>');
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}
