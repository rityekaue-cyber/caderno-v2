/* Meu Controle Financeiro — motor de cálculo.
   Tudo em centavos inteiros. Sem DOM. Testável em Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FIN = factory();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

/* ============ dinheiro ============ */
function parseMoney(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
  var s = String(input == null ? '' : input).trim();
  if (!s) return NaN;
  s = s.replace(/R\$\s*/gi, '').replace(/\s/g, '');
  var neg = false;
  if (s[0] === '-' || s[0] === '−') { neg = true; s = s.slice(1); }
  if (!/^[0-9.,]+$/.test(s)) return NaN;
  var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  var ip, dp = '';
  if (lc >= 0 && lc > ld) { ip = s.slice(0, lc).replace(/\./g, ''); dp = s.slice(lc + 1); }
  else if (ld >= 0 && lc < 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) { ip = s.replace(/\./g, ''); }
  else if (ld >= 0 && ld > lc) { ip = s.slice(0, ld).replace(/[.,]/g, ''); dp = s.slice(ld + 1); }
  else ip = s.replace(/[.,]/g, '');
  if (dp.length > 2 || !/^\d*$/.test(ip) || !/^\d*$/.test(dp)) return NaN;
  var c = parseInt(ip || '0', 10) * 100 + parseInt((dp + '00').slice(0, 2), 10);
  return neg ? -c : c;
}
function fmt(c) {
  if (c == null || isNaN(c)) return '—';
  var neg = c < 0, a = Math.abs(Math.round(c));
  var i = Math.floor(a / 100), d = String(a % 100).padStart(2, '0');
  return (neg ? '−' : '') + 'R$ ' + String(i).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}
function fmtIn(c) { // para campos de entrada: 1234,56
  if (c == null || isNaN(c)) return '';
  var neg = c < 0, a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + ',' + String(a % 100).padStart(2, '0');
}

