import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
await rm('pages-dist',{recursive:true,force:true});
await mkdir('pages-dist',{recursive:true});
await cp('public','pages-dist',{recursive:true});
let html=await readFile('public/storefront.html','utf8');
html=html.replaceAll('src="/','src="./').replaceAll('href="/','href="./');
await writeFile('pages-dist/index.html',html);
let catalog=await readFile('public/catalog.js','utf8');
await writeFile('pages-dist/catalog.js',catalog.replaceAll('"/assets/','"./assets/'));
await cp('CNAME','pages-dist/CNAME');
await writeFile('pages-dist/.nojekyll','');

const content=JSON.parse(await readFile('content/site.json','utf8'));
function relativeImages(o){for(const k of Object.keys(o)){if(typeof o[k]==='string'&&o[k].startsWith('/assets/'))o[k]='.'+o[k];else if(o[k]&&typeof o[k]==='object')relativeImages(o[k])}}
relativeImages(content);
await writeFile('pages-dist/site-config.js','window.SITE_CONTENT = '+JSON.stringify(content)+';');
