/* UI — Mais, Relatórios, Simulador, Caixa, Ajustes */
(function () {
'use strict';
var A = window.APP, F = A.F, esc = A.esc, R = A.R, ic = A.ic, $ = A.$, ui = A.ui, kv = A.kv;
var pm = F.parseMoney;
var money = function (c) { return '<span class="money">' + R(c) + '</span>'; };
var csvN = function (c) { return (c / 100).toFixed(2).replace('.', ','); };

/* ================= MAIS ================= */
A.screens.mais = {
  html: function () {
    var it = function (to, icn, t, s) { return '<a href="#' + to + '">' + ic(icn) + '<span class="grow">' + t + '<small>' + s + '</small></span>' + ic('right') + '</a>'; };
    return '<div class="card menu">' + it('relatorios', 'chart', 'Relatórios', 'Semanal e mensal, com exportação em CSV') + it('simulador', 'calc', 'Posso comprar isso?', 'Simule o efeito de uma compra no orçamento') + it('caixa', 'cash', 'Caixa dos próximos ciclos', 'Entradas, despesas fixas e faturas') + it('ajustes', 'gear', 'Ajustes e backup', 'Orçamento, cartões, categorias, receitas e fixas') + '</div>';
  }
};

/* ================= RELATÓRIOS ================= */
function relPeriod() {
  var S = A.S, r = ui.rel, ref = r.ref || F.hoje();
  if (r.modo === 'semana') return F.weekRange(ref);
  return F.cycleRange(F.cycleKey(ref, S.settings.cicloDia), S.settings.cicloDia);
}
function relData() { var p = relPeriod(); return F.relatorio(A.S, p.ini, p.fim); }
function spark(evol) {
  var pts = evol.filter(function (e) { return e.saldo != null; }); if (pts.length < 2) return '';
  var min = Math.min.apply(null, pts.map(function (p) { return p.saldo; }).concat([0])), max = Math.max.apply(null, pts.map(function (p) { return p.saldo; }).concat([1]));
  var x = function (i) { return 6 + i * 288 / (pts.length - 1); }, y = function (v) { return 8 + (max - v) * 64 / (max - min || 1); };
  return '<svg class="spark" viewBox="0 0 300 80" role="img" aria-label="Evolução do saldo do teto no período, de ' + R(pts[0].saldo) + ' a ' + R(pts[pts.length - 1].saldo) + '"><line x1="0" x2="300" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--line)" stroke-dasharray="3 3"/><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1); }).join(' ') + '"/></svg>';
}
A.screens.relatorios = {
  sub: function () { var p = relPeriod(); return F.fmtD(p.ini) + ' a ' + F.fmtD(p.fim); },
  html: function () {
    var S = A.S, r = ui.rel, d = relData(), out = '';
    out += '<div class="seg" role="group" aria-label="Período"><button data-act="relm" data-v="semana" aria-pressed="' + (r.modo === 'semana') + '">Semanal</button><button data-act="relm" data-v="ciclo" aria-pressed="' + (r.modo === 'ciclo') + '">Mensal (ciclo)</button></div>';
    out += '<div class="cyc"><button data-act="relnav" data-d="-1" aria-label="Período anterior">' + ic('left') + '</button><div class="mid"><b>' + (r.modo === 'semana' ? 'Semana' : 'Ciclo') + ' ' + F.fmtDC(d.ini) + ' a ' + F.fmtDC(d.fim) + '</b><span class="small muted">' + d.n + ' compras novas</span></div><button data-act="relnav" data-d="1" aria-label="Próximo período">' + ic('right') + '</button></div>';
    out += '<section class="card stack"><div class="grid2"><div class="mini"><span class="small muted">Gasto no teto</span><span class="n money">' + R(d.total) + '</span></div><div class="mini"><span class="small muted">Média por dia</span><span class="n money">' + R(d.media) + '</span></div></div>' +
      '<div>' + kv('Alimentação', money(d.alim)) + kv('Outras compras', money(d.outras)) + (d.total - d.alim - d.outras ? kv('Não classificado', money(d.total - d.alim - d.outras)) : '') + kv('Fora do teto (aluguel, Pix)', money(d.fora)) +
      (!d.b.antes ? kv('Saldo do teto no fim do período', '<b class="money ' + (d.b.saldoTotal < 0 ? 'neg' : '') + '">' + R(d.b.saldoTotal) + '</b>') + kv('Situação do ciclo', A.sitBadge(d.b.sit)) : '') +
      (d.fim > F.hoje() && d.total ? kv('Projeção no ritmo atual', money(d.proj)) : '') + kv('Parcelas futuras (depois do período)', money(d.parcelasFuturas)) + '</div></section>';
    if (d.alertas.length) out += '<section class="stack" style="gap:8px" aria-label="Alertas">' + d.alertas.map(function (t) { return '<div class="alert medio">' + ic('warn') + '<span>' + esc(t) + '</span></div>'; }).join('') + '</section>';
    var sp = spark(d.evol); if (sp) out += '<section class="card"><h2>Evolução do saldo do teto</h2>' + sp + '</section>';
    var maxv = Math.max.apply(null, Object.keys(d.porCat).map(function (k) { return Math.abs(d.porCat[k]); }).concat([1]));
    var cats = Object.keys(d.porCat).sort(function (a, b) { return d.porCat[b] - d.porCat[a]; });
    out += '<section class="card"><h2>Por categoria</h2>' + (cats.map(function (k) { return '<div style="margin:8px 0"><div class="row sb small"><span>' + esc(k === '_nc' ? 'Não classificado' : F.catNome(S, k)) + '</span><b class="money">' + R(d.porCat[k]) + '</b></div><div class="prog"><b style="width:' + Math.max(2, Math.round(Math.abs(d.porCat[k]) * 100 / maxv)) + '%"></b></div></div>'; }).join('') || '<p class="small muted">Sem compras no período.</p>') + '</section>';
    var cs = Object.keys(d.porCartao).sort(function (a, b) { return d.porCartao[b] - d.porCartao[a]; });
    out += '<section class="card"><h2>Por cartão</h2>' + (cs.map(function (k) { return kv(esc(k === '_nenhum' ? 'Sem cartão (pendente)' : F.formaNome(S, k)), money(d.porCartao[k])); }).join('') || '<p class="small muted">Sem compras no período.</p>') + '</section>';
    out += '<section class="card"><h2>Maiores compras</h2>' + (d.maiores.length ? '<div class="list">' + d.maiores.map(function (p) { return '<div class="li"><div class="grow"><div class="t ellip">' + esc(p.desc) + '</div><div class="s">' + F.fmtDC(p.data) + ' · ' + esc(F.formaCurto(S, p.cartao)) + '</div></div><div class="v money">' + R(p.valor) + '</div></div>'; }).join('') + '</div>' : '<p class="small muted">Sem compras no período.</p>') + '</section>';
    if (d.parceladas.length) out += '<section class="card"><h2>Compras parceladas do período</h2>' + d.parceladas.map(function (p) { return kv(esc(p.desc) + ' <span class="muted">' + p.n + 'x de ' + R(p.vp) + '</span>', money(p.valor)); }).join('') + '</section>';
    out += '<button class="btn block" data-act="relcsv">' + ic('dl') + ' Exportar este relatório (CSV)</button>';
    return '<div class="stack">' + out + '</div>';
  }
};
A.acts.relm = function (e, el) { ui.rel.modo = el.dataset.v; A.render(); };
A.acts.relnav = function (e, el) {
  var S = A.S, r = ui.rel, d = +el.dataset.d, ref = r.ref || F.hoje();
  if (r.modo === 'semana') r.ref = F.addDays(F.weekRange(ref).ini, 7 * d);
  else r.ref = F.cycleRange(F.addM(F.cycleKey(ref, S.settings.cicloDia), d), S.settings.cicloDia).ini;
  A.render();
};
A.acts.relcsv = function () {
  var S = A.S, d = relData(), rows = [];
  rows.push(['periodo', d.ini + ' a ' + d.fim, '', ''], ['resumo', 'Gasto no teto', csvN(d.total), ''], ['resumo', 'Alimentação', csvN(d.alim), ''], ['resumo', 'Outras compras', csvN(d.outras), ''], ['resumo', 'Fora do teto', csvN(d.fora), ''], ['resumo', 'Média por dia', csvN(d.media), ''], ['resumo', 'Parcelas futuras', csvN(d.parcelasFuturas), '']);
  if (!d.b.antes) rows.push(['resumo', 'Saldo do teto no fim do período', csvN(d.b.saldoTotal), F.SIT_TXT[d.b.sit]]);
  Object.keys(d.porCat).forEach(function (k) { rows.push(['categoria', k === '_nc' ? 'Não classificado' : F.catNome(S, k), csvN(d.porCat[k]), '']); });
  Object.keys(d.porCartao).forEach(function (k) { rows.push(['cartao', k === '_nenhum' ? 'Sem cartão' : F.formaNome(S, k), csvN(d.porCartao[k]), '']); });
  d.lista.sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (p) { rows.push(['lancamento', p.data + ' ' + p.desc, csvN(p.valor), F.formaNome(S, p.cartao) + ' / ' + F.catNome(S, p.cat) + (p.tipo === 'parcelado' ? ' / ' + p.n + 'x' : '')]); });
  A.saveFile('relatorio-' + d.ini + '-a-' + d.fim + '.csv', F.toCSV(['secao', 'item', 'valor', 'detalhe'], rows));
};

/* ================= SIMULADOR ================= */
function simDef() { return { valor: '', data: F.hoje(), cat: '', cartao: '', tipo: 'avista', n: '' }; }
function simInput() {
  var s = ui.sim, i = { data: s.data, desc: 'Simulação', valor: pm(s.valor), cartao: s.cartao || null, cat: s.cat || null, tipo: s.tipo };
  if (s.tipo === 'parcelado') i.n = parseInt(s.n, 10); return i;
}
function simHtml() {
  var S = A.S, s = ui.sim, i = simInput();
  if (isNaN(i.valor) || !(i.valor > 0)) return '<p class="small muted">Informe o valor para ver o resultado.</p>';
  if (s.tipo === 'parcelado' && !(i.n >= 2)) return '<p class="small muted">Informe o número de parcelas (2 ou mais).</p>';
  if (S.settings.inicio > i.data) return '<p class="small muted">A data está antes do marco zero (' + F.fmtD(S.settings.inicio) + '). Use uma data atual.</p>';
  var r = F.simular(S, i), b0 = r.antes, b1 = r.depois, x = '', tipo = r.tipoCat;
  var titulo = { compat: ['dentro', 'Cabe no orçamento'], atencao: ['atencao', 'Cabe, mas deixa o orçamento em atenção'], estoura_cat: ['limite', 'Passa do limite da categoria'], estoura_teto: ['ultrapassado', 'Ultrapassa o teto do ciclo'], fora: ['dentro', 'Fora do teto'], anterior: ['dentro', 'Fora do controle'] }[r.reco];
  var expl = {
    compat: 'Depois da compra, o saldo do teto fica em ' + R(b1.saldoTotal) + '.',
    atencao: 'O saldo do teto fica em ' + R(b1.saldoTotal) + ' e o ciclo passa de ' + S.settings.alertaPct + '% do limite.',
    estoura_cat: 'O excesso de ' + R(tipo === 'alimentacao' ? -b1.saldoAlim : -b1.saldoOutras) + ' em ' + (tipo === 'alimentacao' ? 'Alimentação' : 'Outras compras') + ' será descontado da mesma categoria no próximo ciclo.',
    estoura_teto: 'O teto ficaria negativo em ' + R(-b1.saldoTotal) + '. O orçamento não aumenta: o excesso reduz o teto do próximo ciclo.',
    fora: 'A categoria escolhida fica fora do teto: não consome orçamento, mas entra na fatura e no caixa.',
    anterior: 'Compras anteriores ao marco zero entram só na fatura.'
  }[r.reco];
  x += '<div class="row sb wrapr"><h3>' + titulo[1] + '</h3>' + A.sitBadge(titulo[0]) + '</div><p style="margin-top:6px">' + expl + '</p>';
  if (r.reco !== 'fora' && r.reco !== 'anterior') {
    x += '<div style="margin-top:8px">' + kv('Saldo do teto antes → depois', '<span class="money">' + R(b0.saldoTotal) + ' → <b class="' + (b1.saldoTotal < 0 ? 'neg' : '') + '">' + R(b1.saldoTotal) + '</b></span>');
    if (tipo === 'alimentacao') x += kv('Alimentação antes → depois', '<span class="money">' + R(b0.saldoAlim) + ' → ' + R(b1.saldoAlim) + '</span>');
    if (tipo === 'outras') x += kv('Outras compras antes → depois', '<span class="money">' + R(b0.saldoOutras) + ' → ' + R(b1.saldoOutras) + '</span>');
    x += kv('Uso do teto depois', A.pct(b1.pct) + '%') + '</div>';
  }
  if (s.cartao && S.cards.some(function (c) { return c.id === s.cartao; })) {
    var c = F.cardById(S, s.cartao), mes = F.invoiceMonth(c, i.data), est = F.invResumo(S, c.id, mes).estimado, add = r.parcelas.length ? r.parcelas[0].valor : i.valor;
    x += '<div style="margin-top:6px">' + kv('Fatura ' + esc(c.nome) + ' de ' + F.fmtMes(mes), '<span class="money">' + R(est) + ' → <b>' + R(est + add) + '</b></span>') + '</div>';
  }
  if (r.parcelas.length) {
    x += '<details style="margin-top:6px" open><summary>Parcelas (' + r.parcelas.length + ' × ' + R(r.parcelas[0].valor) + ')</summary>' + r.parcelas.map(function (p) { return kv(p.n + '/' + p.N + (p.mes ? ' · ' + F.fmtMes(p.mes) : ' · fatura a definir'), money(p.valor)); }).join('') + '<p class="hint">No teto, o valor total conta uma vez só, no mês da compra. As parcelas alimentam o calendário e as faturas.</p></details>';
  }
  x += '<button class="btn primary block" style="margin-top:10px" data-act="simreg">Registrar esta compra</button>';
  return x;
}
A.screens.simulador = {
  html: function () {
    var S = A.S; if (!ui.sim) ui.sim = simDef(); var s = ui.sim;
    return '<div class="stack"><p class="small muted">Simulação: nada é gravado.</p><section class="card stack">' +
      '<div class="seg" role="group" aria-label="Modalidade"><button data-act="simtipo" data-v="avista" aria-pressed="' + (s.tipo === 'avista') + '">À vista</button><button data-act="simtipo" data-v="parcelado" aria-pressed="' + (s.tipo === 'parcelado') + '">Parcelado</button></div>' +
      '<div class="field"><label for="sv">Valor' + (s.tipo === 'parcelado' ? ' total' : '') + '</label><input id="sv" class="money-in money" inputmode="decimal" placeholder="0,00" autocomplete="off" value="' + esc(s.valor) + '" data-in="simIn" data-ch="simMoney" data-k="valor"></div>' +
      (s.tipo === 'parcelado' ? '<div class="field"><label for="sn">Número de parcelas</label><input id="sn" inputmode="numeric" placeholder="6" value="' + esc(s.n) + '" data-in="simIn" data-k="n"></div>' : '') +
      '<div class="field"><label for="sc">Categoria</label><select id="sc" data-ch="simIn" data-k="cat">' + A.catOptions(s.cat) + '</select></div>' +
      '<div class="field"><label for="sk">Cartão (opcional)</label><select id="sk" data-ch="simIn" data-k="cartao">' + A.cardOptions(s.cartao, true) + '</select></div>' +
      '<div class="field"><label for="sd">Data</label><input id="sd" type="date" value="' + esc(s.data) + '" data-ch="simIn" data-k="data"></div></section><section class="card" id="simres" aria-live="polite">' + simHtml() + '</section></div>';
  }
};
A.acts.simtipo = function (e, el) { ui.sim.tipo = el.dataset.v; A.render(); };
A.inputs.simIn = function (e, el) { ui.sim[el.dataset.k] = el.value; if (e.type === 'change' && (el.dataset.k === 'cat' || el.dataset.k === 'cartao' || el.dataset.k === 'data')) { $('#simres').innerHTML = simHtml(); return; } $('#simres').innerHTML = simHtml(); };
A.inputs.simMoney = function (e, el) { var c = pm(el.value); if (!isNaN(c) && c !== 0) { el.value = F.fmtIn(c); ui.sim.valor = el.value; $('#simres').innerHTML = simHtml(); } };
A.acts.simreg = function () {
  var s = ui.sim, d = { data: s.data, desc: '', valor: s.valor, cartao: s.cartao, cat: s.cat, tipo: s.tipo, n: s.n, vp: '', k: '1', basis: 'total', obs: '', mf: '', catAuto: false };
  ui.editId = null; ui.draft = d; ui.errs = null; ui.errList = null; A.go('registrar');
};

/* ================= CAIXA ================= */
A.screens.caixa = {
  sub: function () { return 'Projeção aproximada'; },
  html: function () {
    var S = A.S, cy = F.caixa(S, A.curKey(), ui.caixaN), out = '';
    out += '<p class="small muted">Entradas e despesas fixas previstas, mais as faturas já lançadas. ' + (S.settings.caixa28 ? 'Recebimentos e pagamentos do dia 28 contam no ciclo que termina no dia 27.' : 'Cada evento conta no ciclo da própria data.') + ' Compras futuras entram só como reserva do teto restante.</p>';
    cy.forEach(function (c, idx) {
      var open = ui.cx === c.key, grp = {};
      c.fixas.forEach(function (f) { grp[f.grupo || 'Outras'] = (grp[f.grupo || 'Outras'] || 0) + f.valor; });
      out += '<section class="card stack"><div class="row sb"><h2 style="margin:0">' + F.cycleLabel(c.key, S.settings.cicloDia) + (idx === 0 ? ' <span class="tag info">ciclo atual</span>' : '') + '</h2></div>' +
        '<div>' + kv('Entradas previstas', '<span class="money pos">' + R(c.tEnt) + '</span>') + kv('Despesas fixas', '<span class="money">− ' + R(c.tFix) + '</span>') + kv('Faturas dos cartões (' + (c.faturas.length) + ')', '<span class="money">− ' + R(c.tFat) + '</span>') +
        kv('<b>Sobra antes de novas compras</b>', '<b class="money ' + (c.sobra < 0 ? 'neg' : 'pos') + '">' + R(c.sobra) + '</b>') + kv('Reserva do teto ' + (idx === 0 ? 'ainda disponível' : 'do ciclo'), '<span class="money">− ' + R(c.reserva) + '</span>') +
        kv('<b>Sobra se gastar todo o teto</b>', '<b class="money ' + (c.sobraTeto < 0 ? 'neg' : '') + '">' + R(c.sobraTeto) + '</b>') + (S.settings.saldoCaixa ? kv('Acumulado (com o saldo informado)', '<b class="money">' + R(c.acum) + '</b>') : '') + '</div>' +
        '<button class="btn sm" data-act="cx" data-k="' + c.key + '" aria-expanded="' + open + '">' + (open ? 'Ocultar detalhes' : 'Ver detalhes') + '</button>';
      if (open) {
        out += '<div class="detail"><h3>Entradas</h3>' + (c.entradas.sort(function (a, b) { return a.data < b.data ? -1 : 1; }).map(function (x) { return kv(esc(x.nome) + ' <span class="muted">' + F.fmtDC(x.data) + '</span>', money(x.valor)); }).join('') || '<p class="small muted">Nenhuma.</p>') +
          '<h3>Despesas fixas</h3>' + Object.keys(grp).map(function (g) { return kv(esc(g), money(grp[g])); }).join('') + (c.fixas.some(function (f) { return !f.conf; }) ? '<p class="hint">Dia de vencimento das fixas ainda a confirmar (assumido dia 28).</p>' : '') +
          '<h3>Faturas</h3>' + (c.faturas.map(function (x) { return kv(esc(x.nome) + ' ' + F.fmtMes(x.mes) + ' <span class="muted">' + F.fmtDC(x.data) + (x.banco ? '' : ' · estimada') + '</span>', money(x.valor)); }).join('') || '<p class="small muted">Nenhuma.</p>') + '</div>';
      }
      out += '</section>';
    });
    out += '<button class="btn block" data-act="cxmore">Mostrar mais um ciclo</button>';
    out += '<form class="card stack" data-sub="saldoCaixa" novalidate><h2>Saldo em conta (opcional)</h2><p class="small muted">Se informar, o app mostra o acumulado ao longo dos ciclos.</p><div class="field"><label for="scx">Saldo atual</label><input id="scx" name="v" inputmode="decimal" placeholder="0,00" value="' + (S.settings.saldoCaixa ? F.fmtIn(S.settings.saldoCaixa) : '') + '"></div><button class="btn" type="submit">Salvar saldo</button></form>';
    return '<div class="stack">' + out + '</div>';
  }
};
A.acts.cx = function (e, el) { ui.cx = ui.cx === el.dataset.k ? null : el.dataset.k; A.render(); };
A.acts.cxmore = function () { ui.caixaN++; A.render(); };
A.inputs.saldoCaixa = function (e, f) { var t = f.v.value.trim(), v = t ? pm(t) : 0; if (isNaN(v)) { A.toast('Valor inválido.'); return; } A.S.settings.saldoCaixa = v; A.save(); A.toast('Saldo salvo.'); A.render(); };

/* ================= AJUSTES ================= */
function stText() {
  var s = A.store;
  if (s.mode === 'db') return s.status === 'erro' ? 'Banco de dados do artefato: <b>erro ao gravar</b> (' + esc(s.msg) + '). Seus dados continuam salvos neste navegador.' : 'Banco de dados do artefato <b>conectado</b>' + (s.status === 'saving' ? ' (salvando…)' : '') + ', com cópia neste navegador.';
  return 'Banco de dados do artefato <b>indisponível</b> nesta visualização. Os dados estão salvos <b>somente neste navegador</b>.' + (s.msg ? ' (' + esc(s.msg) + ')' : '');
}
A.screens.ajustes = {
  html: function () {
    var S = A.S, st = S.settings, out = '';
    out += '<section class="card stack"><h2>Onde ficam seus dados</h2><p class="small">' + stText() + '</p><p class="small muted">Para não depender só disso, exporte um backup regularmente. O arquivo JSON restaura tudo (compras, faturas, pagamentos, categorias, receitas e fixas).</p>' +
      '<div class="row wrapr"><button class="btn primary grow" data-act="bkexp">' + ic('dl') + ' Exportar backup</button><button class="btn grow" data-act="bkimp">' + ic('ul') + ' Importar backup</button></div><input type="file" id="bkfile" accept=".json,application/json" hidden data-ch="bkfile">' +
      '<div class="row wrapr"><button class="btn sm grow" data-act="csvall">' + ic('dl') + ' Lançamentos (CSV)</button><button class="btn sm grow" data-act="savenow">Salvar agora</button></div></section>';
    out += '<form class="card stack" data-sub="orc" novalidate><h2>Orçamento</h2><div class="grid2"><div class="field"><label for="ot">Teto do ciclo</label><input id="ot" name="t" inputmode="decimal" value="' + F.fmtIn(st.teto) + '"></div><div class="field"><label for="oa">Alimentação (dentro do teto)</label><input id="oa" name="a" inputmode="decimal" value="' + F.fmtIn(st.orcAlim) + '"></div></div><p class="hint">Outras compras = teto − alimentação = <b class="money">' + R(st.teto - st.orcAlim) + '</b>. Alimentação faz parte do teto, nunca é somada por cima.</p>' +
      '<div class="grid2"><div class="field"><label for="op">Alerta a partir de (%)</label><input id="op" name="p" inputmode="numeric" value="' + st.alertaPct + '"></div><div class="field"><label for="ol">Limite de acompanhamento: anteriores ao marco zero (opcional)</label><input id="ol" name="l" inputmode="decimal" placeholder="sem limite" value="' + (st.limiteAnt ? F.fmtIn(st.limiteAnt) : '') + '"></div></div>' +
      '<label class="row" style="min-height:44px"><input type="checkbox" name="c28" style="width:22px;min-height:22px" ' + (st.caixa28 ? 'checked' : '') + '> <span>No caixa, eventos do dia 28 contam no ciclo que termina no dia 27</span></label>' +
      '<p class="hint">Ciclo de ' + st.cicloDia + ' a ' + (st.cicloDia - 1) + ' · marco zero ' + F.fmtD(st.inicio) + '. Saldos negativos nunca são corrigidos automaticamente.</p><p class="err" id="oerr" role="alert"></p><button class="btn primary" type="submit">Salvar orçamento</button></form>';
    out += '<section class="card stack"><h2>Aparência</h2><div class="seg" role="group" aria-label="Tema">' + [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (t) { return '<button data-act="tema" data-v="' + t[0] + '" aria-pressed="' + ((st.tema || 'auto') === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></section>';
    out += '<section class="card"><h2>Cartões</h2><div class="list">' + S.cards.map(function (c) { return '<div class="li"><button class="main" data-act="cardedit" data-id="' + c.id + '"><div class="grow"><div class="t">' + esc(c.nome) + (c.ativo === false ? ' <span class="tag">inativo</span>' : '') + '</div><div class="s">Fecha dia ' + c.fech + (c.fechOk ? '' : ' (a confirmar)') + ' · ' + (c.venc ? 'vence dia ' + c.venc : 'vencimento a confirmar') + (c.pag ? ' · pago dia ' + c.pag : '') + '</div></div>' + ic('edit') + '</button></div>'; }).join('') + '</div><button class="btn sm" style="margin-top:8px" data-act="cardnew">' + ic('plus') + ' Novo cartão</button></section>';
    out += '<section class="card"><h2>Categorias</h2><div class="list">' + S.categories.map(function (c) { return '<div class="li"><button class="main" data-act="catedit" data-id="' + c.id + '"><div class="grow"><div class="t' + (c.ativa === false ? ' muted' : '') + '">' + esc(c.nome) + '</div><div class="s">' + ({ alimentacao: 'Alimentação (teto)', outras: 'Outras compras (teto)', fora: 'Fora do teto' }[c.tipo]) + (c.ativa === false ? ' · inativa' : '') + '</div></div>' + ic('edit') + '</button></div>'; }).join('') + '</div><button class="btn sm" style="margin-top:8px" data-act="catnew">' + ic('plus') + ' Nova categoria</button></section>';
    out += '<section class="card"><h2>Receitas previstas</h2><div class="list">' + S.incomes.map(function (c) { return '<div class="li"><button class="main" data-act="incedit" data-id="' + c.id + '"><div class="grow"><div class="t">' + esc(c.nome) + '</div><div class="s">' + (c.tipo === 'uni' ? 'Única em ' + F.fmtD(c.data) : 'Todo dia ' + c.dia) + '</div></div><div class="v money">' + R(c.valor) + '</div></button></div>'; }).join('') + '</div><button class="btn sm" style="margin-top:8px" data-act="incnew">' + ic('plus') + ' Nova receita</button></section>';
    var tf = S.fixed.filter(function (f) { return f.ativo !== false; }).reduce(function (a, f) { return a + f.valor; }, 0);
    out += '<section class="card"><div class="row sb"><h2 style="margin:0">Despesas fixas</h2><b class="money small">' + R(tf) + '/mês</b></div><div class="list">' + S.fixed.map(function (c) { return '<div class="li"><button class="main" data-act="fixedit" data-id="' + c.id + '"><div class="grow"><div class="t">' + esc(c.nome) + (c.ativo === false ? ' <span class="tag">inativa</span>' : '') + '</div><div class="s">' + esc(c.grupo || '') + ' · dia ' + c.dia + (c.diaOk ? '' : ' (a confirmar)') + (c.desde ? ' · a partir de ' + F.fmtD(c.desde) : '') + '</div></div><div class="v money">' + R(c.valor) + '</div></button></div>'; }).join('') + '</div><button class="btn sm" style="margin-top:8px" data-act="fixnew">' + ic('plus') + ' Nova despesa fixa</button></section>';
    out += '<section class="card"><details><summary>Histórico de alterações</summary><div class="list">' + S.log.slice(-40).reverse().map(function (l) { var dt = new Date(l.t); return '<div class="li"><div class="grow"><div class="t small">' + esc(l.op) + ' · ' + esc(l.d) + '</div><div class="s">' + dt.toLocaleString('pt-BR') + '</div></div></div>'; }).join('') + '</div></details></section>';
    out += '<section class="card stack"><h2>Zona de risco</h2><button class="btn danger" data-act="resetseed">Restaurar dados iniciais de exemplo</button><button class="btn danger" data-act="wipe">Apagar tudo e começar do zero</button></section>';
    return '<div class="stack">' + out + '</div>';
  }
};
var dstamp = function () { return F.hoje(); };
A.acts.bkexp = function () { A.saveFile('controle-financeiro-backup-' + dstamp() + '.json', F.serialize(A.S)); };
A.acts.csvall = function () { A.saveFile('lancamentos-' + dstamp() + '.csv', F.csvLancamentos(A.S)); };
A.acts.savenow = async function () { await A.flush(true); A.toast(A.store.status === 'ok' ? 'Tudo salvo.' : 'Salvo neste navegador.'); A.render(); };
A.acts.bkimp = function () { $('#bkfile').click(); };
A.inputs.bkfile = function (e, el) {
  var f = el.files && el.files[0]; if (!f) return; var rd = new FileReader();
  rd.onload = async function () {
    var S2; try { S2 = F.deserialize(String(rd.result)); } catch (x) { A.toast('Arquivo inválido: ' + x.message); el.value = ''; return; }
    var n = S2.purchases.filter(function (p) { return p.st !== 'excluida'; }).length;
    if (await A.ask({ title: 'Restaurar este backup?', html: 'O arquivo tem <b>' + n + ' lançamentos</b>, ' + S2.payments.length + ' pagamentos e ' + S2.cards.length + ' cartões.<br><br><b>Os dados atuais serão substituídos.</b> Exporte um backup antes se quiser guardá-los.', ok: 'Restaurar', danger: true })) {
      await A.replaceState(S2); A.applyTheme(); ui.draft = null; ui.editId = null; A.toast('Backup restaurado.'); A.render();
    }
    el.value = '';
  };
  rd.readAsText(f);
};
A.acts.tema = function (e, el) { A.S.settings.tema = el.dataset.v; A.applyTheme(); A.save(); A.render(); };
A.inputs.orc = function (e, f) {
  var t = pm(f.t.value), a = pm(f.a.value), p = parseInt(f.p.value, 10), l = f.l.value.trim() ? pm(f.l.value) : null, er = $('#oerr');
  if (isNaN(t) || t <= 0) { er.textContent = 'Informe o teto.'; return; }
  if (isNaN(a) || a < 0 || a > t) { er.textContent = 'A alimentação deve estar entre zero e o teto.'; return; }
  if (!(p >= 1 && p <= 100)) { er.textContent = 'O alerta deve ficar entre 1 e 100%.'; return; }
  if (l != null && (isNaN(l) || l <= 0)) { er.textContent = 'Limite inválido.'; return; }
  var s = A.S.settings; s.teto = t; s.orcAlim = a; s.orcOutras = t - a; s.alertaPct = p; s.limiteAnt = l; s.caixa28 = f.c28.checked;
  F.addLog(A.S, 'ajuste', null, 'Orçamento: teto ' + R(t) + ', alimentação ' + R(a)); A.save(); A.toast('Orçamento salvo.'); A.render();
};
/* sheets de cadastro */
function sheetForm(title, sub, fields, extra) {
  A.openSheet('<h2>' + title + '</h2><form class="stack" data-sub="' + sub + '" novalidate>' + fields + '<p class="err" id="serr" role="alert"></p><div class="row"><button type="button" class="btn grow" data-act="close">Cancelar</button><button type="submit" class="btn primary grow">Salvar</button></div>' + (extra || '') + '</form>');
}
var fld = function (id, lab, name, val, attrs) { return '<div class="field"><label for="' + id + '">' + lab + '</label><input id="' + id + '" name="' + name + '" value="' + esc(val == null ? '' : val) + '" autocomplete="off" ' + (attrs || '') + '></div>'; };
var chk = function (name, lab, on) { return '<label class="row" style="min-height:44px"><input type="checkbox" name="' + name + '" style="width:22px;min-height:22px" ' + (on ? 'checked' : '') + '> <span>' + lab + '</span></label>'; };
function dayOk(v) { return Number.isInteger(v) && v >= 1 && v <= 31; }
A.acts.cardedit = function (e, el) { var c = F.cardById(A.S, el.dataset.id); ui.edit = c.id;
  sheetForm('Editar cartão', 'cardSave', fld('cn', 'Nome', 'nome', c.nome) + '<div class="grid2">' + fld('cf', 'Dia do fechamento', 'fech', c.fech, 'inputmode="numeric"') + fld('cv', 'Dia do vencimento', 'venc', c.venc || '', 'inputmode="numeric" placeholder="a confirmar"') + '</div>' + fld('cp', 'Dia em que você paga', 'pag', c.pag || '', 'inputmode="numeric"') + chk('fechOk', 'Fechamento confirmado', c.fechOk) + chk('ativo', 'Cartão ativo', c.ativo !== false));
};
A.acts.cardnew = function () { ui.edit = null; sheetForm('Novo cartão', 'cardSave', fld('cn', 'Nome', 'nome', '') + '<div class="grid2">' + fld('cf', 'Dia do fechamento', 'fech', '', 'inputmode="numeric"') + fld('cv', 'Dia do vencimento', 'venc', '', 'inputmode="numeric"') + '</div>' + fld('cp', 'Dia em que você paga', 'pag', '', 'inputmode="numeric"') + chk('fechOk', 'Fechamento confirmado', true) + chk('ativo', 'Cartão ativo', true)); };
A.inputs.cardSave = function (e, f) {
  var S = A.S, nome = f.nome.value.trim(), fe = parseInt(f.fech.value, 10), ve = f.venc.value.trim() ? parseInt(f.venc.value, 10) : null, pa = f.pag.value.trim() ? parseInt(f.pag.value, 10) : null, er = $('#serr');
  if (!nome) { er.textContent = 'Informe o nome.'; return; } if (!dayOk(fe)) { er.textContent = 'Fechamento: informe um dia de 1 a 31.'; return; }
  if ((ve != null && !dayOk(ve)) || (pa != null && !dayOk(pa))) { er.textContent = 'Dias de vencimento/pagamento devem ser de 1 a 31.'; return; }
  var c = ui.edit ? F.cardById(S, ui.edit) : { id: F.uid('c'), curto: nome }, mudou = ui.edit && c.fech !== fe;
  Object.assign(c, { nome: nome, fech: fe, venc: ve, pag: pa, fechOk: f.fechOk.checked, ativo: f.ativo.checked }); if (!ui.edit) S.cards.push(c);
  if (mudou) S.purchases.forEach(function (p) { if (p.cartao === c.id && !p.mf && p.st !== 'excluida' && p.cs !== 'confirmado') p.cs = F.calcCs(S, p); });
  F.addLog(S, 'ajuste', null, 'Cartão ' + nome + ': fecha dia ' + fe); A.save(); A.closeSheet(); A.toast('Cartão salvo. Faturas recalculadas.'); A.render();
};
A.acts.catedit = function (e, el) { var c = F.catById(A.S, el.dataset.id); ui.edit = c.id; sheetForm('Editar categoria', 'catSave', fld('kn', 'Nome', 'nome', c.nome) + '<div class="field"><label for="kt">Tipo</label><select id="kt" name="tipo"><option value="alimentacao"' + (c.tipo === 'alimentacao' ? ' selected' : '') + '>Alimentação (dentro do teto)</option><option value="outras"' + (c.tipo === 'outras' ? ' selected' : '') + '>Outras compras (dentro do teto)</option><option value="fora"' + (c.tipo === 'fora' ? ' selected' : '') + '>Fora do teto</option></select></div>' + chk('ativa', 'Categoria ativa', c.ativa !== false)); };
A.acts.catnew = function () { ui.edit = null; sheetForm('Nova categoria', 'catSave', fld('kn', 'Nome', 'nome', '') + '<div class="field"><label for="kt">Tipo</label><select id="kt" name="tipo"><option value="outras" selected>Outras compras (dentro do teto)</option><option value="alimentacao">Alimentação (dentro do teto)</option><option value="fora">Fora do teto</option></select></div>' + chk('ativa', 'Categoria ativa', true)); };
A.inputs.catSave = function (e, f) {
  var S = A.S, nome = f.nome.value.trim(); if (!nome) { $('#serr').textContent = 'Informe o nome.'; return; }
  if (S.categories.some(function (c) { return c.id !== ui.edit && c.nome.toLowerCase() === nome.toLowerCase(); })) { $('#serr').textContent = 'Já existe uma categoria com esse nome.'; return; }
  var c = ui.edit ? F.catById(S, ui.edit) : { id: F.uid('k') }; Object.assign(c, { nome: nome, tipo: f.tipo.value, ativa: f.ativa.checked }); if (!ui.edit) S.categories.push(c);
  F.addLog(S, 'ajuste', null, 'Categoria ' + nome + ' (' + c.tipo + ')'); A.save(); A.closeSheet(); A.toast('Categoria salva. O orçamento foi recalculado.'); A.render();
};
function incForm(c) { return fld('in', 'Nome', 'nome', c.nome || '') + fld('iv', 'Valor', 'valor', c.valor ? F.fmtIn(c.valor) : '', 'inputmode="decimal"') + '<div class="field"><label for="it">Frequência</label><select id="it" name="tipo"><option value="rec"' + (c.tipo !== 'uni' ? ' selected' : '') + '>Todo mês</option><option value="uni"' + (c.tipo === 'uni' ? ' selected' : '') + '>Uma vez só</option></select></div><div class="grid2">' + fld('id', 'Dia do mês (se mensal)', 'dia', c.dia || '', 'inputmode="numeric"') + '<div class="field"><label for="idt">Data (se única)</label><input id="idt" name="data" type="date" value="' + esc(c.data || '') + '"></div></div>'; }
A.acts.incedit = function (e, el) { var c = A.S.incomes.find(function (x) { return x.id === el.dataset.id; }); ui.edit = c.id; sheetForm('Editar receita', 'incSave', incForm(c), '<button type="button" class="btn danger block" data-act="incdel">Excluir receita</button>'); };
A.acts.incnew = function () { ui.edit = null; sheetForm('Nova receita', 'incSave', incForm({})); };
A.inputs.incSave = function (e, f) {
  var S = A.S, v = pm(f.valor.value), tipo = f.tipo.value, dia = parseInt(f.dia.value, 10), nome = f.nome.value.trim(), er = $('#serr');
  if (!nome) { er.textContent = 'Informe o nome.'; return; } if (isNaN(v) || v <= 0) { er.textContent = 'Informe um valor maior que zero.'; return; }
  if (tipo === 'rec' && !dayOk(dia)) { er.textContent = 'Informe o dia do mês (1 a 31).'; return; } if (tipo === 'uni' && !F.isoOk(f.data.value)) { er.textContent = 'Informe a data.'; return; }
  var c = ui.edit ? S.incomes.find(function (x) { return x.id === ui.edit; }) : { id: F.uid('i') }; Object.assign(c, { nome: nome, valor: v, tipo: tipo }); if (tipo === 'rec') { c.dia = dia; delete c.data; } else { c.data = f.data.value; delete c.dia; } if (!ui.edit) S.incomes.push(c);
  F.addLog(S, 'ajuste', null, 'Receita ' + nome + ' ' + R(v)); A.save(); A.closeSheet(); A.render();
};
A.acts.incdel = async function () { A.closeSheet(); var S = A.S, c = S.incomes.find(function (x) { return x.id === ui.edit; }); if (c && await A.ask({ title: 'Excluir receita?', text: c.nome + ' será removida das projeções de caixa.', ok: 'Excluir', danger: true })) { S.incomes = S.incomes.filter(function (x) { return x !== c; }); F.addLog(S, 'ajuste', null, 'Receita removida: ' + c.nome); A.save(); A.render(); } };
function fixForm(c) { return fld('fn', 'Nome', 'nome', c.nome || '') + fld('fg', 'Grupo', 'grupo', c.grupo || '') + '<div class="grid2">' + fld('fv', 'Valor mensal', 'valor', c.valor ? F.fmtIn(c.valor) : '', 'inputmode="decimal"') + fld('fd', 'Dia do vencimento', 'dia', c.dia || 28, 'inputmode="numeric"') + '</div><div class="field"><label for="fs">Vale a partir de (opcional)</label><input id="fs" name="desde" type="date" value="' + esc(c.desde || '') + '"></div>' + chk('diaOk', 'Dia confirmado', c.diaOk) + chk('ativo', 'Ativa', c.ativo !== false); }
A.acts.fixedit = function (e, el) { var c = A.S.fixed.find(function (x) { return x.id === el.dataset.id; }); ui.edit = c.id; sheetForm('Editar despesa fixa', 'fixSave', fixForm(c), '<button type="button" class="btn danger block" data-act="fixdel">Excluir despesa</button>'); };
A.acts.fixnew = function () { ui.edit = null; sheetForm('Nova despesa fixa', 'fixSave', fixForm({})); };
A.inputs.fixSave = function (e, f) {
  var S = A.S, v = pm(f.valor.value), dia = parseInt(f.dia.value, 10), nome = f.nome.value.trim(), er = $('#serr');
  if (!nome) { er.textContent = 'Informe o nome.'; return; } if (isNaN(v) || v <= 0) { er.textContent = 'Informe um valor maior que zero.'; return; } if (!dayOk(dia)) { er.textContent = 'Dia de 1 a 31.'; return; }
  var c = ui.edit ? S.fixed.find(function (x) { return x.id === ui.edit; }) : { id: F.uid('f') }; Object.assign(c, { nome: nome, grupo: f.grupo.value.trim() || 'Outras', valor: v, dia: dia, desde: f.desde.value || null, diaOk: f.diaOk.checked, ativo: f.ativo.checked }); if (!ui.edit) S.fixed.push(c);
  F.addLog(S, 'ajuste', null, 'Despesa fixa ' + nome + ' ' + R(v)); A.save(); A.closeSheet(); A.render();
};
A.acts.fixdel = async function () { A.closeSheet(); var S = A.S, c = S.fixed.find(function (x) { return x.id === ui.edit; }); if (c && await A.ask({ title: 'Excluir despesa fixa?', text: c.nome + ' sai das projeções de caixa.', ok: 'Excluir', danger: true })) { S.fixed = S.fixed.filter(function (x) { return x !== c; }); F.addLog(S, 'ajuste', null, 'Fixa removida: ' + c.nome); A.save(); A.render(); } };
A.acts.resetseed = async function () {
  if (!(await A.ask({ title: 'Restaurar dados de exemplo?', html: 'Todos os lançamentos e ajustes atuais serão <b>substituídos</b> pelos dados iniciais. Exporte um backup antes se quiser guardar o que existe hoje.', ok: 'Restaurar', danger: true }))) return;
  await A.replaceState(window.SEED.seedState()); ui.draft = null; ui.editId = null; A.applyTheme(); A.toast('Dados iniciais restaurados.'); A.render();
};
A.acts.wipe = async function () {
  if (!(await A.ask({ title: 'Apagar tudo?', html: 'Isso remove <b>todos</b> os lançamentos, faturas, pagamentos, receitas e despesas fixas, e não pode ser desfeito. Exporte um backup antes.', ok: 'Apagar tudo', danger: true }))) return;
  var S = F.emptyState(); S.settings.inicio = F.hoje(); await A.replaceState(S); ui.draft = null; A.toast('Dados apagados.'); A.render();
};
})();