/* ============ datas (ISO YYYY-MM-DD, sem fuso) ============ */
var pad2 = function (n) { return String(n).padStart(2, '0'); };
function pd(s) { var a = String(s).split('-'); return { y: +a[0], m: +a[1], d: +a[2] }; }
function mk(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function isoOk(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var o = pd(s); return o.y >= 2000 && o.m >= 1 && o.m <= 12 && o.d >= 1 && o.d <= dim(o.y, o.m);
}
function addDays(s, n) { var o = pd(s), t = new Date(Date.UTC(o.y, o.m - 1, o.d + n)); return mk(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
function diffDays(a, b) { var A = pd(a), B = pd(b); return Math.round((Date.UTC(A.y, A.m - 1, A.d) - Date.UTC(B.y, B.m - 1, B.d)) / 86400000); }
function ymOf(s) { return s.slice(0, 7); }
function addM(k, n) { var a = k.split('-'), t = (+a[0]) * 12 + (+a[1] - 1) + n; return Math.floor(t / 12) + '-' + pad2(t % 12 + 1); }
function dayOf(k, d) { var a = k.split('-'); return mk(+a[0], +a[1], Math.min(d, dim(+a[0], +a[1]))); }
function dow(s) { var o = pd(s); return new Date(Date.UTC(o.y, o.m - 1, o.d)).getUTCDay(); }
function weekRange(s) { var off = (dow(s) + 6) % 7, ini = addDays(s, -off); return { ini: ini, fim: addDays(ini, 6) }; }
var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtD(s) { if (!s) return '—'; var o = pd(s); return pad2(o.d) + '/' + pad2(o.m) + '/' + o.y; }
function fmtDC(s) { if (!s) return '—'; var o = pd(s); return pad2(o.d) + '/' + pad2(o.m); }
function fmtMes(k) { if (!k) return '—'; var a = k.split('-'); return MES[+a[1] - 1] + '/' + a[0]; }
var _hoje = null;
function hoje() {
  if (_hoje) return _hoje;
  var t = new Date(); return mk(t.getFullYear(), t.getMonth() + 1, t.getDate());
}
function setHoje(s) { _hoje = s; }

/* ciclos de orçamento: dia 28 a dia 27 */
function cycleStartDate(s, sd) {
  var k = ymOf(s), t = dayOf(k, sd);
  return s >= t ? t : dayOf(addM(k, -1), sd);
}
function cycleKey(s, sd) { return cycleStartDate(s, sd == null ? 28 : sd).slice(0, 7); }
function cycleRange(key, sd) {
  sd = sd == null ? 28 : sd;
  return { ini: dayOf(key, sd), fim: addDays(dayOf(addM(key, 1), sd), -1) };
}
function cycleLabel(key, sd) { var r = cycleRange(key, sd); return fmtDC(r.ini) + ' a ' + fmtDC(r.fim); }

var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

/* ============ estado inicial ============ */
function defaultSettings() {
  return { teto: 350000, orcAlim: 150000, orcOutras: 200000, inicio: '2026-10-28', cicloDia: 28,
    alertaPct: 80, salario: 1400000, diaPag: 28, caixa28: true, tema: 'auto', ultimoCartao: null, saldoCaixa: 0 };
}
function defaultCards() {
  return [
    { id: 'bb', nome: 'Banco do Brasil', curto: 'BB', fech: 16, fechOk: false, venc: null, pag: 28, ativo: true },
    { id: 'nu', nome: 'Nubank', curto: 'Nubank', fech: 21, fechOk: true, venc: null, pag: 28, ativo: true },
    { id: 'ml', nome: 'Mercado Livre', curto: 'Mercado Livre', fech: 29, fechOk: true, venc: null, pag: 28, ativo: true }
  ];
}
function defaultFormas() { return [{ id: 'pix', nome: 'Pix' }, { id: 'debito', nome: 'Débito' }, { id: 'dinheiro', nome: 'Dinheiro' }]; }
function defaultCategories() {
  var o = function (id, nome, tipo) { return { id: id, nome: nome, tipo: tipo, ativa: true }; };
  return [
    o('alim', 'Alimentação e supermercado', 'alimentacao'), o('saude', 'Saúde e farmácia', 'outras'),
    o('moradia', 'Moradia', 'outras'), o('transp', 'Transporte', 'outras'), o('filho', 'Filho e educação', 'outras'),
    o('vest', 'Vestuário', 'outras'), o('lazer', 'Lazer', 'outras'), o('casa', 'Casa e manutenção', 'outras'),
    o('serv', 'Serviços e assinaturas', 'outras'), o('diver', 'Compras diversas', 'outras'), o('outras', 'Outras', 'outras')
  ];
}
function emptyState() {
  return { v: 1, settings: defaultSettings(), cards: defaultCards(), formas: defaultFormas(), categories: defaultCategories(),
    purchases: [], invoices: [], payments: [], incomes: [], fixed: [], regras: {}, log: [] };
}
function initialState(opts) {
  var S = emptyState();
  if (opts && opts.primeiro) {
    addPurchase(S, { data: '2026-10-28', desc: 'Alimentação', valor: 5787, cartao: null, cat: 'alim', tipo: 'avista' }, { silent: true });
  }
  return S;
}
function normalize(S) {
  var d = emptyState();
  ['purchases', 'invoices', 'payments', 'incomes', 'fixed', 'log', 'cards', 'formas', 'categories'].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = d[k]; });
  S.settings = Object.assign(defaultSettings(), S.settings || {});
  if (!S.regras || typeof S.regras !== 'object') S.regras = {};
  S.v = 1;
  return S;
}

/* ============ cadastros ============ */
function cardById(S, id) { return S.cards.find(function (c) { return c.id === id; }) || null; }
function catById(S, id) { return S.categories.find(function (c) { return c.id === id; }) || null; }
function catTipo(S, id) { if (id == null) return 'nc'; var c = catById(S, id); return c ? c.tipo : 'nc'; }
function catNome(S, id) { if (id == null) return 'Não classificado'; var c = catById(S, id); return c ? c.nome : 'Não classificado'; }
function formaNome(S, id) {
  if (!id) return 'Não informado';
  var c = cardById(S, id); if (c) return c.nome;
  var f = S.formas.find(function (x) { return x.id === id; }); return f ? f.nome : id;
}
function formaCurto(S, id) { var c = cardById(S, id); return c ? c.curto || c.nome : formaNome(S, id); }

/* ============ cartões e faturas ============ */
function closingDate(card, k) { return dayOf(k, card.fech); }
function invoiceMonth(card, d) { var k = ymOf(d); return d < closingDate(card, k) ? k : addM(k, 1); }
function dueDate(card, k) {
  if (!card.venc) return null;
  return dayOf(card.venc > card.fech ? k : addM(k, 1), card.venc);
}
function payDate(card, k) { return card.pag ? dayOf(k, card.pag) : dueDate(card, k); }

function origem(S, p) { return p.data >= S.settings.inicio ? 'nova' : 'anterior'; }
function isAntiga(S, p) { return p.tipo === 'parcelado' && p.data < S.settings.inicio; }
function mesFatura(S, p) {
  if (p.mf) return p.mf;
  var c = cardById(S, p.cartao); if (!c) return null;
  return invoiceMonth(c, p.data);
}
function nearClosing(card, d) {
  var k = ymOf(d);
  return [addM(k, -1), k, addM(k, 1)].some(function (m) { return Math.abs(diffDays(d, closingDate(card, m))) <= 2; });
}
function calcCs(S, p) {
  if (!p.cartao) return 'pendente';
  var c = cardById(S, p.cartao); if (!c) return 'confirmado';
  if (p.mf) return 'confirmado';
  if (!c.fechOk) return 'pendente';
  return nearClosing(c, p.data) ? 'pendente' : 'confirmado';
}

/* parcelas derivadas (nunca guardadas): editar a compra recalcula tudo, excluir cancela tudo */
function parcelasDe(S, p) {
  if (p.st === 'excluida' || p.tipo !== 'parcelado') return [];
  var n = p.n, out = [], j;
  if (isAntiga(S, p)) {
    var k = p.k || 1, mf = mesFatura(S, p);
    var base = p.mes1 || (mf ? addM(mf, k - 1) : null);
    for (j = k; j <= n; j++) out.push({ n: j, N: n, mes: base ? addM(base, j - k) : null, valor: p.vp });
  } else {
    var first = p.mes1 || mesFatura(S, p);
    var b = Math.floor(p.valor / n), r = p.valor - b * n;
    for (j = 1; j <= n; j++) {
      out.push({ n: j, N: n, mes: first ? addM(first, j - 1) : null, valor: p.vf ? p.vp : b + (j <= r ? 1 : 0) });
    }
  }
  return out.map(function (x) { x.pid = p.id; x.cartao = p.cartao; return x; });
}

function getInv(S, cid, k) {
  return S.invoices.find(function (i) { return i.cartao === cid && i.mes === k; }) ||
    { cartao: cid, mes: k, banco: null, conf: false, man: null, obs: '' };
}
function pagosDe(S, cid, k) {
  return S.payments.filter(function (p) { return p.cartao === cid && p.mes === k && p.st !== 'excluida'; })
    .reduce(function (a, p) { return a + p.valor; }, 0);
}
function invItems(S, cid, k) {
  var items = [];
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.cartao !== cid) return;
    if (p.tipo === 'parcelado') {
      parcelasDe(S, p).forEach(function (pc) {
        if (pc.mes === k) items.push({ kind: 'parcela', cls: isAntiga(S, p) ? 'antiga' : 'nova', p: p, pc: pc, valor: pc.valor });
      });
    } else if (mesFatura(S, p) === k) {
      items.push({ kind: 'avista', cls: origem(S, p) === 'nova' ? 'nova' : 'anterior', p: p, valor: p.valor });
    }
  });
  return items;
}
function invResumo(S, cid, k, h) {
  h = h || hoje();
  var card = cardById(S, cid), items = invItems(S, cid, k);
  var sum = function (f) { return items.filter(f).reduce(function (a, i) { return a + i.valor; }, 0); };
  var inv = getInv(S, cid, k), pg = pagosDe(S, cid, k);
  var estimado = items.reduce(function (a, i) { return a + i.valor; }, 0);
  var base = inv.banco != null ? inv.banco : estimado, saldo = base - pg;
  if (inv.man === 'paga') saldo = 0;
  var fech = closingDate(card, k), venc = dueDate(card, k), prevPag = payDate(card, k);
  var status;
  if (inv.man === 'paga' || (pg > 0 && saldo <= 0)) status = 'Paga';
  else if (pg > 0) status = 'Parcialmente paga';
  else if (venc && h > venc) status = 'Vencida';
  else if (h >= fech) status = 'Fechada';
  else status = 'Aberta';
  var dif = inv.banco != null ? inv.banco - estimado : 0;
  var diverg = inv.banco != null && dif !== 0;
  var statusExib = (diverg && (status === 'Aberta' || status === 'Fechada')) ? 'Divergente' : status;
  return {
    cartao: cid, mes: k, fech: fech, venc: venc, prevPag: prevPag, items: items, inv: inv,
    comprasNovas: sum(function (i) { return i.kind === 'avista' && i.cls === 'nova' && !i.p.aj; }),
    anteriores: sum(function (i) { return i.kind === 'avista' && i.cls === 'anterior' && !i.p.aj; }),
    parcAntigas: sum(function (i) { return i.kind === 'parcela' && i.cls === 'antiga'; }),
    parcNovas: sum(function (i) { return i.kind === 'parcela' && i.cls === 'nova'; }),
    ajustes: sum(function (i) { return !!i.p.aj; }),
    estimado: estimado, banco: inv.banco, pagos: pg, saldo: saldo, status: status, statusExib: statusExib,
    diverg: diverg, dif: dif, vazia: items.length === 0 && inv.banco == null && pg === 0 && inv.man == null,
    pendentes: items.filter(function (i) { return i.p.cs === 'pendente' || !i.p.cartao; }).map(function (i) { return i.p; })
  };
}
function currentInv(S, cid, h) {
  h = h || hoje();
  var card = cardById(S, cid), k0 = invoiceMonth(card, h), ks = [addM(k0, -1), k0, addM(k0, 1)];
  for (var i = 0; i < ks.length; i++) {
    var r = invResumo(S, cid, ks[i], h);
    if (r.status !== 'Paga' && !(r.vazia && ks[i] !== k0)) return ks[i];
  }
  return k0;
}

