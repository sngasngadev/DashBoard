'use strict';
const fs=require('node:fs');
const path=require('node:path');
const source=path.resolve(__dirname,'..','dist');
const dest=path.join(__dirname,'renderer');
if(!fs.existsSync(path.join(source,'index.html')))throw new Error('Run npm run build in repository root first');
fs.rmSync(dest,{recursive:true,force:true});
fs.cpSync(source,dest,{recursive:true});
console.log('Renderer prepared at '+dest);
