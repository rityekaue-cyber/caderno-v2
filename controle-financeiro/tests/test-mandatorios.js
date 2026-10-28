// 12 testes obrigatórios do PROMPT MESTRE, rodados no motor com estado limpo (teto 3.500 = 1.500 alim + 2.000 outras)
const F = require('../src/engine.js');
const assert = require('assert');
F.setHoje('2026-10-29');
let ok = 0, fail = 0;
const res = [];
function t(n, nome, fn) {
  try { fn(); ok++; res.push(['OK ', n, nome]); }
  catch (e) { fail++; res.push(['FALHOU', n, nome + ' → ' + e.message]); }
}
const KEY = '2026-10';
function novo() { const S = F.emptyState(); return S; }
function add(S, o) { const r = F.addPurchase(S, Object.assign({ data: '2026-10-29', tipo: 'avista' }, o)); assert(r.ok, JSON.stringify(r.errors)); return r.purchase; }

const S = novo();
let p1, p2;
t(1, 'Alimentação R$ 57,87 → saldo total R$ 3.442,13', () => {
  p1 = add(S, { desc: 'Alimentação', valor: 5787, cartao: 'bb', cat: 'alim' });
  const b = F.budget(S, KEY);
  assert.strictEqual(b.saldoTotal, 344213); assert.strictEqual(F.fmt(b.saldoTotal), 'R$ 3.442,13');
});
t(2, 'Outra alimentação R$ 100,00 → acumulado R$ 157,87, sem duplicar', () => {
  p2 = add(S, { desc: 'Mercado', valor: 10000, cartao: 'nu', cat: 'alim' });
  const b = F.budget(S, KEY);
  assert.strictEqual(b.gastoTotal, 15787); assert.strictEqual(b.gastoAlim, 15787);
  assert.strictEqual(S.purchases.filter(p => p.st !== 'excluida').length, 2);
  assert(F.findDup(S, { data: '2026-10-29', desc: 'Alimentação', valor: 5787, cartao: 'bb', tipo: 'avista' }), 'duplicidade deveria ser detectada');
});
t(3, 'Editar 100,00 → 80,00: total R$ 137,87 (mesmo registro)', () => {
  const r = F.editPurchase(S, p2.id, { data: '2026-10-29', desc: 'Mercado', valor: 8000, cartao: 'nu', cat: 'alim', tipo: 'avista' });
  assert(r.ok); const b = F.budget(S, KEY);
  assert.strictEqual(b.gastoTotal, 13787); assert.strictEqual(S.purchases.length, 2);
  assert(S.log.some(l => l.op === 'editar'));
});
t(4, 'R$ 2.000,00 em outras → categoria zera e saldo total reflete tudo', () => {
  add(S, { desc: 'Compras diversas', valor: 200000, cartao: 'nu', cat: 'outras' });
  const b = F.budget(S, KEY);
  assert.strictEqual(b.saldoOutras, 0); assert.strictEqual(b.sitOutras, 'limite');
  assert.strictEqual(b.saldoTotal, 350000 - 13787 - 200000);
  assert.strictEqual(b.saldoAlim, 150000 - 13787);
});
let pp;
t(5, '1.200,00 em 6x → teto reduzido uma única vez; calendário com 6 × R$ 200,00', () => {
  const antes = F.budget(S, KEY).saldoTotal;
  pp = add(S, { desc: 'Geladeira', valor: 120000, cartao: 'nu', cat: 'outras', tipo: 'parcelado', n: 6 });
  const b = F.budget(S, KEY);
  assert.strictEqual(antes - b.saldoTotal, 120000);
  const ps = F.parcelasDe(S, pp);
  assert.strictEqual(ps.length, 6); assert(ps.every(x => x.valor === 20000));
  assert.strictEqual(ps.reduce((a, x) => a + x.valor, 0), 120000);
  const cal = F.calendarioParcelas(S, '2026-11', 8);
  const meses = cal.meses.filter(m => m.novas === 20000);
  assert.strictEqual(meses.length, 6);
  const nov = F.budget(S, '2026-11'); // próximo ciclo não recebe novas parcelas como compra
  assert.strictEqual(nov.gastoTotal, 0);
});
t('5b', 'Resto de centavos vai para as primeiras parcelas (100,00 em 3x)', () => {
  const T = novo(); const p = add(T, { desc: 'X', valor: 10000, cartao: 'nu', cat: 'outras', tipo: 'parcelado', n: 3 });
  assert.deepStrictEqual(F.parcelasDe(T, p).map(x => x.valor), [3334, 3333, 3333]);
});
t(6, 'Excluir parcelada cancela parcelas futuras sem afetar outras compras', () => {
  const outras = F.budget(S, KEY).gastoTotal - 120000;
  const r = F.deletePurchase(S, pp.id);
  assert(r.ok); assert.strictEqual(r.parcelasCanceladas, 6);
  assert.strictEqual(F.parcelasDe(S, pp).length, 0);
  assert.strictEqual(F.budget(S, KEY).gastoTotal, outras);
  const cal = F.calendarioParcelas(S, '2026-11', 8);
  assert(cal.meses.every(m => m.total === 0));
  assert.strictEqual(F.restorePurchase(S, pp.id).ok, true); // reversível
  assert.strictEqual(F.parcelasDe(S, pp).length, 6);
  F.deletePurchase(S, pp.id);
});
t(7, 'Parcela antiga R$ 200,00: entra na projeção da fatura, não nas compras novas', () => {
  const antes = F.budget(S, KEY).gastoTotal;
  const novasAntes = F.invResumo(S, 'bb', '2026-11').comprasNovas;
  const pa = add(S, { data: '2026-08-10', desc: 'Parcela antiga', cartao: 'bb', cat: 'outras', tipo: 'parcelado', n: 5, k: 3, vp: 20000 });
  assert(F.isAntiga(S, pa));
  assert.strictEqual(F.budget(S, KEY).gastoTotal, antes);
  const ps = F.parcelasDe(S, pa); assert.strictEqual(ps.length, 3);
  const r = F.invResumo(S, 'bb', '2026-11');
  assert(r.parcAntigas >= 20000, 'parcela antiga deve estar na fatura');
  assert.strictEqual(r.comprasNovas, novasAntes, 'parcela antiga não é compra nova na fatura');
  assert(F.invItems(S, 'bb', '2026-11').some(i => i.p.id === pa.id && i.cls === 'antiga'));
});
t(8, 'Pagamento parcial: saldo da fatura cai, compras novas não mudam', () => {
  const k = F.mesFatura(S, p1);
  const antesB = F.budget(S, KEY).gastoTotal;
  const r0 = F.invResumo(S, 'bb', k);
  const pg = F.addPayment(S, { cartao: 'bb', mes: k, data: '2026-10-29', valor: 2000 });
  assert(pg.ok);
  const r1 = F.invResumo(S, 'bb', k);
  assert.strictEqual(r0.saldo - r1.saldo, 2000); assert.strictEqual(r1.status, 'Parcialmente paga');
  assert.strictEqual(F.budget(S, KEY).gastoTotal, antesB);
  assert.strictEqual(F.addPayment(S, { cartao: 'bb', mes: k, data: '2026-10-29', valor: 0 }).ok, false);
});
t(9, 'Sem cartão: compra preservada, cartão não atribuído, pendência sinalizada', () => {
  const p = add(S, { desc: 'Padaria', valor: 1500, cartao: null, cat: 'alim' });
  assert.strictEqual(p.cartao, null); assert.strictEqual(p.cs, 'pendente');
  assert(S.purchases.some(x => x.id === p.id));
  const pn = F.painel(S, KEY);
  assert(pn.semCartao.some(x => x.id === p.id));
  assert(pn.alertas.some(a => /sem cartão/.test(a.t)));
});
t(10, 'Estourar teto: saldo negativo + alerta, orçamento não aumenta', () => {
  const T = novo();
  add(T, { desc: 'TV', valor: 360000, cartao: 'nu', cat: 'outras' });
  const b = F.budget(T, KEY);
  assert.strictEqual(b.saldoTotal, -10000); assert.strictEqual(b.sit, 'ultrapassado');
  assert.strictEqual(b.efT, 350000); assert.strictEqual(F.fmt(b.saldoTotal), '−R$ 100,00');
  assert(F.painel(T, KEY).alertas.some(a => /ultrapassado/.test(a.t)));
});
t(11, 'Persistência: salvar → recarregar mantém tudo (docs e backup JSON)', () => {
  const docs = JSON.parse(JSON.stringify(F.toDocs(S)));
  const R = F.fromDocs(docs);
  assert.strictEqual(R.purchases.length, S.purchases.length);
  assert.strictEqual(F.budget(R, KEY).saldoTotal, F.budget(S, KEY).saldoTotal);
  const R2 = F.deserialize(F.serialize(S));
  assert.strictEqual(F.budget(R2, KEY).saldoTotal, F.budget(S, KEY).saldoTotal);
  assert.strictEqual(R2.payments.length, S.payments.length);
  assert.throws(() => F.deserialize('{"x":1}'));
});
t(12, 'Total por cartão = total por categoria (pendentes aparecem como não classificado)', () => {
  add(S, { desc: 'Coisa sem categoria', valor: 4321, cartao: 'nu', cat: null });
  const r = F.reconcile(S, KEY);
  assert(r.ok); assert.strictEqual(r.totalCartao, r.totalCat);
  assert.strictEqual(r.porCat._nc, 4321 + 1500 * 0); // 'Padaria' tem categoria; sem cartão cai em _nenhum
  assert(r.porCartao._nenhum >= 1500);
  assert.strictEqual(Object.values(r.porCartao).reduce((a, b) => a + b, 0), Object.values(r.porCat).reduce((a, b) => a + b, 0));
});