/* ============ orçamento (teto) ============ */
function gastos(S, key, ate) {
  var sd = S.settings.cicloDia, o = { alim: 0, outras: 0, nc: 0, fora: 0, n: 0 };
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.aj || origem(S, p) !== 'nova') return;
    if (cycleKey(p.data, sd) !== key || (ate && p.data > ate)) return;
    var t = catTipo(S, p.cat);
    if (t === 'fora') o.fora += p.valor;
    else { o[t === 'alimentacao' ? 'alim' : t === 'outras' ? 'outras' : 'nc'] += p.valor; o.n++; }
  });
  return o;
}
function sit(gasto, limite, alerta) {
  if (limite <= 0) return gasto > 0 ? 'ultrapassado' : 'dentro';
  if (gasto > limite) return 'ultrapassado';
  if (gasto === limite) return 'limite';
  return gasto * 100 >= limite * alerta ? 'atencao' : 'dentro';
}
var SIT_TXT = { dentro: 'Dentro do orçamento', atencao: 'Atenção: próximo do limite', limite: 'Limite atingido', ultrapassado: 'Orçamento ultrapassado' };

function budget(S, key, ate) {
  var st = S.settings, sd = st.cicloDia, k0 = cycleKey(st.inicio, sd);
  var r = cycleRange(key, sd);
  if (key < k0) return { antes: true, key: key, ini: r.ini, fim: r.fim };
  var carry = { a: 0, o: 0, x: 0 }, k = k0, guard = 0;
  while (k < key && guard++ < 240) {
    var g0 = gastos(S, k), efA0 = st.orcAlim - carry.a, efO0 = st.orcOutras - carry.o, efT0 = st.teto - carry.a - carry.o - carry.x;
    var oa = Math.max(0, g0.alim - efA0), oo = Math.max(0, g0.outras - efO0);
    var ot = Math.max(0, g0.alim + g0.outras + g0.nc - efT0);
    carry = { a: oa, o: oo, x: Math.max(0, ot - oa - oo) };
    k = addM(k, 1);
  }
  var g = gastos(S, key, ate);
  var efA = st.orcAlim - carry.a, efO = st.orcOutras - carry.o, efT = st.teto - carry.a - carry.o - carry.x;
  var total = g.alim + g.outras + g.nc;
  return {
    key: key, ini: r.ini, fim: r.fim, carry: carry, efT: efT, efA: efA, efO: efO,
    gastoAlim: g.alim, gastoOutras: g.outras, gastoNC: g.nc, gastoTotal: total, fora: g.fora, n: g.n,
    saldoTotal: efT - total, saldoAlim: efA - g.alim, saldoOutras: efO - g.outras,
    pct: efT > 0 ? Math.round(total * 1000 / efT) / 10 : 0,
    pctAlim: efA > 0 ? Math.round(g.alim * 1000 / efA) / 10 : 0,
    pctOutras: efO > 0 ? Math.round(g.outras * 1000 / efO) / 10 : 0,
    sit: sit(total, efT, st.alertaPct), sitAlim: sit(g.alim, efA, st.alertaPct), sitOutras: sit(g.outras, efO, st.alertaPct)
  };
}

