/* UI — núcleo: helpers, persistência, modais, navegação */
(function () {
'use strict';
var F = window.FIN;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var R = F.fmt;

/* ---------- ícones ---------- */
var P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  warn: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>',
  stop: '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><path d="M12 7v6M12 16v.01"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  dl: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>', ul: '<path d="M12 17V5M7 9l5-5 5 5M4 21h16"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 7h8M8 12h2M14 12h2M8 17h2M14 17h2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="16.5" cy="13.5" r="1.2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>'
};
function ic(n, cls) { return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
var SIT_IC = { dentro: 'check', atencao: 'warn', limite: 'stop', ultrapassado: 'x' };
function sitBadge(s) { return '<span class="badge b-' + s + '">' + ic(SIT_IC[s]) + esc(F.SIT_TXT[s]) + '</span>'; }
var ST_IC = { Aberta: 'info', Fechada: 'warn', Vencida: 'x', 'Parcialmente paga': 'warn', Paga: 'check', Divergente: 'stop' };
function stBadge(s) { return '<span class="badge b-' + s.split(' ')[0] + '">' + ic(ST_IC[s] || 'info') + esc(s) + '</span>'; }

/* ---------- estado global ---------- */
var A = window.APP = {
  S: null, ui: { route: 'painel', cycle: null, hf: { q: '', cartao: '', cat: '', scope: 'ciclo', limit: 60 }, open: null, draft: null, editId: null,
    inv: { cartao: null, mes: null }, rel: { modo: 'ciclo', ref: null }, sim: null, pf: 'todas', caixaN: 6 },
  store: { mode: 'init', status: 'init', msg: '' }, esc: esc, $: $, $$: $$, ic: ic, R: R, F: F, sitBadge: sitBadge, stBadge: stBadge, screens: {}
};

/* ---------- persistência ---------- */
var LS = 'mcf.v1', st = A.store, dbh = null, lastDocs = {}, chain = Promise.resolve(), timer = null, claudeDownloads = null;
function lsRead() { try { var t = localStorage.getItem(LS); return t ? F.deserialize(t) : null; } catch (e) { return null; } }
function lsWrite(S) { try { localStorage.setItem(LS, F.serialize(S)); return true; } catch (e) { return false; } }
function setStatus(s, m) { st.status = s; st.msg = m || ''; var b = $('#sync'); if (b) b.outerHTML = syncHtml(); }
function syncHtml() {
  var t = { ok: ['ok', 'Salvo'], saving: ['warn', 'Salvando…'], local: ['warn', 'Só neste aparelho'], erro: ['bad', 'Erro ao salvar'], init: ['warn', 'Carregando…'] }[st.status] || ['warn', '…'];
  return '<button id="sync" class="sync ' + t[0] + '" data-act="go" data-to="ajustes" aria-label="Estado do salvamento: ' + t[1] + '"><i></i>' + t[1] + '</button>';
}
async function init() {
  var local = lsRead(), remote = null, dbOk = false, empty = false;
  try {
    var claude = window.claude;
    dbh = claude && claude.use ? await claude.use('db') : null;
    claudeDownloads = claude && claude.use ? await claude.use('downloads') : null;
  } catch (e) { dbh = null; }
  if (dbh) {
    try {
      var snap = await dbh.collection('mcf').get(), docs = {};
      snap.docs.forEach(function (d) { if (d.exists) docs[d.id] = d.data(); });
      Object.keys(docs).forEach(function (k) { lastDocs[k] = JSON.stringify(docs[k]); });
      dbOk = true; remote = F.fromDocs(docs); empty = !remote;
    } catch (e) { dbOk = false; st.msg = String(e && e.message || e); }
  }
  var S, dirty = false;
  if (remote && (!local || (remote.t || 0) >= (local.t || 0))) S = remote;
  else if (local) { S = local; dirty = true; }
  else if (dbOk || !dbh) { S = window.SEED.seedState(); dirty = true; }
  else { S = window.SEED.seedState(); dirty = false; } // db indisponível agora: não gravar por cima
  A.S = F.normalize(S);
  lsWrite(A.S); // mantém a cópia local sempre atualizada, mesmo quando o banco foi a fonte
  st.mode = dbOk ? 'db' : 'local';
  setStatus(dbOk ? 'ok' : 'local');
  if (dirty) { await flush(true); }
  return A.S;
}
function save() { setStatus('saving'); clearTimeout(timer); timer = setTimeout(function () { flush(); }, 350); }
function flush(full) {
  clearTimeout(timer);
  chain = chain.then(async function () {
    var S = A.S; S.t = Date.now();
    var localOk = lsWrite(S);
    if (!dbh || st.mode !== 'db') { setStatus(localOk ? 'local' : 'erro', localOk ? '' : 'Não foi possível salvar neste navegador. Exporte um backup.'); return; }
    try {
      var docs = F.toDocs(S); docs.core.t = S.t;
      var keys = Object.keys(docs);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], js = JSON.stringify(docs[k]);
        if (full || lastDocs[k] !== js) { await dbh.doc('mcf/' + k).set(docs[k]); lastDocs[k] = js; }
      }
      if (full) {
        var old = Object.keys(lastDocs);
        for (var j = 0; j < old.length; j++) if (!docs[old[j]]) { await dbh.doc('mcf/' + old[j]).delete(); delete lastDocs[old[j]]; }
      }
      setStatus('ok');
    } catch (e) { setStatus('erro', String(e && e.message || e)); }
  });
  return chain;
}
A.save = save; A.flush = flush; A.init = init;
A.replaceState = function (S) { A.S = F.normalize(S); return flush(true); };

