import fs from 'node:fs';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const repository=path.resolve(source,'..');
const output=path.join(repository,'_site');
const dist=path.join(source,'dist');
if(!fs.existsSync(path.join(dist,'pagefind/pagefind.js'))) throw new Error('Run npm run build first.');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
const skip=new Set(['dizhi','dizhi-source','_site','node_modules','.git','.github','.dizhi-next','.dizhi-previous']);
for(const name of fs.readdirSync(repository)) {
  if(skip.has(name) || (name.startsWith('.') && name!=='.nojekyll' && name!=='.well-known')) continue;
  fs.cpSync(path.join(repository,name),path.join(output,name),{recursive:true});
}
fs.cpSync(dist,path.join(output,'dizhi'),{recursive:true});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log(`GitHub Pages artifact prepared at ${output}; school pages are inside dizhi/, repository root preserved.`);