/* ============ lançamentos ============ */
function normKey(desc) {
  var t = String(desc || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/-?\s*parcela\s*\d+\/\d+/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.split(' ').slice(0, 2).join(' ');
}
function suggestCat(S, desc) {
  var k = normKey(desc); if (!k) return null;
  if (S.regras[k]) return S.regras[k];
  var first = k.split(' ')[0], hit = null, n = 0;
  Object.keys(S.regras).forEach(function (r) { if (r.split(' ')[0] === first && first.length >= 4) { if (S.regras[r] !== hit) n++; hit = S.regras[r]; } });
  return n === 1 ? hit : null;
}
function addLog(S, op, p, txt) {
  S.log.push({ t: Date.now(), op: op, id: p ? p.id : null, d: txt });
  if (S.log.length > 400) S.log.splice(0, S.log.length - 400);
}
function resumoP(S, p) {
  return p.desc + ' · ' + fmt(p.valor) + (p.tipo === 'parcelado' ? ' · ' + p.n + 'x' : '') + ' · ' + formaCurto(S, p.cartao) + ' · ' + catNome(S, p.cat);
}
function validate(S, i) {
  var e = [], push = function (campo, msg) { e.push({ campo: campo, msg: msg }); };
  var okD = isoOk(i.data);
  if (!okD) push('data', 'Informe uma data válida.');
  if (!i.desc || !String(i.desc).trim()) push('desc', 'Informe a descrição.');
  if (i.cartao && !cardById(S, i.cartao) && !S.formas.some(function (f) { return f.id === i.cartao; })) push('cartao', 'Cartão ou forma de pagamento desconhecida.');
  if (i.cat && !catById(S, i.cat)) push('cat', 'Categoria desconhecida.');
  if (i.tipo !== 'parcelado') {
    if (i.aj) { if (!Number.isInteger(i.valor) || i.valor === 0) push('valor', 'Valor inválido.'); }
    else if (!Number.isInteger(i.valor) || !(i.valor > 0)) push('valor', 'O valor deve ser maior que zero.');
  } else {
    if (!Number.isInteger(i.n) || i.n < 2 || i.n > 72) push('n', 'Informe de 2 a 72 parcelas.');
    var antiga = okD && i.data < S.settings.inicio;
    if (antiga) {
      if (!Number.isInteger(i.vp) || !(i.vp > 0)) push('vp', 'Informe o valor da parcela.');
      var k = i.k || 1;
      if (!Number.isInteger(k) || k < 1 || (Number.isInteger(i.n) && k > i.n)) push('k', 'A parcela atual deve ficar entre 1 e o total de parcelas.');
    } else if (!(i.valor > 0) && !(i.vp > 0)) push('valor', 'Informe o valor total ou o valor da parcela.');
  }
  if (i.mes1 && !/^\d{4}-(0[1-9]|1[0-2])$/.test(i.mes1)) push('mes1', 'Mês da fatura inválido.');
  return e;
}
function build(S, i, old) {
  var p = Object.assign({}, old || {});
  p.id = p.id || uid('p');
  p.data = i.data; p.desc = String(i.desc).trim(); p.cartao = i.cartao || null; p.cat = i.cat || null;
  p.tipo = i.tipo === 'parcelado' ? 'parcelado' : 'avista';
  p.obs = i.obs || ''; p.aj = !!i.aj; p.mf = i.mf || null;
  delete p.n; delete p.vp; delete p.vf; delete p.k; delete p.mes1;
  if (p.tipo === 'parcelado') {
    p.n = i.n; p.k = i.k || 1; p.mes1 = i.mes1 || null;
    if (p.data < S.settings.inicio || i.vf || !(i.valor > 0)) { p.vp = i.vp; p.vf = true; p.valor = i.vp * i.n; }
    else { p.valor = i.valor; p.vf = false; var b = Math.floor(i.valor / i.n); p.vp = b + (i.valor % i.n > 0 ? 1 : 0); }
  } else p.valor = i.valor;
  p.cs = i.cs || calcCs(S, p);
  p.st = 'ativa'; p.c = p.c || Date.now(); p.u = Date.now();
  return p;
}
function learnRule(S, p) {
  if (p.cat && !p.aj) { var k = normKey(p.desc); if (k) S.regras[k] = p.cat; }
}
function findDup(S, i, exceptId) {
  var k = normKey(i.desc);
  return S.purchases.find(function (p) {
    return p.st !== 'excluida' && p.id !== exceptId && p.data === i.data && normKey(p.desc) === k && p.cartao === (i.cartao || null) &&
      (i.tipo === 'parcelado' ? (p.tipo === 'parcelado' && (p.valor === i.valor || p.vp === i.vp)) : p.valor === i.valor);
  }) || null;
}
function addPurchase(S, input, opt) {
  var e = validate(S, input);
  if (e.length) return { ok: false, errors: e };
  var p = build(S, input);
  S.purchases.push(p); learnRule(S, p);
  if (!(opt && opt.silent)) addLog(S, 'criar', p, resumoP(S, p));
  return { ok: true, purchase: p };
}
function editPurchase(S, id, input) {
  var old = S.purchases.find(function (p) { return p.id === id && p.st !== 'excluida'; });
  if (!old) return { ok: false, errors: [{ campo: '', msg: 'Lançamento não encontrado.' }] };
  var e = validate(S, input);
  if (e.length) return { ok: false, errors: e };
  var antes = resumoP(S, old), np = build(S, input, old);
  Object.keys(old).forEach(function (k) { delete old[k]; });
  Object.assign(old, np); // mesmo registro, mesmo id: nunca duplica
  learnRule(S, old);
  addLog(S, 'editar', old, 'de [' + antes + '] para [' + resumoP(S, old) + ']');
  return { ok: true, purchase: old };
}
function deletePurchase(S, id) {
  var p = S.purchases.find(function (x) { return x.id === id && x.st !== 'excluida'; });
  if (!p) return { ok: false };
  var np = parcelasDe(S, p).length;
  p.st = 'excluida'; p.u = Date.now();
  addLog(S, 'excluir', p, resumoP(S, p) + (np ? ' · ' + np + ' parcelas canceladas' : ''));
  return { ok: true, purchase: p, parcelasCanceladas: np };
}
function restorePurchase(S, id) {
  var p = S.purchases.find(function (x) { return x.id === id && x.st === 'excluida'; });
  if (!p) return { ok: false };
  p.st = 'ativa'; p.u = Date.now(); addLog(S, 'restaurar', p, resumoP(S, p));
  return { ok: true, purchase: p };
}
function addPayment(S, i) {
  var e = [];
  if (!cardById(S, i.cartao)) e.push({ campo: 'cartao', msg: 'Cartão inválido.' });
  if (!/^\d{4}-\d{2}$/.test(i.mes || '')) e.push({ campo: 'mes', msg: 'Fatura inválida.' });
  if (!isoOk(i.data)) e.push({ campo: 'data', msg: 'Informe a data do pagamento.' });
  if (!Number.isInteger(i.valor) || !(i.valor > 0)) e.push({ campo: 'valor', msg: 'O valor deve ser maior que zero.' });
  if (e.length) return { ok: false, errors: e };
  var pg = { id: uid('g'), cartao: i.cartao, mes: i.mes, data: i.data, valor: i.valor, obs: i.obs || '', st: 'ativa' };
  S.payments.push(pg);
  addLog(S, 'pagamento', null, formaNome(S, i.cartao) + ' ' + fmtMes(i.mes) + ': ' + fmt(i.valor) + ' em ' + fmtD(i.data));
  return { ok: true, payment: pg };
}
function removePayment(S, id) {
  var p = S.payments.find(function (x) { return x.id === id; });
  if (!p) return { ok: false };
  p.st = 'excluida'; addLog(S, 'pagamento', null, 'Pagamento removido: ' + fmt(p.valor));
  return { ok: true };
}
function setInvoice(S, cid, k, patch) {
  var inv = S.invoices.find(function (i) { return i.cartao === cid && i.mes === k; });
  if (!inv) { inv = { cartao: cid, mes: k, banco: null, conf: false, man: null, obs: '' }; S.invoices.push(inv); }
  Object.assign(inv, patch);
  addLog(S, 'fatura', null, formaNome(S, cid) + ' ' + fmtMes(k) + ' atualizada');
  return inv;
}

/* ============ conferências (Regra F) ============ */
function reconcile(S, key) {
  var sd = S.settings.cicloDia, porCartao = {}, porCat = {}, tc = 0, tk = 0, problemas = [], fora = 0;
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.aj || origem(S, p) !== 'nova' || cycleKey(p.data, sd) !== key) return;
    if (catTipo(S, p.cat) === 'fora') { fora += p.valor; return; }
    var ck = p.cartao || '_nenhum', kk = (p.cat && catById(S, p.cat)) ? p.cat : '_nc';
    porCartao[ck] = (porCartao[ck] || 0) + p.valor; porCat[kk] = (porCat[kk] || 0) + p.valor;
    tc += p.valor; tk += p.valor;
    if (!p.cartao) problemas.push({ p: p, motivo: 'Cartão não informado' });
    if (kk === '_nc') problemas.push({ p: p, motivo: 'Sem categoria' });
  });
  return { porCartao: porCartao, porCat: porCat, totalCartao: tc, totalCat: tk, fora: fora, ok: tc === tk, problemas: problemas };
}


