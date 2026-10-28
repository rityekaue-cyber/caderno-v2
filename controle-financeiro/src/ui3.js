/* UI — Cartões, Faturas, Parcelas */
(function () {
'use strict';
var A = window.APP, F = A.F, esc = A.esc, R = A.R, ic = A.ic, $ = A.$, ui = A.ui, kv = A.kv;
var pm = F.parseMoney;
var money = function (c) { return '<span class="money">' + R(c) + '</span>'; };

function subnav(active) {
  var t = [['cartoes', 'Cartões'], ['faturas', 'Faturas'], ['parcelas', 'Parcelas']];
  return '<div class="seg" role="tablist">' + t.map(function (x) { return '<button role="tab" aria-selected="' + (active === x[0]) + '" data-act="go" data-to="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
}
function cardTerms(c) {
  return 'Fecha dia ' + c.fech + (c.fechOk ? '' : ' <span class="tag warn">a confirmar</span>') + ' · ' + (c.venc ? 'vence dia ' + c.venc : 'vencimento <span class="tag warn">a confirmar</span>') + (c.pag && c.pag !== c.venc ? ' · pago dia ' + c.pag : '');
}
function futuro(cid, depoisDe) {
  var S = A.S, s = 0;
  S.purchases.forEach(function (p) { if (p.st === 'excluida' || p.cartao !== cid || p.tipo !== 'parcelado') return; F.parcelasDe(S, p).forEach(function (x) { if (x.mes && x.mes > depoisDe) s += x.valor; }); });
  return s;
}

/* ================= CARTÕES ================= */
A.screens.cartoes = {
  sub: function () { return 'Ciclo ' + F.cycleLabel(A.curKey(), A.S.settings.cicloDia); },
  html: function () {
    var S = A.S, key = A.curKey(), h = F.hoje(), rc = F.reconcile(S, key), out = subnav('cartoes');
    S.cards.filter(function (c) { return c.ativo !== false; }).forEach(function (c) {
      var k = F.currentInv(S, c.id, h), r = F.invResumo(S, c.id, k, h), novoCiclo = rc.porCartao[c.id] || 0;
      out += '<section class="card stack" aria-label="' + esc(c.nome) + '"><div class="row sb"><div class="grow"><h2 style="margin:0">' + esc(c.nome) + '</h2><div class="small muted">' + cardTerms(c) + '</div></div>' + A.stBadge(r.statusExib) + '</div>' +
        '<div class="row sb"><div><div class="small muted">Fatura de ' + F.fmtMes(k) + ' (fecha ' + F.fmtDC(r.fech) + ')</div><div style="font-size:26px;font-weight:800" class="money">' + R(r.banco != null ? r.banco : r.estimado) + '</div></div><div class="right"><div class="small muted">Saldo a pagar</div><div class="bold money">' + R(r.saldo) + '</div></div></div>' +
        '<div>' + kv('Compras novas na fatura', money(r.comprasNovas)) + kv('Anteriores ao marco zero', money(r.anteriores)) + kv('Parcelas antigas', money(r.parcAntigas)) + (r.parcNovas ? kv('Parcelas de compras novas', money(r.parcNovas)) : '') + (r.ajustes ? kv('Ajustes e estornos', money(r.ajustes)) : '') + kv('Comprado neste ciclo (teto)', money(novoCiclo)) + kv('Comprometido nas próximas faturas', money(futuro(c.id, k))) + '</div>' +
        (r.diverg ? '<div class="alert medio">' + ic('warn') + '<span>O banco informa ' + R(r.banco) + ' e o app soma ' + R(r.estimado) + ': diferença de ' + R(Math.abs(r.dif)) + '.</span></div>' : '') +
        '<div class="row wrapr"><button class="btn sm grow" data-act="openinv" data-c="' + c.id + '" data-m="' + k + '">Ver fatura</button><button class="btn sm primary grow" data-act="payopen" data-c="' + c.id + '" data-m="' + k + '">Registrar pagamento</button></div></section>';
    });
    // regra F
    var nm = function (k) { return k === '_nc' ? 'Não classificado' : F.catNome(S, k); }, nc = function (k) { return k === '_nenhum' ? 'Sem cartão (pendente)' : F.formaNome(S, k); };
    var line = function (o, name) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return kv(esc(name(k)), money(o[k])); }).join('') || '<p class="small muted">Nada neste ciclo.</p>'; };
    out += '<section class="card stack"><div class="row sb"><h2 style="margin:0">Conferência do ciclo</h2>' + (rc.ok ? '<span class="badge b-ok">' + ic('check') + 'Fecha</span>' : '<span class="badge b-bad">' + ic('x') + 'Não fecha</span>') + '</div><p class="small muted">O total por cartão deve ser igual ao total por categoria. O que está sem cartão ou sem categoria aparece como pendente / não classificado.</p>' +
      '<div class="grid2 stackm"><div><h3>Por cartão</h3>' + line(rc.porCartao, nc) + '<div class="kv"><b>Total</b><b class="money">' + R(rc.totalCartao) + '</b></div></div><div><h3>Por categoria</h3>' + line(rc.porCat, nm) + '<div class="kv"><b>Total</b><b class="money">' + R(rc.totalCat) + '</b></div></div></div>' +
      (rc.fora ? '<p class="small muted">Fora do teto, não incluído acima: ' + R(rc.fora) + '.</p>' : '') +
      (rc.problemas.length ? '<button class="btn sm" data-act="alertgo" data-ir="historico:semcartao">Resolver ' + rc.problemas.length + ' pendência' + (rc.problemas.length > 1 ? 's' : '') + '</button>' : '') + '</section>';
    return '<div class="stack">' + out + '</div>';
  }
};

/* ================= FATURAS ================= */
function invSel() {
  var S = A.S;
  if (!ui.inv.cartao || !F.cardById(S, ui.inv.cartao)) ui.inv.cartao = S.cards[0].id;
  if (!ui.inv.mes) ui.inv.mes = F.currentInv(S, ui.inv.cartao);
  return ui.inv;
}
A.screens.faturas = {
  sub: function () { return ''; },
  html: function () {
    var S = A.S, sel = invSel(), c = F.cardById(S, sel.cartao), r = F.invResumo(S, sel.cartao, sel.mes), out = subnav('faturas');
    out += '<div class="chips" role="group" aria-label="Cartão">' + S.cards.map(function (x) { return '<button class="chipb" data-act="invcard" data-v="' + x.id + '" aria-pressed="' + (x.id === sel.cartao) + '">' + esc(x.curto || x.nome) + '</button>'; }).join('') + '</div>';
    out += '<div class="cyc"><button data-act="invm" data-d="-1" aria-label="Fatura anterior">' + ic('left') + '</button><div class="mid"><b>Fatura de ' + F.fmtMes(sel.mes) + '</b><span class="small muted">Fecha ' + F.fmtD(r.fech) + '</span></div><button data-act="invm" data-d="1" aria-label="Próxima fatura">' + ic('right') + '</button></div>';
    var base = r.banco != null ? r.banco : r.estimado;
    out += '<section class="card stack"><div class="row sb"><div><div class="lbl small muted bold">' + (r.banco != null ? 'Valor do banco' : 'Estimativa do app') + '</div><div style="font-size:32px;font-weight:800;letter-spacing:-.02em" class="money">' + R(base) + '</div></div>' + A.stBadge(r.statusExib) + '</div>' +
      '<div>' + kv('Vencimento', r.venc ? F.fmtD(r.venc) : '<span class="tag warn">a confirmar</span>') + kv('Pagamento previsto', r.prevPag ? F.fmtD(r.prevPag) : '—') +
      kv('Compras novas', money(r.comprasNovas)) + kv('Anteriores ao marco zero', money(r.anteriores)) + kv('Parcelas antigas', money(r.parcAntigas)) + kv('Parcelas de compras novas', money(r.parcNovas)) + (r.ajustes ? kv('Ajustes e estornos', money(r.ajustes)) : '') +
      kv('<b>Estimativa do app</b>', '<b class="money">' + R(r.estimado) + '</b>') + (r.banco != null ? kv('Valor informado pelo banco', money(r.banco)) : '') + (r.diverg ? kv('Diferença', '<b class="money neg">' + R(r.dif) + '</b>') : '') +
      kv('Pago', money(r.pagos)) + kv('<b>Saldo da fatura</b>', '<b class="money">' + R(r.saldo) + '</b>') + '</div>' +
      (r.diverg ? '<div class="alert medio">' + ic('warn') + '<span>O banco e o app não batem (' + R(Math.abs(r.dif)) + '). O app mantém os dois valores: o saldo usa o do banco. Confira se falta algum lançamento ou se há um centavo de arredondamento.</span></div>' : '') +
      (!c.fechOk ? '<div class="alert info">' + ic('info') + '<span>O fechamento deste cartão (dia ' + c.fech + ') ainda não foi confirmado. Se mudar, ajuste em Ajustes &gt; Cartões e as faturas são recalculadas.</span></div>' : '') +
      (r.pendentes.length ? '<div class="alert info">' + ic('info') + '<span>' + r.pendentes.length + ' lançamento(s) desta fatura estão com o ciclo a confirmar (perto do fechamento).</span></div>' : '') +
      '<div class="row wrapr"><button class="btn primary grow" data-act="payopen" data-c="' + sel.cartao + '" data-m="' + sel.mes + '">Registrar pagamento</button><button class="btn grow" data-act="bankopen">' + (r.banco != null ? 'Alterar valor do banco' : 'Informar valor do banco') + '</button></div>' +
      '<div class="row wrapr">' + (r.inv.man === 'paga' ? '<button class="btn sm grow" data-act="reopen">Reabrir fatura</button>' : '<button class="btn sm grow" data-act="markpaid">Marcar como paga</button>') + '</div></section>';
    var pays = S.payments.filter(function (p) { return p.cartao === sel.cartao && p.mes === sel.mes && p.st !== 'excluida'; });
    out += '<section class="card"><h2>Pagamentos</h2>' + (pays.length ? '<div class="list">' + pays.map(function (p) { return '<div class="li"><div class="grow"><div class="t">' + R(p.valor) + '</div><div class="s">' + F.fmtD(p.data) + (p.obs ? ' · ' + esc(p.obs) : '') + '</div></div><button class="btn sm danger" data-act="delpay" data-id="' + p.id + '" aria-label="Remover pagamento de ' + R(p.valor) + '">' + ic('trash') + '</button></div>'; }).join('') + '</div>' : '<p class="small muted">Nenhum pagamento registrado. Pagamentos de fatura nunca contam como compra.</p>') + '</section>';
    // itens
    var groups = [['Compras novas', function (i) { return i.kind === 'avista' && i.cls === 'nova' && !i.p.aj; }], ['Anteriores ao marco zero', function (i) { return i.kind === 'avista' && i.cls === 'anterior' && !i.p.aj; }], ['Parcelas antigas', function (i) { return i.kind === 'parcela' && i.cls === 'antiga'; }], ['Parcelas de compras novas', function (i) { return i.kind === 'parcela' && i.cls === 'nova'; }], ['Ajustes e estornos', function (i) { return !!i.p.aj; }]];
    out += '<section class="card"><h2>Lançamentos da fatura</h2>';
    groups.forEach(function (g) {
      var its = r.items.filter(g[1]); if (!its.length) return;
      out += '<details' + (g[0] === 'Compras novas' ? ' open' : '') + '><summary>' + g[0] + ' · ' + its.length + '</summary><div class="list">' + its.sort(function (a, b) { return a.p.data < b.p.data ? 1 : -1; }).map(function (i) {
        var p = i.p, sub = F.fmtDC(p.data) + ' · ' + esc(F.catNome(S, p.cat)) + (i.kind === 'parcela' ? ' · parcela ' + i.pc.n + '/' + i.pc.N : '');
        return '<div class="li"><button class="main" data-act="edit" data-id="' + p.id + '"><div class="grow"><div class="t ellip">' + esc(p.desc) + '</div><div class="s">' + sub + '</div></div><div class="v money">' + R(i.valor) + '</div></button></div>';
      }).join('') + '</div></details>';
    });
    if (!r.items.length) out += '<p class="small muted">Nenhum lançamento nesta fatura.</p>';
    out += '</section>';
    return '<div class="stack">' + out + '</div>';
  }
};
A.acts.invcard = function (e, el) { ui.inv = { cartao: el.dataset.v, mes: F.currentInv(A.S, el.dataset.v) }; A.render(); };
A.acts.invm = function (e, el) { ui.inv.mes = F.addM(invSel().mes, +el.dataset.d); A.render(); };
A.acts.payopen = function (e, el) {
  var S = A.S, c = el.dataset.c, m = el.dataset.m, r = F.invResumo(S, c, m);
  A.openSheet('<h2>Registrar pagamento</h2><p class="small muted">' + esc(F.formaNome(S, c)) + ' · fatura de ' + F.fmtMes(m) + ' · saldo ' + R(r.saldo) + '</p><form class="stack" data-sub="paySave" novalidate><input type="hidden" name="c" value="' + c + '"><input type="hidden" name="m" value="' + m + '">' +
    '<div class="field"><label for="pv">Valor pago</label><input id="pv" name="v" class="money-in money" inputmode="decimal" value="' + (r.saldo > 0 ? F.fmtIn(r.saldo) : '') + '" placeholder="0,00" autocomplete="off"></div>' +
    '<div class="field"><label for="pd">Data</label><input id="pd" name="d" type="date" value="' + F.hoje() + '"></div><div class="field"><label for="po">Observação</label><input id="po" name="o" autocomplete="off"></div><p class="err" id="perr" role="alert"></p>' +
    '<p class="hint">Pagamento parcial reduz só o saldo da fatura. Não vira compra e não altera o teto.</p><div class="row"><button type="button" class="btn grow" data-act="close">Cancelar</button><button type="submit" class="btn primary grow">Salvar</button></div></form>');
};
A.inputs.paySave = function (e, form) {
  var v = pm(form.v.value), r = F.addPayment(A.S, { cartao: form.c.value, mes: form.m.value, data: form.d.value, valor: v, obs: form.o.value });
  if (!r.ok) { $('#perr').textContent = r.errors[0].msg; return; }
  A.save(); A.closeSheet(); A.toast('Pagamento de ' + R(v) + ' registrado.'); A.render();
};
A.acts.delpay = async function (e, el) {
  var S = A.S, pg = S.payments.find(function (x) { return x.id === el.dataset.id; }); if (!pg) return;
  if (!(await A.ask({ title: 'Remover pagamento?', text: 'Pagamento de ' + R(pg.valor) + ' em ' + F.fmtD(pg.data) + '. O saldo da fatura volta a subir.', ok: 'Remover', danger: true }))) return;
  F.removePayment(S, pg.id); A.save(); A.render();
};
A.acts.bankopen = function () {
  var sel = invSel(), r = F.invResumo(A.S, sel.cartao, sel.mes);
  A.openSheet('<h2>Valor da fatura no banco</h2><p class="small muted">Estimativa do app: ' + R(r.estimado) + '. Informe o valor que aparece no app do banco para comparar. Deixe em branco para remover.</p><form class="stack" data-sub="bankSave" novalidate><div class="field"><label for="bv">Valor do banco</label><input id="bv" name="v" class="money-in money" inputmode="decimal" value="' + (r.banco != null ? F.fmtIn(r.banco) : '') + '" placeholder="0,00" autocomplete="off"></div><p class="err" id="perr" role="alert"></p><div class="row"><button type="button" class="btn grow" data-act="close">Cancelar</button><button type="submit" class="btn primary grow">Salvar</button></div></form>');
};
A.inputs.bankSave = function (e, form) {
  var sel = invSel(), t = form.v.value.trim(), v = t ? pm(t) : null;
  if (t && (isNaN(v) || v < 0)) { $('#perr').textContent = 'Valor inválido.'; return; }
  F.setInvoice(A.S, sel.cartao, sel.mes, { banco: v, conf: v != null }); A.save(); A.closeSheet(); A.toast(v == null ? 'Valor do banco removido.' : 'Valor do banco salvo.'); A.render();
};
A.acts.markpaid = async function () {
  var sel = invSel(), r = F.invResumo(A.S, sel.cartao, sel.mes);
  if (!(await A.ask({ title: 'Marcar como paga?', text: 'A fatura de ' + F.fmtMes(sel.mes) + ' (' + R(r.saldo) + ' em aberto) passa a constar como paga, sem lançar um pagamento. Para guardar valor e data, use “Registrar pagamento”.', ok: 'Marcar como paga' }))) return;
  F.setInvoice(A.S, sel.cartao, sel.mes, { man: 'paga' }); A.save(); A.render();
};
A.acts.reopen = function () { var sel = invSel(); F.setInvoice(A.S, sel.cartao, sel.mes, { man: null }); A.save(); A.render(); };

/* ================= PARCELAS ================= */
A.screens.parcelas = {
  sub: function () { return ''; },
  html: function () {
    var S = A.S, f = ui.pf, h = F.hoje(), out = subnav('parcelas');
    var start = S.cards.map(function (c) { return F.currentInv(S, c.id, h); }).sort()[0] || F.ymOf(h);
    var cal = F.calendarioParcelas(S, start, 12), tot = 0, totA = 0, totN = 0, byCat = {}, byCard = {};
    S.purchases.forEach(function (p) {
      if (p.st === 'excluida' || p.tipo !== 'parcelado') return; var pa = F.parcelaAtual(S, p);
      F.parcelasDe(S, p).forEach(function (x) { if (x.mes && x.mes < start) return; var v = x.valor; tot += v; (F.isAntiga(S, p) ? (totA += v) : (totN += v)); var ck = p.cat || '_nc'; byCat[ck] = (byCat[ck] || 0) + v; byCard[p.cartao || '_n'] = (byCard[p.cartao || '_n'] || 0) + v; });
    });
    out += '<section class="card stack"><div class="row sb"><div><div class="small muted bold">Total ainda a pagar em parcelas</div><div style="font-size:30px;font-weight:800;letter-spacing:-.02em" class="money">' + R(tot) + '</div></div></div><div class="grid2"><div class="mini"><span class="small muted">De compras anteriores</span><span class="bold money">' + R(totA) + '</span></div><div class="mini"><span class="small muted">De compras novas</span><span class="bold money">' + R(totN) + '</span></div></div></section>';
    out += '<div class="seg" role="group" aria-label="Filtro">' + [['todas', 'Todas'], ['novas', 'Compras novas'], ['antigas', 'Antigas']].map(function (x) { return '<button data-act="pf" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var val = function (m) { return f === 'novas' ? m.novas : f === 'antigas' ? m.antigas : m.total; };
    var max = Math.max.apply(null, cal.meses.map(val).concat([1]));
    out += '<section class="card"><h2>Calendário (12 meses)</h2><div class="mbar" role="img" aria-label="Parcelas por mês">' + cal.meses.map(function (m) { var v = val(m); return '<div class="c"><b style="height:' + Math.round(v * 80 / max) + 'px"></b><span>' + F.MES[+m.mes.slice(5) - 1] + '</span></div>'; }).join('') + '</div>';
    out += '<div class="list" style="margin-top:8px">' + cal.meses.map(function (m) {
      var its = m.itens.filter(function (i) { return f === 'todas' || (f === 'antigas') === i.antiga; }), open = ui.pm === m.mes;
      var row = '<div class="li"><button class="main" data-act="pm" data-m="' + m.mes + '" aria-expanded="' + open + '"><div class="grow"><div class="t">' + F.fmtMes(m.mes) + '</div><div class="s">' + its.length + ' parcela' + (its.length === 1 ? '' : 's') + (f === 'todas' && m.novas ? ' · novas ' + R(m.novas) : '') + '</div></div><div class="v money">' + R(val(m)) + '</div></button></div>';
      if (open) row += '<div class="detail">' + (its.length ? its.sort(function (a, b) { return b.pc.valor - a.pc.valor; }).map(function (i) { return kv(esc(i.p.desc) + ' <span class="muted">' + i.pc.n + '/' + i.pc.N + ' · ' + esc(F.formaCurto(S, i.p.cartao)) + ' · ' + F.statusParcela(S, i.p, i.pc) + '</span>', money(i.pc.valor)); }).join('') : '<p class="small muted">Sem parcelas neste filtro.</p>') + '</div>';
      return row;
    }).join('') + '</div></section>';
    if (cal.semFatura.length) out += '<div class="alert medio">' + ic('warn') + '<span>' + cal.semFatura.length + ' parcela(s) sem cartão não entram no calendário. Informe o cartão no histórico.</span></div>';
    var named = function (o, nm) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return kv(esc(nm(k)), money(o[k])); }).join(''); };
    out += '<section class="card"><h2>Por categoria</h2>' + named(byCat, function (k) { return k === '_nc' ? 'Não classificado' : F.catNome(S, k); }) + '</section>';
    out += '<section class="card"><h2>Por cartão</h2>' + named(byCard, function (k) { return k === '_n' ? 'Sem cartão' : F.formaNome(S, k); }) + '</section>';
    // compras parceladas ativas
    var act = S.purchases.filter(function (p) { return p.st !== 'excluida' && p.tipo === 'parcelado'; }).map(function (p) { var pa = F.parcelaAtual(S, p); return { p: p, pa: pa }; }).filter(function (x) { return x.pa.atual && (f === 'todas' || (f === 'antigas') === F.isAntiga(S, x.p)); });
    act.sort(function (a, b) { return b.pa.atual.valor - a.pa.atual.valor; });
    out += '<section class="card"><h2>Compras parceladas em andamento · ' + act.length + '</h2><div class="list">' + act.map(function (x) {
      var p = x.p, antiga = F.isAntiga(S, p), done = (antiga ? p.k - 1 : 0) + x.pa.idx, rest = x.pa.todas.slice(x.pa.idx).reduce(function (a, b) { return a + b.valor; }, 0), last = x.pa.todas[x.pa.todas.length - 1];
      return '<div class="li"><button class="main" data-act="edit" data-id="' + p.id + '"><div class="grow"><div class="t ellip">' + esc(p.desc) + '</div><div class="s">' + esc(F.formaCurto(S, p.cartao)) + ' · ' + esc(F.catNome(S, p.cat)) + ' · até ' + F.fmtMes(last.mes) + '</div><div class="prog" style="margin-top:5px" role="img" aria-label="' + done + ' de ' + p.n + ' parcelas pagas"><b style="width:' + Math.round(done * 100 / p.n) + '%"></b></div><div class="tiny muted" style="margin-top:2px">' + done + '/' + p.n + ' pagas · restam ' + (x.pa.todas.length - x.pa.idx) + '</div></div><div class="right"><div class="v money">' + R(x.pa.atual.valor) + '</div><div class="tiny muted">faltam ' + R(rest) + '</div></div></button></div>';
    }).join('') + '</div></section>';
    return '<div class="stack">' + out + '</div>';
  }
};
A.acts.pf = function (e, el) { ui.pf = el.dataset.v; A.render(); };
A.acts.pm = function (e, el) { ui.pm = ui.pm === el.dataset.m ? null : el.dataset.m; A.render(); };
})();
