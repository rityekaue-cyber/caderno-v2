// Gera o app em um único arquivo HTML.
//  - sem src/seed.private.js  -> docs/index.html  (demonstração, sem dados pessoais; pode ir ao GitHub)
//  - com src/seed.private.js  -> private/app.html (seus dados; fica só no seu computador)
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const priv = fs.existsSync(path.join(__dirname, 'src', 'seed.private.js'));
const files = ['engine.js', priv ? 'seed.private.js' : 'seed.demo.js', 'ui1.js', 'ui2.js', 'ui3.js', 'ui4.js'];
const js = files.map(src).join('\n;\n');
if (/<\/script/i.test(js)) throw new Error('js contém </script');
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Meu Controle Financeiro</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap">
<style>:root{padding-top:env(safe-area-inset-top,0px)}body{margin:0}
${src('style.css')}
</style></head><body>
<div id="app"></div><div id="modal" hidden></div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<noscript>Este aplicativo precisa de JavaScript.</noscript>
<script>
${js}
</script></body></html>
`;
const out = priv ? 'private/app.html' : 'docs/index.html';
fs.mkdirSync(path.dirname(path.join(__dirname, out)), { recursive: true });
fs.writeFileSync(path.join(__dirname, out), html);
console.log(out, (html.length / 1024).toFixed(1) + ' KB', priv ? '(com seus dados — NÃO envie ao GitHub)' : '(demonstração)');