/* ============ controle: compras à vista anteriores ao marco zero (só fatura, fora do teto) ============ */
function anteriores(S) {
  var o = { total: 0, n: 0, porCat: {}, porCartao: {}, lista: [], limite: S.settings.limiteAnt || null };
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.tipo === 'parcelado' || origem(S, p) !== 'anterior') return;
    var cat = (p.cat && catById(S, p.cat)) ? p.cat : '_nc', cd = p.cartao || '_nenhum';
    o.total += p.valor; o.n++;
    o.porCat[cat] = (o.porCat[cat] || 0) + p.valor; o.porCartao[cd] = (o.porCartao[cd] || 0) + p.valor; o.lista.push(p);
  });
  o.lista.sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  o.sit = o.limite ? sit(o.total, o.limite, S.settings.alertaPct) : null;
  return o;
}

/* ============ simulador ============ */
function calendarioParcelas(S, fromMes, n) {
  var meses = {}, i, semFatura = [];
  for (i = 0; i < n; i++) { var k = addM(fromMes, i); meses[k] = { mes: k, antigas: 0, novas: 0, total: 0, porCartao: {}, itens: [] }; }
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.tipo !== 'parcelado') return;
    parcelasDe(S, p).forEach(function (pc) {
      if (!pc.mes) { semFatura.push({ p: p, pc: pc }); return; }
      var m = meses[pc.mes]; if (!m) return;
      var antiga = isAntiga(S, p);
      m[antiga ? 'antigas' : 'novas'] += pc.valor; m.total += pc.valor;
      m.porCartao[p.cartao] = (m.porCartao[p.cartao] || 0) + pc.valor;
      m.itens.push({ p: p, pc: pc, antiga: antiga });
    });
  });
  return { meses: Object.keys(meses).sort().map(function (k) { return meses[k]; }), semFatura: semFatura };
}
function statusParcela(S, p, pc) {
  if (p.st === 'excluida') return 'cancelada';
  if (!pc.mes || !p.cartao) return 'prevista';
  var r = invResumo(S, p.cartao, pc.mes);
  if (r.status === 'Paga') return 'paga';
  if (r.inv.conf || r.inv.banco != null) return 'confirmada';
  return 'prevista';
}
function parcelaAtual(S, p) { // primeira parcela cuja fatura ainda não foi paga
  var ps = parcelasDe(S, p), i;
  for (i = 0; i < ps.length; i++) if (statusParcela(S, p, ps[i]) !== 'paga') return { atual: ps[i], restantes: ps.length - i - 1, idx: i, todas: ps };
  return { atual: null, restantes: 0, idx: ps.length, todas: ps };
}
function simular(S, i, h) {
  h = h || hoje();
  var data = i.data || h, key = cycleKey(data, S.settings.cicloDia);
  var before = budget(S, key);
  var tmp = build(S, Object.assign({ desc: i.desc || 'Simulação' }, i, { data: data }));
  tmp.id = '_sim';
  var tipo = catTipo(S, tmp.cat), fora = tipo === 'fora', antes = data < S.settings.inicio;
  S.purchases.push(tmp);
  var after, parcelas;
  try { after = budget(S, key); parcelas = parcelasDe(S, tmp); } finally { S.purchases.pop(); }
  var res = { key: key, antes: before, depois: after, total: tmp.valor, fora: fora, anterior: antes, parcelas: parcelas,
    tipoCat: tipo, estouraTeto: false, estouraCat: false };
  if (!before.antes && !fora && !antes) {
    res.estouraTeto = after.saldoTotal < 0;
    res.estouraCat = (tipo === 'alimentacao' && after.saldoAlim < 0) || (tipo === 'outras' && after.saldoOutras < 0);
  }
  var reco;
  if (fora) reco = 'fora';
  else if (before.antes || antes) reco = 'anterior';
  else if (res.estouraTeto) reco = 'estoura_teto';
  else if (res.estouraCat) reco = 'estoura_cat';
  else if (after.sit === 'atencao' || after.sit === 'limite' || (tipo === 'alimentacao' && after.sitAlim !== 'dentro') || (tipo === 'outras' && after.sitOutras !== 'dentro')) reco = 'atencao';
  else reco = 'compat';
  res.reco = reco;
  return res;
}

