import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(!fs.existsSync(path.join(root,'../.git'))){
 console.error('Run this command from dizhi-source/ inside the ff repository.');
 process.exit(1);
}
for(const script of ['build.mjs','check.mjs']){
 const result=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,env:{...process.env,DIZHI_OUTPUT_DIR:'../dizhi'},stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('The dizhi/ site is ready. Commit and push the repository to update GitHub Pages.');
