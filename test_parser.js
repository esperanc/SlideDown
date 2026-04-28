const fs = require('fs');
const code = fs.readFileSync('lib/parser.js', 'utf8');
eval(code);
const p = new ScrollyParser();
console.log(JSON.stringify(p._parseParams('src="img.png" height=80%')));