/* ============ painel ============ */
function painel(S, key, h) {
  h = h || hoje();
  var b = budget(S, key), cur = {}, parcAntCiclo = 0, parcFut = 0, fatTot = 0, venc = [];
  S.cards.forEach(function (c) {
    if (c.ativo === false) return;
    var k = currentInv(S, c.id, h), r = invResumo(S, c.id, k, h);
    cur[c.id] = r; fatTot += r.banco != null ? r.banco : r.estimado;
    parcAntCiclo += r.parcAntigas;
    S.purchases.forEach(function (p) {
      if (p.st === 'excluida' || p.cartao !== c.id || p.tipo !== 'parcelado') return;
      parcelasDe(S, p).forEach(function (pc) { if (pc.mes && pc.mes > k) parcFut += pc.valor; });
    });
    venc.push({ cartao: c.id, mes: k, venc: r.venc, pag: r.prevPag, fech: r.fech, saldo: r.saldo, status: r.statusExib });
  });
  var ult = null;
  S.purchases.forEach(function (p) {
    if (p.st === 'excluida' || p.aj || origem(S, p) !== 'nova') return;
    if (!ult || p.data > ult.data || (p.data === ult.data && (p.c || 0) > (ult.c || 0))) ult = p;
  });
  var alertas = [], semCartao = S.purchases.filter(function (p) { return p.st !== 'excluida' && !p.aj && origem(S, p) === 'nova' && !p.cartao; });
  var pend = S.purchases.filter(function (p) { return p.st !== 'excluida' && !p.aj && p.cartao && p.cs === 'pendente' && origem(S, p) === 'nova'; });
  if (!b.antes) {
    if (b.sit === 'ultrapassado') alertas.push({ n: 'alto', t: 'O teto do ciclo foi ultrapassado em ' + fmt(-b.saldoTotal) + '. O orçamento não é aumentado automaticamente.' });
    else if (b.sit === 'limite') alertas.push({ n: 'alto', t: 'Limite do teto atingido. Não há saldo para novas compras neste ciclo.' });
    else if (b.sit === 'atencao') alertas.push({ n: 'medio', t: 'Você usou ' + String(b.pct).replace('.', ',') + '% do teto. Restam ' + fmt(b.saldoTotal) + '.' });
    if (b.saldoAlim < 0) alertas.push({ n: 'alto', t: 'Alimentação passou do orçamento em ' + fmt(-b.saldoAlim) + '. O impacto já está no saldo total.' });
    if (b.saldoOutras < 0) alertas.push({ n: 'alto', t: 'Outras compras passaram do orçamento em ' + fmt(-b.saldoOutras) + '. O saldo de Alimentação não cobre esse excesso.' });
    if (b.carry.a + b.carry.o + b.carry.x > 0) alertas.push({ n: 'medio', t: 'Excesso do ciclo anterior descontado do teto: ' + fmt(b.carry.a + b.carry.o + b.carry.x) + '.' });
    if (b.gastoNC > 0) alertas.push({ n: 'info', t: fmt(b.gastoNC) + ' em compras sem categoria. Elas contam no teto total, mas não em Alimentação nem em Outras compras.' });
  }
  if (semCartao.length) alertas.push({ n: 'medio', t: semCartao.length + ' compra(s) sem cartão informado. Informe o cartão para o app localizar a fatura.', ir: 'historico:semcartao' });
  if (pend.length) alertas.push({ n: 'info', t: pend.length + ' compra(s) com ciclo da fatura pendente de confirmação.', ir: 'historico:pendente' });
  S.cards.forEach(function (c) {
    var r = cur[c.id]; if (!r) return;
    if (r.diverg) alertas.push({ n: 'medio', t: c.nome + ': a fatura do banco (' + fmt(r.banco) + ') difere da estimativa do app (' + fmt(r.estimado) + ') em ' + fmt(Math.abs(r.dif)) + '.', ir: 'faturas:' + c.id + ':' + r.mes });
    if (!c.fechOk) alertas.push({ n: 'info', t: c.nome + ': confirme o dia de fechamento (hoje: dia ' + c.fech + ').', ir: 'config' });
    var pagD = r.prevPag || r.venc;
    if (r.status !== 'Paga' && pagD && diffDays(pagD, h) >= 0 && diffDays(pagD, h) <= 5) alertas.push({ n: 'medio', t: c.nome + ' (' + fmtMes(r.mes) + '): pagamento previsto em ' + fmtD(pagD) + '.' });
  });
  return { b: b, cur: cur, parcAntCiclo: parcAntCiclo, parcFut: parcFut, fatTot: fatTot, venc: venc, ult: ult, alertas: alertas, semCartao: semCartao, pend: pend };
}

