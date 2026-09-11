// Headless runner for the theory self-test: node tests/check-node.mjs
// Runs src/theory.js and tests/check.js in a bare context with a tiny window/document shim.
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const theory=read('../src/theory.js');
// the engine defines the drum kits the check reads; nothing in it touches audio until init() is called
const engine=read('../src/engine.js');
// the demo songs the check reads: data plus the builder that turns one into a project snapshot
const demos=read('../src/demos.js');
const check=read('./check.js');

const window={};
const context={window,document:{body:null,addEventListener(){}},performance,console};
window.window=window;
vm.createContext(context);
vm.runInContext(theory,context,{filename:'src/theory.js'});
vm.runInContext(engine,context,{filename:'src/engine.js'});
vm.runInContext(demos,context,{filename:'src/demos.js'});
vm.runInContext(check,context,{filename:'tests/check.js'});

const r=window.ZINTH_CHECK;
if(!r){console.error('theory check did not produce a result');process.exit(2)}
console.log(`${r.tracks} generated tracks checked in ${r.ms} ms: ${r.fails?r.fails+' FAILURES':'all checks pass'}`);
if(r.fails){console.log(r.results.slice(0,40).join('\n'));process.exit(1)}
