/* UI — Painel, Histórico, Registrar */
(function () {
'use strict';
var A = window.APP, F = A.F, esc = A.esc, R = A.R, ic = A.ic, $ = A.$, ui = A.ui;
var pm = F.parseMoney;

/* ================= PAINEL ================= */
function cycKey() { return ui.cycle || A.curKey(); }
A.screens.painel = {
  sub: function () { var S = A.S, k = cycKey(); return 'Ciclo ' + F.cycleLabel(k, S.settings.cicloDia); },
  html: function () {
    var S = A.S, st = S.settings, key = cycKey(), cur = key === A.curKey(), h = F.hoje(), p = F.painel(S, key, h), b = p.b, out = '';
    var r = F.cycleRange(key, st.cicloDia);
    out += '<div class="cyc"><button data-act="cyc" data-d="-1" aria-label="Ciclo anterior">' + ic('left') + '</button><div class="mid"><b>' + F.cycleLabel(key, st.cicloDia) + '</b><span class="small muted">' + (cur ? 'Ciclo atual · dia ' + (F.diffDays(h, r.ini) + 1) + ' de ' + (F.diffDays(r.fim, r.ini) + 1) : 'Ciclo ' + (key < A.curKey() ? 'passado' : 'futuro')) + '</span></div><button data-act="cyc" data-d="1" aria-label="Próximo ciclo">' + ic('right') + '</button></div>';
    if (b.antes) {
      out += '<div class="card"><h2>Antes do controle</h2><p class="small muted">O controle do teto começa em ' + F.fmtD(st.inicio) + '. Compras anteriores aparecem na fatura, mas não no orçamento.</p></div>';
    } else {
      var dias = cur ? F.diffDays(b.fim, h) + 1 : 0;
      out += '<section class="card hero" aria-labelledby="hs"><div class="lbl" id="hs">Saldo do teto do ciclo</div><div class="big money ' + (b.saldoTotal < 0 ? 'neg' : '') + '">' + R(b.saldoTotal) + '</div>' + A.sitBadge(b.sit) +
        A.bar(b.gastoTotal, b.efT, b.sit) +
        '<div class="row sb small muted"><span>Gasto <b class="money">' + R(b.gastoTotal) + '</b> (' + A.pct(b.pct) + '%)</span><span>Teto <b class="money">' + R(b.efT) + '</b></span></div>' +
        (cur && b.saldoTotal > 0 && dias > 0 ? '<p class="small muted" style="margin-top:8px">Restam ' + dias + ' dia' + (dias > 1 ? 's' : '') + ' no ciclo: cerca de <b class="money">' + R(Math.floor(b.saldoTotal / dias)) + '</b> por dia.</p>' : '') +
        (b.carry.a + b.carry.o + b.carry.x > 0 ? '<p class="small" style="margin-top:8px">Teto reduzido em <b class="money">' + R(b.carry.a + b.carry.o + b.carry.x) + '</b> por excesso do ciclo anterior.</p>' : '') + '</section>';
      out += '<div class="grid2 stackm">' + sub('Alimentação', b.gastoAlim, b.efA, b.saldoAlim, b.sitAlim, b.pctAlim) + sub('Outras compras', b.gastoOutras, b.efO, b.saldoOutras, b.sitOutras, b.pctOutras) + '</div>';
      out += '<p class="hint" style="margin-top:-4px">Alimentação faz parte do teto de ' + R(b.efT) + ', não é somada por cima. ' + (b.gastoNC > 0 ? 'Compras sem categoria (' + R(b.gastoNC) + ') contam só no total.' : '') + '</p>';
      if (b.fora > 0) out += '<div class="card flat"><div class="row sb"><span>Fora do teto neste ciclo <span class="hint">(aluguel, Pix e encargos)</span></span><b class="money">' + R(b.fora) + '</b></div></div>';
    }
    if (p.alertas.length) {
      out += '<section class="stack" aria-label="Alertas" style="gap:8px">' + p.alertas.map(function (a) {
        var icn = a.n === 'alto' ? 'x' : a.n === 'medio' ? 'warn' : 'info', tag = a.ir ? 'button' : 'div';
        return '<' + tag + ' class="alert ' + a.n + '"' + (a.ir ? ' data-act="alertgo" data-ir="' + esc(a.ir) + '"' : '') + '>' + ic(icn) + '<span>' + esc(a.t) + '</span></' + tag + '>';
      }).join('') + '</section>';
    }
    // faturas
    out += '<section class="card" aria-labelledby="hf"><div class="row sb"><h2 id="hf">Faturas em aberto</h2><span class="small muted money">Total ' + R(p.fatTot) + '</span></div><div class="list">' +
      S.cards.filter(function (c) { return c.ativo !== false; }).map(function (c) {
        var f = p.cur[c.id]; if (!f) return '';
        var base = f.banco != null ? f.banco : f.estimado;
        return '<button class="li main" style="all:unset;display:flex;gap:10px;align-items:center;cursor:pointer;padding:11px 0;border-top:1px solid var(--line);width:100%" data-act="openinv" data-c="' + c.id + '" data-m="' + f.mes + '"><div class="grow"><div class="t bold">' + esc(c.nome) + ' <span class="muted small">· ' + F.fmtMes(f.mes) + '</span></div><div class="s small muted">Fecha ' + F.fmtDC(f.fech) + (f.prevPag ? ' · pagar ' + F.fmtDC(f.prevPag) : '') + '</div></div><div class="right"><div class="v bold money">' + R(f.saldo > 0 ? f.saldo : base) + '</div>' + A.stBadge(f.statusExib) + '</div></button>';
      }).join('') + '</div></section>';
    // parcelas
    out += '<section class="card"><h2>Parcelas</h2><div class="grid2"><div class="mini"><span class="small muted">Parcelas antigas nas faturas atuais</span><span class="n money">' + R(p.parcAntCiclo) + '</span></div><div class="mini"><span class="small muted">Parcelas depois das faturas atuais</span><span class="n money">' + R(p.parcFut) + '</span></div></div><button class="btn sm block" style="margin-top:12px" data-act="go" data-to="parcelas">Ver calendário de parcelas</button></section>';
    // anteriores
    var an = F.anteriores(S);
    if (an.n) out += '<section class="card"><h2>Anteriores ao marco zero</h2><p class="small muted">À vista de antes de ' + F.fmtDC(st.inicio) + ' que já estão nas faturas. Ficam fora do teto, mas com controle próprio.</p><div class="row sb" style="margin-top:8px"><span>' + an.n + ' lançamentos</span><b class="money">' + R(an.total) + '</b></div><button class="btn sm block" style="margin-top:10px" data-act="verant">Ver detalhes</button></section>';
    // último
    if (p.ult) out += '<section class="card"><h2>Último lançamento</h2><div class="row sb"><div class="grow"><div class="bold ellip">' + esc(p.ult.desc) + '</div><div class="small muted">' + F.fmtD(p.ult.data) + ' · ' + esc(F.formaCurto(S, p.ult.cartao)) + ' · ' + esc(F.catNome(S, p.ult.cat)) + '</div></div><b class="money">' + R(p.ult.valor) + '</b></div></section>';
    else if (!b.antes) out += '<div class="card empty"><p>Nenhuma compra neste ciclo ainda.</p></div>';
    out += '<a class="btn primary block" href="#registrar">' + ic('plus') + ' Registrar compra</a>';
    return out;
  }
};
function sub(titulo, gasto, lim, saldo, s, pct) {
  return '<div class="card"><h3>' + titulo + '</h3><div class="n money bold" style="font-size:21px;margin:6px 0 2px;' + (saldo < 0 ? 'color:var(--bad)' : '') + '">' + R(saldo) + '</div><div class="small muted">saldo</div>' + A.bar(gasto, lim, s) +
    '<div class="small muted money">' + R(gasto) + ' de ' + R(lim) + '</div><div style="margin-top:8px">' + A.sitBadge(s) + '</div></div>';
}
A.acts.cyc = function (e, el) { ui.cycle = F.addM(cycKey(), +el.dataset.d); A.render(); };
A.acts.openinv = function (e, el) { ui.inv = { cartao: el.dataset.c, mes: el.dataset.m }; A.go('faturas'); };
A.acts.verant = function () { ui.hf.scope = 'anteriores'; ui.hf.limit = 60; A.go('historico'); };
A.acts.alertgo = function (e, el) {
  var a = el.dataset.ir.split(':');
  if (a[0] === 'historico') { ui.hf.scope = 'pendentes'; ui.hf.cartao = a[1] === 'semcartao' ? '_nenhum' : ''; ui.hf.cat = ''; ui.hf.q = ''; A.go('historico'); }
  else if (a[0] === 'faturas') { ui.inv = { cartao: a[1], mes: a[2] }; A.go('faturas'); }
  else A.go(a[0] === 'config' ? 'ajustes' : a[0]);
};

/* ================= HISTÓRICO ================= */
var SCOPES = [['ciclo', 'Ciclo atual'], ['todos', 'Todos'], ['novas', 'Compras novas'], ['antigas', 'Parcelas antigas'], ['anteriores', 'Anteriores ao marco zero'], ['pendentes', 'Com pendência'], ['excluidas', 'Excluídos']];
function filtered() {
  var S = A.S, f = ui.hf, sd = S.settings.cicloDia, ck = A.curKey(), q = f.q.trim().toLowerCase();
  return S.purchases.filter(function (p) {
    var del = p.st === 'excluida';
    if ((f.scope === 'excluidas') !== del) return false;
    var antiga = F.isAntiga(S, p), ori = F.origem(S, p);
    switch (f.scope) {
      case 'ciclo': if (antiga || ori !== 'nova' || F.cycleKey(p.data, sd) !== ck) return false; break;
      case 'novas': if (antiga || ori !== 'nova') return false; break;
      case 'antigas': if (!antiga) return false; break;
      case 'anteriores': if (p.tipo === 'parcelado' || ori !== 'anterior') return false; break;
      case 'pendentes': if (p.cartao && p.cs !== 'pendente' && p.cat) return false; if (antiga || p.aj) return false; break;
    }
    if (f.cartao) { if (f.cartao === '_nenhum' ? !!p.cartao : p.cartao !== f.cartao) return false; }
    if (f.cat) { if (f.cat === '_nc' ? !!(p.cat && F.catById(S, p.cat)) : p.cat !== f.cat) return false; }
    if (q) { var hay = (p.desc + ' ' + (p.obs || '') + ' ' + F.catNome(S, p.cat) + ' ' + F.formaNome(S, p.cartao)).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : (b.c || 0) - (a.c || 0); });
}
function shown(p) { return F.isAntiga(A.S, p) ? p.vp : p.valor; }
function rowP(p) {
  var S = A.S, del = p.st === 'excluida', antiga = F.isAntiga(S, p), ori = F.origem(S, p), tags = '';
  if (p.aj) tags += '<span class="tag info">Ajuste</span> ';
  if (p.tipo === 'parcelado') tags += antiga ? '<span class="tag info">Parcela antiga ' + p.k + '/' + p.n + '</span> ' : '<span class="tag">' + p.n + 'x</span> ';
  else if (ori === 'anterior') tags += '<span class="tag info">Anterior ao marco zero</span> ';
  if (!p.cartao) tags += '<span class="tag warn">Sem cartão</span> '; else if (p.cs === 'pendente' && !antiga) tags += '<span class="tag warn">Ciclo a confirmar</span> ';
  if (!p.cat || !F.catById(S, p.cat)) tags += '<span class="tag warn">Não classificado</span> ';
  if (F.catTipo(S, p.cat) === 'fora') tags += '<span class="tag">Fora do teto</span> ';
  if (del) tags += '<span class="tag bad">Excluída</span>';
  var open = ui.open === p.id;
  var h = '<div class="li' + (del ? ' del' : '') + '"><button class="main" data-act="toggle" data-id="' + p.id + '" aria-expanded="' + open + '"><div class="grow"><div class="t ellip">' + esc(p.desc) + '</div><div class="s">' + F.fmtDC(p.data) + ' · ' + esc(F.formaCurto(S, p.cartao)) + ' · ' + esc(F.catNome(S, p.cat)) + '</div><div style="margin-top:3px">' + tags + '</div></div><div class="v money ' + (p.valor < 0 ? 'pos' : '') + '">' + R(shown(p)) + '</div></button></div>';
  if (open) h += detailP(p);
  return h;
}
function detailP(p) {
  var S = A.S, del = p.st === 'excluida', mf = F.mesFatura(S, p), x = '';
  x += kv('Data', F.fmtD(p.data)) + kv('Pagamento', F.formaNome(S, p.cartao)) + kv('Categoria', F.catNome(S, p.cat) + (F.catTipo(S, p.cat) === 'fora' ? ' (fora do teto)' : ''));
  if (p.tipo === 'parcelado') {
    var pa = F.parcelaAtual(S, p), ps = pa.todas;
    x += kv('Parcelamento', p.n + ' parcelas' + (F.isAntiga(S, p) ? ' (compra anterior: parcela ' + p.k + ' atual)' : '')) + kv('Valor da parcela', R(p.vp || (ps[0] && ps[0].valor)));
    if (!F.isAntiga(S, p)) x += kv('Valor total', R(p.valor) + ' (conta uma vez no teto)');
    x += kv('Restam', ps.length + ' parcela' + (ps.length === 1 ? '' : 's') + ' · ' + R(ps.reduce(function (a, b) { return a + b.valor; }, 0)));
    if (ps.length) x += kv('Faturas', F.fmtMes(ps[0].mes) + ' até ' + F.fmtMes(ps[ps.length - 1].mes));
  } else x += kv('Fatura', mf ? F.fmtMes(mf) : 'Pendente (sem cartão)');
  if (p.obs) x += kv('Observação', esc(p.obs));
  var btn = del ? '<button class="btn sm" data-act="restore" data-id="' + p.id + '">' + ic('undo') + ' Restaurar</button>' :
    '<button class="btn sm" data-act="edit" data-id="' + p.id + '">' + ic('edit') + ' Editar</button><button class="btn sm danger" data-act="del" data-id="' + p.id + '">' + ic('trash') + ' Excluir</button>';
  return '<div class="detail">' + x + '<div class="row wrapr">' + btn + '</div></div>';
}
function kv(a, b) { return '<div class="kv"><span>' + a + '</span><b>' + b + '</b></div>'; }
A.kv = kv; A.rowP = rowP;

A.screens.historico = {
  sub: function () { return ''; },
  html: function () {
    var S = A.S, f = ui.hf, list = filtered(), out = '';
    out += '<div class="card stack"><div class="field"><label for="hq">Buscar</label><input id="hq" type="search" value="' + esc(f.q) + '" placeholder="Descrição, categoria ou cartão" data-in="hq"></div>' +
      '<div class="field"><label for="hs2">Mostrar</label><select id="hs2" data-ch="hscope">' + SCOPES.map(function (s) { return '<option value="' + s[0] + '"' + (f.scope === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="grid2"><div class="field"><label for="hc">Cartão</label><select id="hc" data-ch="hcard"><option value="">Todos</option><option value="_nenhum"' + (f.cartao === '_nenhum' ? ' selected' : '') + '>Sem cartão</option>' + S.cards.map(function (c) { return '<option value="' + c.id + '"' + (f.cartao === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="hk">Categoria</label><select id="hk" data-ch="hcat">' + A.catOptions(f.cat, { all: true }).replace('</option>', '</option><option value="_nc"' + (f.cat === '_nc' ? ' selected' : '') + '>Não classificado</option>') + '</select></div></div></div>';
    if (f.scope === 'anteriores') out += anterioresCard();
    var tot = list.reduce(function (a, p) { return a + shown(p); }, 0);
    out += '<div class="row sb small muted"><span>' + list.length + ' lançamento' + (list.length === 1 ? '' : 's') + '</span><span>Soma <b class="money">' + R(tot) + '</b></span></div>';
    if (!list.length) { out += '<div class="card empty"><p>Nenhum lançamento encontrado com esses filtros.</p></div>'; }
    else {
      var lastD = '', body = '';
      list.slice(0, f.limit).forEach(function (p) { if (p.data !== lastD) { lastD = p.data; body += '<div class="day">' + F.fmtD(p.data) + '</div>'; } body += rowP(p); });
      out += '<div class="card" style="padding-top:2px">' + body + '</div>';
      if (list.length > f.limit) out += '<button class="btn block" data-act="more">Mostrar mais (' + (list.length - f.limit) + ')</button>';
    }
    return out;
  }
};
function anterioresCard() {
  var S = A.S, a = F.anteriores(S), out = '<section class="card stack"><h2>Controle: anteriores ao marco zero</h2><p class="small muted">Compras à vista feitas antes de ' + F.fmtD(S.settings.inicio) + ' que já estão nas faturas. Não consomem o teto.</p><div class="row sb"><span>Total</span><b class="money" style="font-size:20px">' + R(a.total) + '</b></div>';
  if (a.limite) out += '<div>' + A.bar(a.total, a.limite, a.sit) + '<div class="small muted money">Limite de acompanhamento ' + R(a.limite) + ' · ' + esc(F.SIT_TXT[a.sit]) + '</div></div>';
  var ent = function (o, nome) { return Object.keys(o).sort(function (x, y) { return o[y] - o[x]; }).map(function (k) { return kv(esc(nome(k)), '<span class="money">' + R(o[k]) + '</span>'); }).join(''); };
  out += '<details><summary>Por categoria</summary>' + ent(a.porCat, function (k) { return k === '_nc' ? 'Não classificado' : F.catNome(S, k); }) + '</details>';
  out += '<details><summary>Por cartão</summary>' + ent(a.porCartao, function (k) { return k === '_nenhum' ? 'Sem cartão' : F.formaNome(S, k); }) + '</details>';
  return out + '</section>';
}
A.inputs.hq = function (e, el) { ui.hf.q = el.value; ui.hf.limit = 60; clearTimeout(A._hq); A._hq = setTimeout(function () { var pos = el.selectionStart; A.render(); var n = $('#hq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } }, 300); };
A.inputs.hscope = function (e, el) { ui.hf.scope = el.value; ui.hf.limit = 60; A.render(); };
A.inputs.hcard = function (e, el) { ui.hf.cartao = el.value; A.render(); };
A.inputs.hcat = function (e, el) { ui.hf.cat = el.value; A.render(); };
A.acts.more = function () { ui.hf.limit += 60; A.render(); };
A.acts.toggle = function (e, el) { ui.open = ui.open === el.dataset.id ? null : el.dataset.id; A.render(); };
A.acts.restore = function (e, el) {
  var r = F.restorePurchase(A.S, el.dataset.id); if (r.ok) { A.save(); A.toast('Lançamento restaurado.'); A.render(); }
};
A.acts.del = async function (e, el) {
  var S = A.S, p = S.purchases.find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
  var np = F.parcelasDe(S, p).length;
  var ok = await A.ask({ title: 'Excluir este lançamento?', html: '<b>' + esc(p.desc) + '</b> · ' + R(F.isAntiga(S, p) ? p.vp : p.valor) + (np ? '<br><br>As <b>' + np + ' parcelas</b> ainda previstas serão canceladas. Outras compras não mudam.' : '') + '<br><br>Você poderá desfazer logo após excluir ou restaurar depois em “Excluídos”.', ok: 'Excluir', danger: true });
  if (!ok) return;
  F.deletePurchase(S, p.id); ui.open = null; A.save();
  if (ui.editId === p.id) { ui.editId = null; ui.draft = null; A.go('historico'); } else A.render();
  A.toast('Lançamento excluído.', function () { F.restorePurchase(S, p.id); A.save(); A.render(); });
};
A.acts.edit = function (e, el) {
  var p = A.S.purchases.find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
  ui.editId = p.id; ui.draft = A.draftFrom(p); ui.errs = null; A.go('registrar');
};

/* ================= REGISTRAR ================= */
function emptyDraft() { return { data: F.hoje(), desc: '', valor: '', cartao: '', cat: '', tipo: 'avista', n: '', vp: '', k: '1', basis: 'total', obs: '', mf: '', catAuto: false }; }
A.draftFrom = function (p) {
  return { data: p.data, desc: p.desc, valor: p.tipo === 'parcelado' && p.vf ? '' : F.fmtIn(p.valor), cartao: p.cartao || '', cat: p.cat || '', tipo: p.tipo, n: p.n ? String(p.n) : '', vp: p.vp ? F.fmtIn(p.vp) : '', k: String(p.k || 1),
    basis: p.vf && !F.isAntiga(A.S, p) ? 'parcela' : 'total', obs: p.obs || '', mf: (p.tipo === 'parcelado' ? p.mes1 : p.mf) || '', catAuto: false, aj: !!p.aj };
};
function isAntigaD(d) { return d.tipo === 'parcelado' && F.isoOk(d.data) && d.data < A.S.settings.inicio; }
function toInput(d) {
  var i = { data: d.data, desc: d.desc, cartao: d.cartao || null, cat: d.cat || null, tipo: d.tipo, obs: d.obs, aj: !!d.aj, cs: d.csKeep || undefined };
  if (d.tipo === 'parcelado') {
    i.n = parseInt(d.n, 10); i.mes1 = d.mf || null;
    if (isAntigaD(d)) { i.vp = pm(d.vp); i.k = parseInt(d.k || '1', 10); if (!i.mes1 && d.cartao) i.mes1 = F.currentInv(A.S, d.cartao); }
    else if (d.basis === 'parcela') { i.vp = pm(d.vp); i.vf = true; }
    else i.valor = pm(d.valor);
  } else { i.valor = pm(d.valor); i.mf = d.mf || null; }
  return i;
}
function monthOpts(d) {
  var S = A.S, c = d.cartao && F.cardById(S, d.cartao); if (!c) return '<option value="">Defina o cartão primeiro</option>';
  var base = F.currentInv(S, c.id), o = '<option value="">Automático (pelo fechamento)</option>';
  for (var i = -1; i <= 8; i++) { var k = F.addM(base, i); o += '<option value="' + k + '"' + (d.mf === k ? ' selected' : '') + '>' + F.fmtMes(k) + ' · fecha ' + F.fmtDC(F.closingDate(c, k)) + '</option>'; }
  return o;
}
function parcBlock(d) {
  var antiga = isAntigaD(d), err = ui.errs || {};
  var fld = function (id, k, lab, val, ph, mode) { return '<div class="field"><label for="' + id + '">' + lab + '</label><input id="' + id + '" inputmode="' + (mode || 'decimal') + '" autocomplete="off" placeholder="' + ph + '" value="' + esc(val) + '" data-in="regIn" data-k="' + k + '"' + (k === 'vp' || k === 'valor' ? ' data-ch="regMoney"' : '') + (err[k] ? ' aria-invalid="true" aria-describedby="e-' + k + '"' : '') + '>' + (err[k] ? '<span class="err" id="e-' + k + '">' + esc(err[k]) + '</span>' : '') + '</div>'; };
  var x = '';
  if (antiga) {
    x += '<div class="alert info">' + ic('info') + '<span>Data anterior a ' + F.fmtD(A.S.settings.inicio) + ': será lançada como <b>parcela antiga</b>. Entra na fatura e nas projeções, mas não conta como compra nova do mês.</span></div>';
    x += '<div class="grid2">' + fld('f-vp', 'vp', 'Valor da parcela', d.vp, '0,00') + fld('f-n', 'n', 'Total de parcelas', d.n, '10', 'numeric') + '</div>' + fld('f-k', 'k', 'Parcela que está na fatura agora', d.k, '1', 'numeric');
  } else {
    x += '<div class="seg" role="group" aria-label="O valor informado é"><button type="button" data-act="basis" data-v="total" aria-pressed="' + (d.basis === 'total') + '">Valor total</button><button type="button" data-act="basis" data-v="parcela" aria-pressed="' + (d.basis === 'parcela') + '">Valor da parcela</button></div>';
    x += '<div class="grid2">' + (d.basis === 'total' ? fld('f-valor2', 'valor', 'Valor total', d.valor, '0,00') : fld('f-vp', 'vp', 'Valor da parcela', d.vp, '0,00')) + fld('f-n', 'n', 'Nº de parcelas', d.n, '6', 'numeric') + '</div>';
  }
  return x;
}
A.screens.registrar = {
  sub: function () { return ui.editId ? 'Editando lançamento' : 'Anote em poucos segundos'; },
  html: function () {
    var S = A.S; if (!ui.draft) ui.draft = emptyDraft();
    var d = ui.draft, err = ui.errs || {}, edit = !!ui.editId, last = S.settings.ultimoCartao, out = '';
    var fe = function (k) { return err[k] ? ' aria-invalid="true" aria-describedby="e-' + k + '"' : ''; }, em = function (k) { return err[k] ? '<span class="err" id="e-' + k + '">' + esc(err[k]) + '</span>' : ''; };
    var descs = {}; S.purchases.slice().reverse().forEach(function (p) { if (!p.aj && Object.keys(descs).length < 150) descs[p.desc] = 1; });
    out += '<form class="stack" data-sub="regSubmit" novalidate>';
    if (ui.errList && ui.errList.length) out += '<div class="alert alto" role="alert">' + ic('x') + '<span>Revise: ' + ui.errList.map(esc).join(' ') + '</span></div>';
    out += '<div class="card stack">';
    out += '<div class="seg" role="group" aria-label="Modalidade"><button type="button" data-act="tipo" data-v="avista" aria-pressed="' + (d.tipo === 'avista') + '">À vista</button><button type="button" data-act="tipo" data-v="parcelado" aria-pressed="' + (d.tipo === 'parcelado') + '">Parcelado</button></div>';
    if (d.tipo === 'avista') out += '<div class="field"><label for="f-valor">Valor</label><input id="f-valor" class="money-in money" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(d.valor) + '" data-in="regIn" data-ch="regMoney" data-k="valor"' + fe('valor') + '>' + em('valor') + '</div>';
    out += '<div id="parc">' + (d.tipo === 'parcelado' ? parcBlock(d) : '') + '</div>';
    out += '<div class="field"><label for="f-desc">Descrição</label><input id="f-desc" list="dl-desc" autocomplete="off" placeholder="Ex.: Mercado, Uber, iFood" value="' + esc(d.desc) + '" data-in="regIn" data-ch="regDesc" data-k="desc"' + fe('desc') + '>' + em('desc') + '<datalist id="dl-desc">' + Object.keys(descs).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div>';
    out += '<div class="field"><label for="f-data">Data da compra</label><input id="f-data" type="date" value="' + esc(d.data) + '" data-in="regIn" data-ch="regDate" data-k="data"' + fe('data') + '>' + em('data') + '</div>';
    out += '<div class="field"><span class="lab" id="lc">Cartão ou forma de pagamento</span><div class="chips" role="group" aria-labelledby="lc">' +
      S.cards.filter(function (c) { return c.ativo !== false; }).map(function (c) { return '<button type="button" class="chipb" data-act="card" data-v="' + c.id + '" aria-pressed="' + (d.cartao === c.id) + '">' + esc(c.curto || c.nome) + (last === c.id && d.cartao !== c.id ? ' <span class="tiny muted">(último)</span>' : '') + '</button>'; }).join('') +
      S.formas.map(function (c) { return '<button type="button" class="chipb" data-act="card" data-v="' + c.id + '" aria-pressed="' + (d.cartao === c.id) + '">' + esc(c.nome) + '</button>'; }).join('') + '</div>' +
      (!d.cartao ? '<span class="hint">Sem cartão, a compra é salva como <b>pendente</b>: o app não escolhe cartão por você.</span>' : '') + em('cartao') + '</div>';
    out += '<div class="field"><label for="f-cat">Categoria</label><select id="f-cat" data-ch="regCat"' + fe('cat') + '>' + A.catOptions(d.cat) + '</select><span class="hint" id="cat-hint"></span></div>';
    out += '<details><summary>Mais opções</summary><div class="stack" style="padding-top:8px"><div class="field"><label for="f-mf">Fatura em que a compra cai</label><select id="f-mf" data-ch="regMf">' + monthOpts(d) + '</select><span class="hint">Use se o banco lançou em outra fatura que a prevista pelo fechamento.</span></div><div class="field"><label for="f-obs">Observação</label><textarea id="f-obs" data-in="regIn" data-k="obs">' + esc(d.obs) + '</textarea></div></div></details>';
    out += '</div>';
    out += '<div id="prev" class="card flat" aria-live="polite"></div>';
    if (ui.dup) out += '<div class="alert medio" role="alert">' + ic('warn') + '<span>Parece duplicado: já existe <b>' + esc(ui.dup.desc) + '</b> de ' + R(ui.dup.valor) + ' em ' + F.fmtD(ui.dup.data) + ' no mesmo cartão. Se é outra compra, toque em “Salvar mesmo assim”.</span></div>';
    out += '<div class="row wrapr">' + (edit ? '<button type="button" class="btn grow" data-act="canceledit">Cancelar</button>' : '') + (ui.dup ? '<button type="button" class="btn grow" data-act="dupno">Cancelar</button><button type="submit" class="btn primary grow" data-dup="1">Salvar mesmo assim</button>' : '<button type="submit" class="btn primary grow">' + ic('check') + (edit ? ' Salvar alterações' : ' Salvar compra') + '</button>') + '</div>';
    if (edit) out += '<button type="button" class="btn danger block" data-act="del" data-id="' + ui.editId + '">' + ic('trash') + ' Excluir este lançamento</button>';
    out += '</form>';
    return out;
  },
  after: function () { updatePreview(); }
};
function updatePreview() {
  var el = $('#prev'); if (!el) return;
  var S = A.S, d = ui.draft, i = toInput(d), e = F.validate(S, i), x = '';
  if (e.length) { el.innerHTML = '<p class="small muted">Preencha os campos para ver o impacto no orçamento.</p>'; return; }
  var edit = ui.editId, keep = null;
  if (edit) { var op = S.purchases.find(function (p) { return p.id === edit; }); if (op) { keep = op.st; op.st = 'excluida'; } }
  try {
    var r = F.simular(S, i);
    var antiga = F.isAntiga(S, { tipo: i.tipo, data: i.data });
    x += '<h3>Impacto</h3>';
    if (i.tipo === 'parcelado') {
      var ps = r.parcelas;
      x += '<p class="small">' + ps.length + (antiga ? ' parcelas restantes' : ' parcelas') + ' de <b class="money">' + R(ps[0] ? ps[0].valor : 0) + '</b>' + (ps.length && ps[0].mes ? ' · de ' + F.fmtMes(ps[0].mes) + ' a ' + F.fmtMes(ps[ps.length - 1].mes) : ' · fatura a definir (informe o cartão)') + '</p>';
    }
    if (antiga) x += '<p class="small muted">Parcela antiga: aparece na fatura e na projeção, não altera as compras novas nem o teto.</p>';
    else if (r.anterior) x += '<p class="small muted">Data anterior ao marco zero: entra só na fatura, fora do teto.</p>';
    else if (r.fora) x += '<p class="small muted">Categoria fora do teto: não reduz o saldo do orçamento.</p>';
    else {
      x += '<div class="kv"><span>Saldo do teto antes</span><b class="money">' + R(r.antes.saldoTotal) + '</b></div><div class="kv"><span>Saldo do teto depois' + (i.tipo === 'parcelado' ? ' (valor total, uma vez)' : '') + '</span><b class="money ' + (r.depois.saldoTotal < 0 ? 'neg' : '') + '">' + R(r.depois.saldoTotal) + '</b></div>';
      if (r.tipoCat === 'alimentacao') x += '<div class="kv"><span>Saldo de Alimentação depois</span><b class="money">' + R(r.depois.saldoAlim) + '</b></div>';
      if (r.tipoCat === 'outras') x += '<div class="kv"><span>Saldo de Outras compras depois</span><b class="money">' + R(r.depois.saldoOutras) + '</b></div>';
      x += '<div style="margin-top:6px">' + A.sitBadge(r.depois.sit) + '</div>';
    }
  } finally { if (keep) { var op2 = S.purchases.find(function (p) { return p.id === edit; }); if (op2) op2.st = keep; } }
  el.innerHTML = x;
}
function setPartial() { var d = ui.draft; $('#parc').innerHTML = d.tipo === 'parcelado' ? parcBlock(d) : ''; var mf = $('#f-mf'); if (mf) mf.innerHTML = monthOpts(d); updatePreview(); }
A.acts.tipo = function (e, el) { ui.draft.tipo = el.dataset.v; ui.errs = null; ui.errList = null; ui.dup = null; A.render(); };
A.acts.basis = function (e, el) { ui.draft.basis = el.dataset.v; A.render(); };
A.acts.card = function (e, el) { var d = ui.draft; d.cartao = d.cartao === el.dataset.v ? '' : el.dataset.v; d.mf = ''; ui.dup = null; A.render(); };
A.acts.canceledit = function () { ui.editId = null; ui.draft = null; ui.errs = null; ui.errList = null; A.go('historico'); };
A.acts.dupno = function () { ui.dup = null; A.render(); };
A.inputs.regIn = function (e, el) {
  var d = ui.draft, k = el.dataset.k, was = k === 'data' ? isAntigaD(d) : null;
  d[k] = el.value; ui.dup = null;
  if (k === 'data' && was !== isAntigaD(d)) setPartial(); else updatePreview();
};
A.inputs.regMoney = function (e, el) { var c = pm(el.value); if (!isNaN(c) && c !== 0) { el.value = F.fmtIn(c); ui.draft[el.dataset.k] = el.value; updatePreview(); } };
A.inputs.regDate = function () { };
A.inputs.regCat = function (e, el) { ui.draft.cat = el.value; ui.draft.catAuto = false; $('#cat-hint').textContent = ''; updatePreview(); };
A.inputs.regMf = function (e, el) { ui.draft.mf = el.value; updatePreview(); };
A.inputs.regDesc = function (e, el) {
  var d = ui.draft; d.desc = el.value;
  if ((!d.cat || d.catAuto) && el.value.trim()) {
    var s = F.suggestCat(A.S, el.value);
    if (s && F.catById(A.S, s)) { d.cat = s; d.catAuto = true; $('#f-cat').value = s; $('#cat-hint').textContent = 'Sugerida pelo seu histórico. Troque se quiser.'; updatePreview(); }
  }
};
A.inputs.regSubmit = function (e, form) {
  var S = A.S, d = ui.draft, i = toInput(d), errs = F.validate(S, i), force = e.submitter && e.submitter.dataset.dup;
  if (errs.length) {
    ui.errs = {}; ui.errList = [];
    errs.forEach(function (x) { ui.errs[x.campo] = ui.errs[x.campo] || x.msg; ui.errList.push(x.msg); });
    A.render(); var first = errs[0].campo, map = { valor: 'f-valor', desc: 'f-desc', data: 'f-data', n: 'f-n', vp: 'f-vp', k: 'f-k' }, t = $('#' + (map[first] || 'f-desc')) || $('#f-valor2'); if (t) t.focus(); return;
  }
  ui.errs = null; ui.errList = null;
  if (!ui.editId && !force) { var dup = F.findDup(S, i); if (dup) { ui.dup = dup; A.render(); return; } }
  ui.dup = null;
  if (ui.editId) {
    var old = S.purchases.find(function (p) { return p.id === ui.editId; });
    if (old && old.cartao === i.cartao && old.data === i.data) i.cs = old.cs; // mantém confirmação do ciclo se nada mudou
    var r = F.editPurchase(S, ui.editId, i);
    if (!r.ok) { A.toast(r.errors[0].msg); return; }
    ui.editId = null; ui.draft = null; A.save(); A.toast('Alterações salvas.'); A.go('historico'); return;
  }
  var res = F.addPurchase(S, i); if (!res.ok) { A.toast(res.errors[0].msg); return; }
  var p = res.purchase; if (p.cartao && S.cards.some(function (c) { return c.id === p.cartao; })) S.settings.ultimoCartao = p.cartao;
  A.save();
  var b = F.budget(S, F.cycleKey(p.data, S.settings.cicloDia)), msg = 'Salvo: ' + p.desc + ' · ' + R(F.isAntiga(S, p) ? p.vp : p.valor);
  if (!b.antes && F.origem(S, p) === 'nova' && F.catTipo(S, p.cat) !== 'fora') msg += b.saldoTotal < 0 ? ' · teto ultrapassado em ' + R(-b.saldoTotal) : ' · saldo ' + R(b.saldoTotal);
  var nd = emptyDraft(); nd.data = d.data; ui.draft = nd;
  A.render(); A.toast(msg, function () { F.deletePurchase(S, p.id); A.save(); A.render(); });
  var v = $('#f-valor'); if (v) v.focus();
};
})();