/* ============ caixa (entradas, fixas e faturas por ciclo) ============ */
function recDates(item, fromK, toK) {
  var out = [], k = fromK;
  while (k <= toK) {
    var d = dayOf(k, item.dia);
    if ((!item.desde || d >= item.desde) && (!item.ate || d <= item.ate)) out.push(d);
    k = addM(k, 1);
  }
  return out;
}
function caixa(S, startKey, n, h) {
  h = h || hoje();
  var sd = S.settings.cicloDia, flag = S.settings.caixa28;
  var ck = function (d) { return cycleKey(flag ? addDays(d, -1) : d, sd); };
  var cycles = [], by = {}, i;
  for (i = 0; i < n; i++) {
    var key = addM(startKey, i), r = cycleRange(key, sd);
    var c = { key: key, ini: r.ini, fim: r.fim, entradas: [], fixas: [], faturas: [], tEnt: 0, tFix: 0, tFat: 0 };
    cycles.push(c); by[key] = c;
  }
  var fromK = addM(ymOf(cycles[0].ini), -1), toK = addM(ymOf(cycles[n - 1].fim), 1);
  S.incomes.forEach(function (inc) {
    var ds = inc.tipo === 'uni' ? [inc.data] : recDates(inc, fromK, toK);
    ds.forEach(function (d) { var c = by[ck(d)]; if (c) { c.entradas.push({ nome: inc.nome, data: d, valor: inc.valor }); c.tEnt += inc.valor; } });
  });
  S.fixed.forEach(function (f) {
    if (f.ativo === false) return;
    recDates(f, fromK, toK).forEach(function (d) { var c = by[ck(d)]; if (c) { c.fixas.push({ nome: f.nome, grupo: f.grupo, data: d, valor: f.valor, conf: f.diaOk }); c.tFix += f.valor; } });
  });
  S.cards.forEach(function (card) {
    if (card.ativo === false) return;
    var k = addM(fromK, -1);
    while (k <= toK) {
      var r = invResumo(S, card.id, k, h);
      if (!r.vazia && r.status !== 'Paga' && r.saldo > 0) {
        var d = r.prevPag || r.venc || dayOf(k, 28), atras = d < h;
        if (atras) d = h;
        var c = by[ck(d)];
        if (c) { c.faturas.push({ nome: card.nome, mes: k, data: d, valor: r.saldo, atrasada: atras, banco: r.banco != null }); c.tFat += r.saldo; }
      }
      k = addM(k, 1);
    }
  });
  var acum = S.settings.saldoCaixa || 0, hk = cycleKey(h, sd);
  cycles.forEach(function (c) {
    c.sobra = c.tEnt - c.tFix - c.tFat;
    var b = budget(S, c.key);
    c.reserva = b.antes ? 0 : (c.key === hk ? Math.max(0, b.saldoTotal) : (c.key > hk ? Math.max(0, b.efT) : 0));
    c.sobraTeto = c.sobra - c.reserva;
    acum += c.sobraTeto; c.acum = acum;
  });
  return cycles;
}

/* ============ relatórios ============ */
function relatorio(S, ini, fim, h) {
  h = h || hoje();
  var sd = S.settings.cicloDia, key = cycleKey(fim, sd);
  var list = S.purchases.filter(function (p) { return p.st !== 'excluida' && !p.aj && origem(S, p) === 'nova' && p.data >= ini && p.data <= fim; });
  var teto = list.filter(function (p) { return catTipo(S, p.cat) !== 'fora'; });
  var sum = function (a) { return a.reduce(function (x, p) { return x + p.valor; }, 0); };
  var porCartao = {}, porCat = {};
  list.forEach(function (p) {
    var a = p.cartao || '_nenhum', b = (p.cat && catById(S, p.cat)) ? p.cat : '_nc';
    porCartao[a] = (porCartao[a] || 0) + p.valor; porCat[b] = (porCat[b] || 0) + p.valor;
  });
  var ate = fim < h ? fim : h, b = budget(S, key, ate);
  var diasTot = diffDays(fim, ini) + 1, diasPass = Math.max(1, Math.min(diasTot, diffDays(ate, ini) + 1));
  var tt = sum(teto), media = Math.round(tt / diasPass);
  var evol = [], d = ini;
  while (d <= ate) { var bb = budget(S, key, d); evol.push({ d: d, saldo: bb.antes ? null : bb.saldoTotal }); d = addDays(d, 1); }
  var aA = list.filter(function (p) { return catTipo(S, p.cat) === 'alimentacao'; }), aO = list.filter(function (p) { return catTipo(S, p.cat) === 'outras'; });
  var proj = fim > h ? media * diasTot : tt;
  var fut = 0;
  S.purchases.forEach(function (p) { if (p.st === 'excluida' || p.tipo !== 'parcelado') return; parcelasDe(S, p).forEach(function (pc) { if (pc.mes && pc.mes > ymOf(ate)) fut += pc.valor; }); });
  var alertas = [];
  if (!b.antes) {
    if (b.saldoAlim < 0) alertas.push('Alimentação acima do orçamento em ' + fmt(-b.saldoAlim) + '.');
    if (b.saldoOutras < 0) alertas.push('Outras compras acima do orçamento em ' + fmt(-b.saldoOutras) + '.');
    if (b.saldoTotal < 0) alertas.push('Teto do ciclo ultrapassado em ' + fmt(-b.saldoTotal) + '.');
    else if (b.sit === 'atencao') alertas.push('Teto do ciclo em ' + String(b.pct).replace('.', ',') + '%.');
    if (proj > b.efT && fim > h) alertas.push('No ritmo atual, o ciclo fecharia em ' + fmt(proj) + ', acima do teto de ' + fmt(b.efT) + '.');
  }
  var semCartao = list.filter(function (p) { return !p.cartao; }).length;
  if (semCartao) alertas.push(semCartao + ' compra(s) sem cartão informado.');
  return {
    ini: ini, fim: fim, key: key, n: list.length, total: tt, alim: sum(aA), outras: sum(aO), fora: sum(list) - tt, bruto: sum(list),
    porCartao: porCartao, porCat: porCat, maiores: list.slice().sort(function (a, b) { return b.valor - a.valor; }).slice(0, 5),
    parceladas: list.filter(function (p) { return p.tipo === 'parcelado'; }), b: b, media: media, proj: proj, evol: evol,
    parcelasFuturas: fut, alertas: alertas, diasTot: diasTot, diasPass: diasPass, lista: list
  };
}

