import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ArrowRight, ArrowLeft } from 'lucide-react';

// ---------- Preparação dos dados ----------

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const FONT = 13, LINE = 16, PAD_X = 12, PAD_Y = 9, CHAR_W = 7.2;

function wrapText(text, max = 16, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= max) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,1}$/, '…');
    return kept;
  }
  return lines.length ? lines : ['—'];
}

// Liga cada relação aos conceitos, aceitando id ou nome (com ou sem acentos).
export function buildGraph(concepts = [], relationships = []) {
  const nodes = concepts.map((c, i) => {
    const lines = wrapText(c.name);
    const w = Math.max(70, Math.max(...lines.map(l => l.length)) * CHAR_W + PAD_X * 2);
    const h = lines.length * LINE + PAD_Y * 2;
    return { ...c, index: i, lines, w, h, degree: 0, out: [], in: [] };
  });
  const lookup = new Map();
  nodes.forEach(n => [n.id, n.name].forEach(k => { const key = norm(k); if (key && !lookup.has(key)) lookup.set(key, n.index); }));
  const resolve = (value) => {
    const key = norm(value);
    if (!key) return -1;
    if (lookup.has(key)) return lookup.get(key);
    const partial = nodes.find(n => { const nn = norm(n.name); return key.length > 2 && nn && (nn.includes(key) || key.includes(nn)); });
    return partial ? partial.index : -1;
  };

  const edges = [];
  const unresolved = [];
  relationships.forEach((r, i) => {
    const s = resolve(r.from), t = resolve(r.to);
    if (s < 0 || t < 0 || s === t) { unresolved.push(r); return; }
    const labelText = truncate(String(r.type || 'relaciona'), 24);
    const edge = { ...r, index: i, s, t, labelText, labelW: labelText.length * 6.1 + 12 };
    edges.push(edge);
    nodes[s].degree++; nodes[t].degree++;
    nodes[s].out.push(edge); nodes[t].in.push(edge);
  });

  // Várias relações entre o mesmo par de conceitos viram curvas lado a lado.
  const groups = new Map();
  edges.forEach(e => { const key = `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); });
  groups.forEach(list => list.forEach((e, i) => { e.offset = list.length === 1 ? 0 : i - (list.length - 1) / 2; }));

  // Centrais: os mais conectados (cerca de 30% do mapa), com pelo menos 2 relações.
  const degrees = nodes.map(n => n.degree).sort((a, b) => b - a);
  const maxDegree = degrees[0] || 0;
  const cut = Math.max(2, maxDegree * 0.75, degrees[Math.max(0, Math.ceil(nodes.length * 0.3) - 1)] || 0);
  nodes.forEach(n => { n.tier = n.degree === 0 ? 'isolated' : (n.degree >= cut ? 'central' : 'linked'); });
  return { nodes, edges, unresolved };
}

// ---------- Layout por forças (determinístico) ----------

const TOP = 54; // espaço para os botões de zoom

function computeLayout(nodes, edges, W, H) {
  const n = nodes.length;
  const cx = W / 2, cy = H / 2;
  if (!n) return [];
  if (n === 1) return [{ x: cx, y: cy }];
  const clamp = (p, nd) => {
    p.x = Math.min(W - nd.w / 2 - 10, Math.max(nd.w / 2 + 10, p.x));
    p.y = Math.min(H - nd.h / 2 - 10, Math.max(nd.h / 2 + TOP, p.y));
  };
  // Começa em círculo: conceitos mais conectados ficam perto do centro.
  const order = [...nodes].sort((a, b) => b.degree - a.degree).map(nd => nd.index);
  const pos = new Array(n);
  order.forEach((idx, rank) => {
    const a = (2 * Math.PI * rank) / n - Math.PI / 2;
    const r = (rank === 0 ? 0.05 : 0.32) * Math.min(W, H);
    pos[idx] = { x: cx + r * Math.cos(a) * (W / Math.min(W, H)) * 0.9, y: cy + r * Math.sin(a) * (H / Math.min(W, H)) * 0.9 };
  });
  const k = Math.sqrt((W * H) / n) * 0.62;
  let temp = Math.min(W, H) / 5;
  const radius = nodes.map(nd => (nd.w + nd.h) / 4);

  for (let it = 0; it < 450; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    // Repulsão entre conceitos (considera o tamanho de cada cartão).
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
      const d = Math.max(Math.hypot(dx, dy), 1);
      const eff = Math.max(d - (radius[i] + radius[j]) * 0.5, 8);
      const f = (k * k) / eff;
      dx /= d; dy /= d;
      disp[i].x += dx * f; disp[i].y += dy * f;
      disp[j].x -= dx * f; disp[j].y -= dy * f;
    }
    // Atração ao longo das relações.
    for (const e of edges) {
      const a = pos[e.s], b = pos[e.t];
      let dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.max(Math.hypot(dx, dy), 1);
      dx /= d; dy /= d;
      // Comprimento mínimo para o nome da relação caber entre os dois conceitos.
      const A = nodes[e.s], B = nodes[e.t];
      const ux = Math.abs(dx), uy = Math.abs(dy);
      const minLen = ((A.w + B.w) / 2 + e.labelW + 24) * ux + ((A.h + B.h) / 2 + 40) * uy;
      const f = d < minLen ? -(minLen - d) * 3 : (d * d) / k;
      disp[e.s].x -= dx * f; disp[e.s].y -= dy * f;
      disp[e.t].x += dx * f; disp[e.t].y += dy * f;
    }
    // O meio de cada seta (onde fica o nome da relação) afasta os outros conceitos.
    for (const e of edges) {
      const mx = (pos[e.s].x + pos[e.t].x) / 2, my = (pos[e.s].y + pos[e.t].y) / 2;
      for (let i = 0; i < n; i++) {
        if (i === e.s || i === e.t) continue;
        let dx = pos[i].x - mx, dy = pos[i].y - my;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const eff = Math.max(d - radius[i] * 0.5, 8);
        const f = (k * k * 0.35) / eff;
        dx /= d; dy /= d;
        disp[i].x += dx * f; disp[i].y += dy * f;
        disp[e.s].x -= dx * f / 2; disp[e.s].y -= dy * f / 2;
        disp[e.t].x -= dx * f / 2; disp[e.t].y -= dy * f / 2;
      }
    }
    for (let i = 0; i < n; i++) {
      disp[i].x += (cx - pos[i].x) * 0.1;
      disp[i].y += (cy - pos[i].y) * 0.1;
      const len = Math.hypot(disp[i].x, disp[i].y);
      if (len > 0) {
        const step = Math.min(len, temp);
        pos[i].x += (disp[i].x / len) * step;
        pos[i].y += (disp[i].y / len) * step;
      }
      clamp(pos[i], nodes[i]);
    }
    temp = Math.max(temp * 0.975, 1);
  }

  // Remove sobreposição entre cartões e entre cartões e nomes de relações.
  const push = (a, A, b, B, ox, oy, dx, dy, share = 0.5) => {
    if (ox / (A.w + B.w) < oy / (A.h + B.h)) { const s = (dx >= 0 ? 1 : -1) * (ox + 1); a.x += s * share; if (b) b.x -= s * (1 - share); }
    else { const s = (dy >= 0 ? 1 : -1) * (oy + 1); a.y += s * share; if (b) b.y -= s * (1 - share); }
  };
  for (let pass = 0; pass < 150; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos[i], b = pos[j], A = nodes[i], B = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const ox = (A.w + B.w) / 2 + 22 - Math.abs(dx);
      const oy = (A.h + B.h) / 2 + 18 - Math.abs(dy);
      if (ox > 0 && oy > 0) { moved = true; push(a, A, b, B, ox, oy, dx, dy); clamp(a, A); clamp(b, B); }
    }
    // Espaço mínimo entre as pontas de cada seta para caber o nome da relação.
    for (const e of edges) {
      const a = pos[e.s], b = pos[e.t], A = nodes[e.s], B = nodes[e.t];
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.max(Math.hypot(dx, dy), 1);
      const ux = dx / d, uy = dy / d;
      const need = ((A.w + B.w) / 2 + e.labelW + 20) * Math.abs(ux) + ((A.h + B.h) / 2 + 36) * Math.abs(uy);
      if (d < need - 1) { moved = true; const s = (need - d) / 2; a.x += ux * s; a.y += uy * s; b.x -= ux * s; b.y -= uy * s; clamp(a, A); clamp(b, B); }
    }
    for (const e of edges) {
      const L = { w: e.labelW + 6, h: 26 };
      const mx = (pos[e.s].x + pos[e.t].x) / 2, my = (pos[e.s].y + pos[e.t].y) / 2;
      for (let i = 0; i < n; i++) {
        const a = pos[i], A = nodes[i];
        let dx = a.x - mx, dy = a.y - my;
        // Pontas da própria seta: afasta no sentido da seta, para o nome caber entre elas.
        if (i === e.s || i === e.t) { const o = pos[i === e.s ? e.t : e.s]; dx = a.x - o.x; dy = a.y - o.y; }
        const ox = (A.w + L.w) / 2 - Math.abs(dx), oy = (A.h + L.h) / 2 - Math.abs(dy);
        if (ox > 0 && oy > 0) { moved = true; push(a, A, null, L, ox, oy, dx, dy, 1); clamp(a, A); }
      }
    }
    if (!moved) break;
  }
  // Por último, garante que nenhum conceito fique sobre outro.
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos[i], b = pos[j], A = nodes[i], B = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const ox = (A.w + B.w) / 2 + 16 - Math.abs(dx), oy = (A.h + B.h) / 2 + 12 - Math.abs(dy);
      if (ox > 0 && oy > 0) { moved = true; push(a, A, b, B, ox, oy, dx, dy); clamp(a, A); clamp(b, B); }
    }
    if (!moved) break;
  }

  // Estica o desenho para ocupar o quadro todo (só afasta, nunca sobrepõe).
  const minX = Math.min(...pos.map((p, i) => p.x - nodes[i].w / 2)), maxX = Math.max(...pos.map((p, i) => p.x + nodes[i].w / 2));
  const minY = Math.min(...pos.map((p, i) => p.y - nodes[i].h / 2)), maxY = Math.max(...pos.map((p, i) => p.y + nodes[i].h / 2));
  const fit = (lo, hi, min, max) => { const s = Math.min(1.6, Math.max(1, (hi - lo) / Math.max(max - min, 1))); return v => lo + (v - min) * s + ((hi - lo) - (max - min) * s) / 2; };
  const fx = fit(10, W - 10, minX, maxX), fy = fit(TOP, H - 10, minY, maxY);
  pos.forEach((p, i) => {
    const nd = nodes[i];
    p.x = fx(p.x - nd.w / 2) + nd.w / 2; p.y = fy(p.y - nd.h / 2) + nd.h / 2;
    clamp(p, nd);
  });
  return pos;
}

// ---------- Geometria das setas ----------

function clipToBox(center, node, toward) {
  const dx = toward.x - center.x, dy = toward.y - center.y;
  const s = Math.min((node.w / 2 + 4) / Math.max(Math.abs(dx), 1e-6), (node.h / 2 + 4) / Math.max(Math.abs(dy), 1e-6));
  if (s >= 1) return { x: toward.x, y: toward.y };
  return { x: center.x + dx * s, y: center.y + dy * s };
}

function edgeGeometry(e, pos, nodes) {
  const a = pos[e.s], b = pos[e.t];
  // Normal calculada no sentido canônico, para curvas paralelas não se cruzarem.
  const lo = pos[Math.min(e.s, e.t)], hi = pos[Math.max(e.s, e.t)];
  const dx = hi.x - lo.x, dy = hi.y - lo.y, d = Math.max(Math.hypot(dx, dy), 1);
  const off = e.offset * Math.min(0.32 * d, 70);
  const c = { x: (a.x + b.x) / 2 + (-dy / d) * off, y: (a.y + b.y) / 2 + (dx / d) * off };
  const p0 = clipToBox(a, nodes[e.s], c);
  const p1 = clipToBox(b, nodes[e.t], c);
  const at = (t) => ({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y });
  const label = at(0.5);
  return { at, path: `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`, label };
}

// Escolhe, ao longo de cada seta, um ponto onde o nome não cubra outro nome nem um conceito.
function placeLabels(edges, pos, nodes) {
  const boxes = nodes.map((nd, i) => ({ x: pos[i].x - nd.w / 2 - 3, y: pos[i].y - nd.h / 2 - 3, w: nd.w + 6, h: nd.h + 6 }));
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const placed = [];
  const result = new Map();
  const order = [...edges].sort((a, b) => b.labelW - a.labelW);
  for (const e of order) {
    const g = edgeGeometry(e, pos, nodes);
    let best = null, bestScore = Infinity;
    for (const t of [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75]) {
      const p = g.at(t);
      const box = { x: p.x - e.labelW / 2 - 2, y: p.y - 12, w: e.labelW + 4, h: 24 };
      const score = placed.filter(b => hit(b, box)).length * 3 + boxes.filter(b => hit(b, box)).length * 2 + Math.abs(t - 0.5);
      if (score < bestScore) { bestScore = score; best = { p, box }; }
      if (score < 1) break;
    }
    placed.push(best.box);
    result.set(e.index, best.p);
  }
  return result;
}

const truncate = (s, max) => (s.length > max ? s.slice(0, max - 1) + '…' : s);

// ---------- Componente ----------

export default function KnowledgeMap({ concepts, relationships, selectedId, onSelect }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.clientWidth / 10) * 10);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(() => buildGraph(concepts, relationships), [concepts, relationships]);
  const W = Math.max(width, 300);
  const narrow = W < 600;
  const area = graph.nodes.reduce((sum, nd) => sum + nd.w * nd.h, 0);
  const H = Math.round(Math.min(narrow ? 920 : 680, Math.max(narrow ? 440 : 480, (area * 6.5) / W)));

  const initial = useMemo(() => (width ? computeLayout(graph.nodes, graph.edges, W, H) : []), [graph, W, H, width]);
  const [pos, setPos] = useState(initial);
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H });
  useEffect(() => { setPos(initial.map(p => ({ ...p }))); setView({ x: 0, y: 0, w: W, h: H }); }, [initial]);

  const selected = graph.nodes.find(nd => nd.id === selectedId) || null;
  const focusIndex = selected ? selected.index : hovered;
  const neighborSet = useMemo(() => {
    if (focusIndex == null) return null;
    const set = new Set([focusIndex]);
    graph.edges.forEach(e => { if (e.s === focusIndex) set.add(e.t); if (e.t === focusIndex) set.add(e.s); });
    return set;
  }, [focusIndex, graph]);

  const zoomed = view.w < W * 0.95;
  const labelLimit = narrow ? 12 : 22;
  const showAllLabels = graph.edges.length <= labelLimit || zoomed;

  const toSvg = (evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const onNodeDown = (evt, i) => {
    evt.stopPropagation();
    svgRef.current.setPointerCapture?.(evt.pointerId);
    const p = toSvg(evt);
    dragRef.current = { type: 'node', i, start: p, offset: { x: pos[i].x - p.x, y: pos[i].y - p.y }, moved: false };
  };
  const onBackgroundDown = (evt) => {
    svgRef.current.setPointerCapture?.(evt.pointerId);
    dragRef.current = { type: 'pan', startClient: { x: evt.clientX, y: evt.clientY }, startView: view, moved: false };
  };
  const onMove = (evt) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === 'node') {
      const p = toSvg(evt);
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
      drag.moved = true;
      const nd = graph.nodes[drag.i];
      const x = Math.min(W - nd.w / 2, Math.max(nd.w / 2, p.x + drag.offset.x));
      const y = Math.min(H - nd.h / 2, Math.max(nd.h / 2, p.y + drag.offset.y));
      setPos(prev => prev.map((q, j) => (j === drag.i ? { x, y } : q)));
    } else if (zoomed) {
      const rect = svgRef.current.getBoundingClientRect();
      const scale = drag.startView.w / rect.width;
      const dx = (evt.clientX - drag.startClient.x) * scale, dy = (evt.clientY - drag.startClient.y) * scale;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      setView(v => ({ ...v, x: clampView(drag.startView.x - dx, v.w, W), y: clampView(drag.startView.y - dy, v.h, H) }));
    } else if (Math.hypot(evt.clientX - drag.startClient.x, evt.clientY - drag.startClient.y) > 4) {
      drag.moved = true;
    }
  };
  const onUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    if (drag.type === 'node') {
      const nd = graph.nodes[drag.i];
      onSelect(selectedId === nd.id ? null : nd.id);
    } else onSelect(null);
  };

  const zoom = (factor) => setView(v => {
    const w = Math.min(W, Math.max(W * 0.35, v.w * factor));
    const h = (w / W) * H;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return { w, h, x: clampView(cx - w / 2, w, W), y: clampView(cy - h / 2, h, H) };
  });

  const tierClass = (nd) => `km-node km-${nd.tier}${selected?.index === nd.index ? ' km-selected' : ''}${neighborSet && !neighborSet.has(nd.index) ? ' km-dim' : ''}`;
  const edgeActive = (e) => focusIndex != null && (e.s === focusIndex || e.t === focusIndex);
  const sortedEdges = [...graph.edges].sort((a, b) => Number(edgeActive(a)) - Number(edgeActive(b)));
  const ready = pos.length === graph.nodes.length && width > 0;
  const labelPos = useMemo(() => (ready ? placeLabels(graph.edges, pos, graph.nodes) : new Map()), [ready, graph, pos]);

  return <div className="km">
    <div className="km-canvas" ref={wrapRef}>
      <div className="km-toolbar">
        <button type="button" onClick={() => zoom(0.75)} title="Aproximar" aria-label="Aproximar"><ZoomIn size={16} /></button>
        <button type="button" onClick={() => zoom(1 / 0.75)} title="Afastar" aria-label="Afastar" disabled={!zoomed}><ZoomOut size={16} /></button>
        <button type="button" onClick={() => { setPos(initial.map(p => ({ ...p }))); setView({ x: 0, y: 0, w: W, h: H }); }} title="Reorganizar" aria-label="Reorganizar mapa"><Maximize2 size={15} /></button>
      </div>
      {ready && <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width={W} height={H}
        className={zoomed ? 'km-zoomed' : ''} role="img" aria-label="Mapa de conceitos e relações"
        onPointerDown={onBackgroundDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(e) => { if (e.key === 'Escape') onSelect(null); }}>
        <defs>
          {['base', 'active'].map(kind => <marker key={kind} id={`${uid}-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={`km-arrow km-arrow-${kind}`} />
          </marker>)}
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="transparent" />

        <g>{sortedEdges.map(e => {
          const g = edgeGeometry(e, pos, graph.nodes);
          const active = edgeActive(e);
          const dim = focusIndex != null && !active;
          return <path key={e.index} d={g.path} className={`km-edge km-conf-${e.confidence || 'media'}${active ? ' km-edge-active' : ''}${dim ? ' km-dim' : ''}`}
            markerEnd={`url(#${uid}-arrow-${active ? 'active' : 'base'})`} />;
        })}</g>

        <g pointerEvents="none">{sortedEdges.filter(e => edgeActive(e) === false).map(e => {
          const active = edgeActive(e);
          if (focusIndex != null ? !active : !showAllLabels) return null;
          const lp = labelPos.get(e.index);
          if (!lp) return null;
          const text = e.labelText, w = e.labelW;
          return <g key={e.index} className={`km-label${active ? ' km-label-active' : ''}`} transform={`translate(${lp.x},${lp.y})`}>
            <rect x={-w / 2} y={-10} width={w} height={20} rx={10} />
            <text y={4} fontSize={11}>{text}</text>
          </g>;
        })}</g>
        <g>{graph.nodes.map(nd => {
          const p = pos[nd.index];
          return <g key={nd.id} className={tierClass(nd)} transform={`translate(${p.x - nd.w / 2},${p.y - nd.h / 2})`}
            role="button" tabIndex={0} aria-pressed={selected?.index === nd.index} aria-label={`${nd.name}: ${nd.degree} ${nd.degree === 1 ? "conexão" : "conexões"}`}
            onPointerDown={(evt) => onNodeDown(evt, nd.index)}
            onPointerEnter={() => setHovered(nd.index)} onPointerLeave={() => setHovered(h => (h === nd.index ? null : h))}
            onKeyDown={(evt) => { if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); onSelect(selectedId === nd.id ? null : nd.id); } }}>
            <title>{nd.definition}</title>
            <rect width={nd.w} height={nd.h} rx={10} />
            <text x={nd.w / 2} y={PAD_Y + LINE / 2 + 1} fontSize={FONT}>
              {nd.lines.map((l, k) => <tspan key={k} x={nd.w / 2} dy={k === 0 ? 0 : LINE}>{l}</tspan>)}
            </text>
          </g>;
        })}</g>

        <g pointerEvents="none">{sortedEdges.filter(e => edgeActive(e) === true).map(e => {
          const active = edgeActive(e);
          if (focusIndex != null ? !active : !showAllLabels) return null;
          const lp = labelPos.get(e.index);
          if (!lp) return null;
          const text = e.labelText, w = e.labelW;
          return <g key={e.index} className={`km-label${active ? ' km-label-active' : ''}`} transform={`translate(${lp.x},${lp.y})`}>
            <rect x={-w / 2} y={-10} width={w} height={20} rx={10} />
            <text y={4} fontSize={11}>{text}</text>
          </g>;
        })}</g>
      </svg>}
    </div>

    <div className="km-legend">
      <span><i className="km-swatch km-central" /> Conceito central</span>
      <span><i className="km-swatch km-linked" /> Conceito conectado</span>
      <span><i className="km-swatch km-isolated" /> Sem conexões</span>
      <span><i className="km-line" /> Relação confirmada</span>
      <span><i className="km-line km-line-dashed" /> Relação incerta</span>
    </div>

    <div className="km-details" aria-live="polite">
      {!selected ? <p className="km-hint">Toque em um conceito para destacar suas conexões. Arraste os conceitos para reorganizar o mapa{graph.edges.length > labelLimit ? '; aproxime para ver o nome de todas as relações' : ''}.</p> : <>
        <div className="km-details-head"><div><span className={`km-swatch km-${selected.tier}`} /><strong>{selected.name}</strong></div><span className={`confidence ${selected.confidence}`}>{selected.confidence}</span></div>
        <p className="km-definition">{selected.definition}</p>
        {selected.source_excerpt && <p className="km-excerpt">“{selected.source_excerpt}”</p>}
        {selected.degree === 0 ? <p className="km-hint">Nenhuma relação foi identificada para este conceito.</p> : <ul className="km-relations">
          {selected.out.map(e => <li key={`o${e.index}`}><ArrowRight size={13} /><span className="relation-type">{e.type}</span><button type="button" onClick={() => onSelect(graph.nodes[e.t].id)}>{graph.nodes[e.t].name}</button>{e.confidence === 'baixa' && <small>incerta</small>}</li>)}
          {selected.in.map(e => <li key={`i${e.index}`}><ArrowLeft size={13} /><button type="button" onClick={() => onSelect(graph.nodes[e.s].id)}>{graph.nodes[e.s].name}</button><span className="relation-type">{e.type}</span>{e.confidence === 'baixa' && <small>incerta</small>}</li>)}
        </ul>}
      </>}
      {graph.unresolved.length > 0 && <p className="km-warning">{graph.unresolved.length} relação(ões) não puderam ser desenhadas porque citam conceitos que não estão na lista.</p>}
    </div>
  </div>;
}

function clampView(x, size, total) { return Math.min(Math.max(0, x), Math.max(0, total - size)); }