/* ---------- arquivo para download (downloads) ou texto para copiar ---------- */
A.saveFile = async function (filename, data) {
  if (claudeDownloads) {
    try { await claudeDownloads.save({ filename: filename, data: data }); toast('Arquivo pronto: ' + filename); return true; }
    catch (e) { if (e && e.code === 'declined') { toast('Download cancelado.'); return false; } }
  }
  if (!window.claude) { // página aberta fora do Claude (arquivo local, GitHub Pages): download normal do navegador
    try { var bl = new Blob([data], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast('Arquivo baixado: ' + filename); return true; } catch (e) { }
  }
  modalCopy(filename, data); return false;
};
function modalCopy(filename, data) {
  var h = '<h2>Copiar ' + esc(filename) + '</h2><p class="hint">O download direto não está disponível neste modo de visualização. Copie o texto abaixo e cole num arquivo com este nome.</p><textarea id="copyarea" readonly style="min-height:200px;font-size:12px">' + esc(data) + '</textarea><div class="row"><button class="btn primary grow" data-act="copyarea">Copiar tudo</button><button class="btn grow" data-act="close">Fechar</button></div>';
  openSheet(h);
}

/* ---------- toast e modais ---------- */
var toastT = null;
function toast(msg, undo) {
  var el = $('#toast'); el.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo">Desfazer</button>' : '');
  el.hidden = false; A.undoFn = undo || null; clearTimeout(toastT);
  toastT = setTimeout(function () { el.hidden = true; A.undoFn = null; }, undo ? 9000 : 4500);
}
A.toast = toast;
var lastFocus = null;
function openSheet(html) {
  var m = $('#modal'); lastFocus = document.activeElement;
  m.innerHTML = '<div class="sheet-bg" data-act="bgclose"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>'; m.hidden = false;
  var f = $('.sheet input:not([type=hidden]),.sheet select,.sheet textarea,.sheet button', m); if (f) f.focus();
}
function closeSheet() { var m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { } }
A.openSheet = openSheet; A.closeSheet = closeSheet;
A.ask = function (o) {
  return new Promise(function (res) {
    A.askRes = res;
    openSheet('<h2>' + esc(o.title) + '</h2><p>' + (o.html || esc(o.text || '')) + '</p><div class="row wrapr"><button class="btn grow" data-act="ask-no">' + esc(o.no || 'Cancelar') + '</button><button class="btn grow ' + (o.danger ? 'danger' : 'primary') + '" data-act="ask-yes">' + esc(o.ok || 'Confirmar') + '</button></div>');
  });
};

/* ---------- roteador / render ---------- */
var ROUTES = {
  painel: ['Painel', 'home'], registrar: ['Registrar compra', 'plus'], historico: ['Histórico', 'list'], cartoes: ['Cartões', 'card'], faturas: ['Faturas e pagamentos', 'card'],
  parcelas: ['Parcelas e compromissos', 'cal'], mais: ['Mais', 'more'], relatorios: ['Relatórios', 'chart'], simulador: ['Posso comprar isso?', 'calc'], caixa: ['Caixa dos próximos ciclos', 'cash'], ajustes: ['Ajustes e backup', 'gear']
};
var GROUP = { painel: 'painel', registrar: 'registrar', historico: 'historico', cartoes: 'cartoes', faturas: 'cartoes', parcelas: 'cartoes', mais: 'mais', relatorios: 'mais', simulador: 'mais', caixa: 'mais', ajustes: 'mais' };
A.go = function (r) { if (location.hash.slice(1) === r) render(); else location.hash = r; };
function route() { var h = location.hash.slice(1); return ROUTES[h] ? h : 'painel'; }
function nav(r) {
  var g = GROUP[r], it = function (id, label, icn, plus) {
    return '<a href="#' + id + '" class="' + (plus ? 'plus' : '') + '"' + (g === id ? ' aria-current="page"' : '') + '>' + (plus ? '<span class="fab">' + ic(icn) + '</span>' : ic(icn)) + '<span>' + label + '</span></a>';
  };
  return '<nav class="nav" aria-label="Principal"><div>' + it('painel', 'Painel', 'home') + it('historico', 'Histórico', 'list') + it('registrar', 'Registrar', 'plus', true) + it('cartoes', 'Cartões', 'card') + it('mais', 'Mais', 'more') + '</div></nav>';
}
function render() {
  if (!A.S) return;
  var r = route(), y = window.scrollY, same = A.ui.route === r; A.ui.route = r;
  var scr = A.screens[r], title = ROUTES[r][0], sub = scr.sub ? scr.sub() : '';
  $('#app').innerHTML = '<div class="wrap"><header class="top"><div class="grow"><h1>' + esc(title) + '</h1>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + syncHtml() + '</header><main id="main" class="stack">' + scr.html() + '</main></div>' + nav(r);
  document.title = 'Meu Controle Financeiro';
  if (scr.after) scr.after();
  window.scrollTo(0, same ? y : 0);
}
A.render = render;
window.addEventListener('hashchange', function () { closeSheet(); render(); });

/* ---------- eventos ---------- */
var acts = A.acts = {
  close: function () { closeSheet(); },
  bgclose: function (e) { if (e.target.classList.contains('sheet-bg')) closeSheet(); },
  'ask-yes': function () { var r = A.askRes; A.askRes = null; closeSheet(); if (r) r(true); },
  'ask-no': function () { var r = A.askRes; A.askRes = null; closeSheet(); if (r) r(false); },
  go: function (e, el) { A.go(el.dataset.to); },
  undo: function () { var f = A.undoFn; A.undoFn = null; $('#toast').hidden = true; if (f) f(); },
  copyarea: function () { var t = $('#copyarea'); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { } if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(function () { toast('Copiado.'); }, function () { toast(ok ? 'Copiado.' : 'Selecione o texto e copie manualmente.'); }); else toast(ok ? 'Copiado.' : 'Selecione o texto e copie manualmente.'); }
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var f = acts[el.dataset.act]; if (f) { if (el.tagName === 'A' || el.type === 'submit') e.preventDefault(); f(e, el); }
});
document.addEventListener('input', function (e) { var el = e.target.closest('[data-in]'); if (el && A.inputs[el.dataset.in]) A.inputs[el.dataset.in](e, el); });
document.addEventListener('change', function (e) { var el = e.target.closest('[data-ch]'); if (el && A.inputs[el.dataset.ch]) A.inputs[el.dataset.ch](e, el); });
document.addEventListener('submit', function (e) { var f = e.target.closest('form[data-sub]'); if (f) { e.preventDefault(); if (A.inputs[f.dataset.sub]) A.inputs[f.dataset.sub](e, f); } });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) { if (A.askRes) acts['ask-no'](); else closeSheet(); } });
A.inputs = {};

