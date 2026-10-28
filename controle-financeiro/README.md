# Meu Controle Financeiro

App pessoal de controle de gastos em HTML + JavaScript puro (sem dependências).
Teto por ciclo (dia 28 a 27), cartões, faturas, parcelas, relatórios, simulador e caixa.

## Estrutura
- `src/engine.js` — motor de cálculo (tudo em centavos, sem interface)
- `src/ui1..4.js`, `src/style.css` — interface
- `src/seed.demo.js` — estado inicial **vazio** (sem dados pessoais)
- `tests/test-mandatorios.js` — os 12 testes obrigatórios + verificações extras
- `build.js` — junta tudo em um único arquivo HTML
- `docs/index.html` — versão de demonstração pronta (GitHub Pages)

## Comandos
```
npm run build   # gera docs/index.html
npm test        # roda os testes do motor de cálculo
```

## Privacidade (importante)
Seus dados reais **nunca** devem ir para o repositório.
- Seus dados vivem no app (banco do Claude ou `localStorage` do navegador) e no backup JSON que você exporta em *Ajustes > Exportar backup*.
- `.gitignore` já bloqueia `seed.private.js`, `private/`, backups `.json` e `.csv`.
- Para abrir o app com seus dados no computador: importe o backup em *Ajustes > Importar backup*.

## Limites da versão fora do Claude
Sem o banco do Claude, os dados ficam só no navegador daquele aparelho (não sincronizam entre celular e computador). Use o backup JSON para levar os dados de um lugar para outro.