/* ============ CSV ============ */
function csvCell(v) { var s = String(v == null ? '' : v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCSV(head, rows) {
  return '﻿' + [head].concat(rows).map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
}
function csvLancamentos(S) {
  var rows = S.purchases.filter(function (p) { return p.st !== 'excluida'; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (p) {
    var mf = mesFatura(S, p);
    return [p.id, p.data, p.desc, catNome(S, p.cat), formaNome(S, p.cartao), (p.valor / 100).toFixed(2).replace('.', ','),
      p.tipo === 'parcelado' ? 'parcelado' : 'à vista', p.n || '', p.vp ? (p.vp / 100).toFixed(2).replace('.', ',') : '',
      isAntiga(S, p) ? 'parcela antiga' : origem(S, p) === 'nova' ? 'compra nova' : 'anterior ao marco zero', mf || '', p.cs || '', p.obs || ''];
  });
  return toCSV(['id', 'data', 'descricao', 'categoria', 'cartao', 'valor', 'modalidade', 'parcelas', 'valor_parcela', 'origem', 'fatura', 'ciclo_situacao', 'obs'], rows);
}

/* ============ persistência (documentos) e backup ============ */
function toDocs(S) {
  var docs = {}, lanc = {};
  S.purchases.slice().sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : (a.c || 0) - (b.c || 0); })
    .forEach(function (p) { var k = ymOf(p.data); (lanc[k] = lanc[k] || []).push(p); });
  Object.keys(lanc).forEach(function (k) { docs['lanc-' + k] = { items: lanc[k] }; });
  docs.core = { v: 1, settings: S.settings, cards: S.cards, formas: S.formas, categories: S.categories, invoices: S.invoices,
    payments: S.payments, incomes: S.incomes, fixed: S.fixed, regras: S.regras };
  docs.log = { items: S.log.slice(-300) };
  return docs;
}
function fromDocs(docs) {
  if (!docs || !docs.core) return null;
  var S = Object.assign({}, JSON.parse(JSON.stringify(docs.core)), { purchases: [], log: [] });
  Object.keys(docs).forEach(function (k) {
    if (k.indexOf('lanc-') === 0 && docs[k] && Array.isArray(docs[k].items)) S.purchases = S.purchases.concat(JSON.parse(JSON.stringify(docs[k].items)));
  });
  S.log = docs.log && Array.isArray(docs.log.items) ? JSON.parse(JSON.stringify(docs.log.items)) : [];
  return normalize(S);
}
function serialize(S) { return JSON.stringify({ app: 'meu-controle-financeiro', v: 1, exportado: new Date().toISOString(), estado: S }); }
function deserialize(text) {
  var o = JSON.parse(text), S = o && o.estado ? o.estado : o;
  if (!S || !Array.isArray(S.purchases) || !S.settings || !Array.isArray(S.cards)) throw new Error('Arquivo de backup inválido.');
  return normalize(S);
}

return {
  parseMoney: parseMoney, fmt: fmt, fmtIn: fmtIn, pd: pd, mk: mk, dim: dim, isoOk: isoOk, addDays: addDays, diffDays: diffDays,
  ymOf: ymOf, addM: addM, dayOf: dayOf, dow: dow, weekRange: weekRange, fmtD: fmtD, fmtDC: fmtDC, fmtMes: fmtMes, MES: MES,
  hoje: hoje, setHoje: setHoje, cycleKey: cycleKey, cycleRange: cycleRange, cycleLabel: cycleLabel, uid: uid,
  defaultSettings: defaultSettings, defaultCards: defaultCards, defaultFormas: defaultFormas, defaultCategories: defaultCategories,
  emptyState: emptyState, initialState: initialState, normalize: normalize,
  cardById: cardById, catById: catById, catTipo: catTipo, catNome: catNome, formaNome: formaNome, formaCurto: formaCurto,
  closingDate: closingDate, invoiceMonth: invoiceMonth, dueDate: dueDate, payDate: payDate, origem: origem, isAntiga: isAntiga,
  mesFatura: mesFatura, calcCs: calcCs, parcelasDe: parcelasDe, getInv: getInv, pagosDe: pagosDe, invItems: invItems,
  invResumo: invResumo, currentInv: currentInv, gastos: gastos, sit: sit, SIT_TXT: SIT_TXT, budget: budget,
  normKey: normKey, suggestCat: suggestCat, validate: validate, findDup: findDup, addPurchase: addPurchase, editPurchase: editPurchase,
  deletePurchase: deletePurchase, restorePurchase: restorePurchase, addPayment: addPayment, removePayment: removePayment,
  setInvoice: setInvoice, addLog: addLog, resumoP: resumoP, reconcile: reconcile, anteriores: anteriores, calendarioParcelas: calendarioParcelas,
  statusParcela: statusParcela, parcelaAtual: parcelaAtual, simular: simular, painel: painel, caixa: caixa, relatorio: relatorio,
  toCSV: toCSV, csvLancamentos: csvLancamentos, toDocs: toDocs, fromDocs: fromDocs, serialize: serialize, deserialize: deserialize
};
}));