/* ---------- tema ---------- */
A.applyTheme = function () {
  var t = A.S && A.S.settings.tema, el = document.documentElement;
  if (t === 'light' || t === 'dark') el.setAttribute('data-theme', t); else el.removeAttribute('data-theme');
};

/* ---------- utilidades de tela ---------- */
A.curKey = function () { return F.cycleKey(F.hoje(), A.S.settings.cicloDia); };
A.cardOptions = function (sel, withNone) {
  var S = A.S, o = withNone ? '<option value="">Não informado</option>' : '';
  S.cards.filter(function (c) { return c.ativo !== false; }).forEach(function (c) { o += '<option value="' + c.id + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; });
  return o;
};
A.catOptions = function (sel, o) {
  var S = A.S, h = (o && o.all) ? '<option value="">Todas</option>' : '<option value="">Sem categoria (não classificado)</option>';
  var g = function (label, tipo) {
    var cs = S.categories.filter(function (c) { return c.tipo === tipo && (c.ativa !== false || c.id === sel); });
    if (!cs.length) return '';
    return '<optgroup label="' + label + '">' + cs.map(function (c) { return '<option value="' + c.id + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(c.nome) + (c.ativa === false ? ' (inativa)' : '') + '</option>'; }).join('') + '</optgroup>';
  };
  return h + g('Alimentação (parte do teto)', 'alimentacao') + g('Outras compras (parte do teto)', 'outras') + g('Fora do teto', 'fora');
};
A.pct = function (n) { return String(n).replace('.', ','); };
A.bar = function (gasto, limite, s) {
  var pct = limite > 0 ? Math.min(100, Math.round(gasto * 1000 / limite) / 10) : (gasto > 0 ? 100 : 0);
  return '<div class="bar s-' + s + '" role="img" aria-label="' + A.pct(pct) + '% usado"><b style="width:' + Math.max(0, pct) + '%"></b><i style="left:' + A.S.settings.alertaPct + '%" title="Alerta"></i></div>';
};

window.addEventListener('DOMContentLoaded', async function () {
  $('#app').innerHTML = '<div class="wrap"><div class="empty">Carregando seus dados…</div></div>';
  try { await init(); } catch (e) { $('#app').innerHTML = '<div class="wrap"><div class="card" style="margin-top:20px"><h2>Não foi possível iniciar</h2><p class="small">' + esc(e && e.message || e) + '</p></div></div>'; return; }
  A.applyTheme(); render();
});
})();
