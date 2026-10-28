/* Dados iniciais reais (conferidos em centavos). Usa o motor FIN. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.SEED = factory(root.FIN);
}(typeof self !== 'undefined' ? self : this, function (F) {
'use strict';

function seedState() {
  var S = F.emptyState();
  S.settings = Object.assign(F.defaultSettings(), { inicio: '2026-10-28', teto: 350000, orcAlim: 150000, orcOutras: 200000, caixa28: true, limiteAnt: null });
  /* ---- cartões ---- */
  S.cards = [
    { id: 'bb', nome: 'Banco do Brasil', curto: 'BB', fech: 17, fechOk: false, venc: 28, pag: 28, ativo: true, obs: '' },
    { id: 'nu', nome: 'Nubank', curto: 'Nubank', fech: 21, fechOk: true, venc: 28, pag: 28, ativo: true },
    { id: 'ml', nome: 'Mercado Livre', curto: 'Mercado Livre', fech: 29, fechOk: true, venc: null, pag: 28, ativo: true }
  ];

  /* ---- categorias ---- */
  var C = function (id, nome, tipo, ativa) { return { id: id, nome: nome, tipo: tipo, ativa: ativa !== false }; };
  S.categories = [
    C('alim', 'Alimentação e supermercado', 'alimentacao'),
    C('lazer', 'Lazer e diversão', 'outras'),
    C('estudos', 'Estudos e concursos', 'outras'),
    C('utens', 'Utensílios e móveis para casa', 'outras'),
    C('saude', 'Saúde e farmácia', 'outras'),
    C('transp', 'Transporte', 'outras'),
    C('vest', 'Vestuário', 'outras'),
    C('serv', 'Serviços e assinaturas', 'outras'),
    C('diver', 'Compras diversas', 'outras'),
    C('outras', 'Outras', 'outras'),
    C('aluguel', 'Despesa com aluguel', 'fora'),
    C('pix', 'Pix e encargos', 'fora'),
    C('moradia', 'Moradia', 'outras', false),
    C('casa', 'Casa e manutenção', 'outras', false),
    C('filho', 'Filho e educação', 'outras', false)
  ];

  S.log = [{ t: Date.now(), op: 'seed', id: null, d: 'Versão de demonstração: sem lançamentos. Importe seu backup em Ajustes.' }];
  return S;
}
return { seedState: seedState };
}));