// extras de precisão
t('x1', 'parseMoney / fmt', () => {
  assert.strictEqual(F.parseMoney('1.234,56'), 123456); assert.strictEqual(F.parseMoney('57,87'), 5787);
  assert.strictEqual(F.parseMoney('1234.5'), 123450); assert.strictEqual(F.parseMoney('1.000'), 100000);
  assert(isNaN(F.parseMoney('12,345'))); assert(isNaN(F.parseMoney('')));
  assert.strictEqual(F.fmt(0), 'R$ 0,00'); assert.strictEqual(F.fmt(5), 'R$ 0,05');
});
t('x2', 'Ciclo 28→27 e compra no dia do fechamento vai para a próxima fatura', () => {
  assert.strictEqual(F.cycleKey('2026-10-27', 28), '2026-09'); assert.strictEqual(F.cycleKey('2026-10-28', 28), '2026-10');
  assert.strictEqual(F.cycleKey('2027-01-05', 28), '2026-12');
  const nu = F.cardById(S, 'nu');
  assert.strictEqual(F.invoiceMonth(nu, '2026-10-20'), '2026-10'); assert.strictEqual(F.invoiceMonth(nu, '2026-10-21'), '2026-11');
});
t('x3', 'Excesso do ciclo é descontado do mesmo grupo no ciclo seguinte', () => {
  const T = novo(); add(T, { data: '2026-10-29', desc: 'Mercado', valor: 170000, cartao: 'nu', cat: 'alim' }); // 200,00 acima
  const b = F.budget(T, '2026-11');
  assert.strictEqual(b.carry.a, 20000); assert.strictEqual(b.efA, 130000); assert.strictEqual(b.efT, 330000);
  assert.strictEqual(F.budget(T, '2026-10').saldoTotal, 350000 - 170000);
  const T2 = novo(); // sobra zera
  add(T2, { desc: 'Mercado', valor: 10000, cartao: 'nu', cat: 'alim' });
  assert.strictEqual(F.budget(T2, '2026-11').efT, 350000);
});
t('x4', 'Simulador não grava nada e avisa estouro', () => {
  const T = novo(); const n = T.purchases.length;
  const r = F.simular(T, { data: '2026-10-29', valor: 400000, cat: 'outras', tipo: 'avista', cartao: 'nu' });
  assert.strictEqual(T.purchases.length, n); assert.strictEqual(r.reco, 'estoura_teto');
  assert.strictEqual(F.budget(T, KEY).gastoTotal, 0);
  const q = F.simular(T, { data: '2026-10-29', valor: 120000, cat: 'outras', tipo: 'parcelado', n: 6, cartao: 'nu' });
  assert.strictEqual(q.parcelas.length, 6); assert.strictEqual(q.depois.gastoTotal, 120000);
});
t('x5', 'Fora do teto não consome orçamento; anteriores ao marco zero também não', () => {
  const T = novo(); T.categories.push({ id: 'alug', nome: 'Aluguel', tipo: 'fora', ativa: true });
  add(T, { desc: 'Aluguel', valor: 102760, cartao: 'ml', cat: 'alug' });
  add(T, { data: '2026-10-25', desc: 'Antes', valor: 50000, cartao: 'nu', cat: 'outras' });
  const b = F.budget(T, KEY); assert.strictEqual(b.gastoTotal, 0); assert.strictEqual(b.fora, 102760);
  assert.strictEqual(F.invResumo(T, 'nu', '2026-11').anteriores, 50000);
});
t('x6', 'Validações', () => {
  assert(!F.addPurchase(S, { data: '2026-10-29', desc: 'x', valor: -5, tipo: 'avista' }).ok);
  assert(!F.addPurchase(S, { data: '2026-02-30', desc: 'x', valor: 5, tipo: 'avista' }).ok);
  assert(!F.addPurchase(S, { data: '2026-10-29', desc: '', valor: 5, tipo: 'avista' }).ok);
  assert(!F.addPurchase(S, { data: '2026-10-29', desc: 'x', valor: 5000, tipo: 'parcelado', n: 1 }).ok);
});

res.forEach(r => console.log(r.join(' | ')));
console.log(`\n${ok} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
