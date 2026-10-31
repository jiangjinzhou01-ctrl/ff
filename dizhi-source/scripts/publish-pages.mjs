import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const target=path.resolve(root,'../hunan-dizhi-school');
const next=path.resolve(root,'../.hunan-dizhi-school-next');
if(path.basename(target)!=='hunan-dizhi-school'||!fs.existsSync(path.join(dist,'pagefind/pagefind.js'))) throw new Error('Verified build required.');
fs.rmSync(next,{recursive:true,force:true});
fs.mkdirSync(next,{recursive:true});
fs.cpSync(dist,next,{recursive:true});
// Only replace the generated school subtree, after the build and link checks succeed.
fs.rmSync(target,{recursive:true,force:true});
fs.renameSync(next,target);
console.log('Generated hunan-dizhi-school/ updated. No remote push or live deployment has been performed.');
