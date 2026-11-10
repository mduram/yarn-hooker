import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile('content/site.json','utf8'));
await writeFile('public/site-config.js','window.SITE_CONTENT = '+JSON.stringify(data)+';');
