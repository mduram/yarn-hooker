import { env } from 'cloudflare:workers';
const REPO='mduram/yarn-hooker';
type OwnerEnv=typeof env & {OWNER_USERNAME?:string;OWNER_PASSWORD_HASH?:string;OWNER_GITHUB_TOKEN?:string;OWNER_SETUP_KEY?:string;OWNER_ENCRYPTION_KEY?:string};
const baseEnv=env as OwnerEnv;
async function ownerEnv():Promise<OwnerEnv>{const row:any=await baseEnv.DB?.prepare('SELECT * FROM owner_settings WHERE id=1').first();if(!row)return baseEnv;const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(baseEnv.OWNER_ENCRYPTION_KEY!),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']);const payload=JSON.parse(row.encrypted_token);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(payload.iv),c=>c.charCodeAt(0))},key,Uint8Array.from(atob(payload.data),c=>c.charCodeAt(0)));return {...baseEnv,OWNER_USERNAME:row.username,OWNER_PASSWORD_HASH:row.password_hash,OWNER_GITHUB_TOKEN:new TextDecoder().decode(bytes)}}
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
async function verify(password:string,e:OwnerEnv){const parts=e.OWNER_PASSWORD_HASH!.split(':');if(parts.length!==2)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(parts[0]),iterations:100000,hash:'SHA-256'},key,256);const hex=Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');let diff=hex.length^parts[1].length;for(let i=0;i<hex.length;i++)diff|=hex.charCodeAt(i)^(parts[1].charCodeAt(i)||0);return diff===0}
async function session(request:Request,e:OwnerEnv){const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token||token.length>150)return false;return !!await e.DB!.prepare('SELECT token_hash FROM owner_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first()}
async function gh(e:OwnerEnv,path:string,method='GET',body?:unknown){const r=await fetch(`https://api.github.com/repos/${REPO}/${path}`,{method,headers:{Authorization:`Bearer ${e.OWNER_GITHUB_TOKEN}`,'User-Agent':'Yarn-Hooker-Owner','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error(r.status===409||r.status===422?'CONFLICT':`GITHUB_${r.status}`);return r.json() as Promise<any>}
function validate(c:any){
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Invalid content');
 const str=(v:any,max=500)=>{if(typeof v!=='string'||v.length>max)throw Error('Text too long or missing')};
 const image=(s:any)=>{str(s,2000);if(!/^\/assets\/[a-zA-Z0-9_.\/-]+$/.test(s)||s.includes('..'))throw Error('Choose an image from the media library')};
 const colors=['cream','red','ink','line','customBackground'];for(const k of colors)if(!/^#[0-9a-f]{6}$/i.test(c.theme?.[k]))throw Error('Invalid color');
 if(!c.text||Object.keys(c.text).length>30)throw Error('Invalid text');for(const v of Object.values(c.text))str(v,2000);
 const u=new URL(c.instagram);if(u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname))throw Error('Use an Instagram profile URL');
 for(const k of ['makerImage','logo','fullLogo'])image(c[k]);
 if(!Array.isArray(c.slides)||c.slides.length<1||c.slides.length>10)throw Error('Use 1–10 slideshow photos');for(const s of c.slides){image(s.src);str(s.alt,300)}
 const ids=new Set(['hero','shop','lookbook','studio','custom','faq']);if(!Array.isArray(c.sections)||c.sections.length!==6)throw Error('Invalid sections');for(const s of c.sections){if(!ids.delete(s.id)||typeof s.visible!=='boolean')throw Error('Invalid section')}
 if(!Array.isArray(c.products)||c.products.length>150)throw Error('Maximum 150 products');const seen=new Set();for(const p of c.products){if(!/^[a-z0-9-]{1,80}$/.test(p.id)||seen.has(p.id))throw Error('Product IDs must be unique');seen.add(p.id);str(p.title,160);str(p.description,3000);str(p.category,80);if(p.hidden!==undefined&&typeof p.hidden!=='boolean')throw Error('Invalid visibility');if(!Array.isArray(p.images)||p.images.length<1||p.images.length>12)throw Error('Use 1–12 photos per product');p.images.forEach(image);if(p.imageLabels){if(!Array.isArray(p.imageLabels)||p.imageLabels.length!==p.images.length)throw Error('Each photo needs a label');p.imageLabels.forEach((s:any)=>str(s,160))}}
 // Keep content data-only; scripts, paths, and deployment settings are not editable.
 return JSON.parse(JSON.stringify(c));
}
export async function GET(request:Request){
 let e:OwnerEnv;try{e=await ownerEnv()}catch{return respond({error:"The editor could not open its secure settings."},503)}
 if(!e.DB||!e.OWNER_PASSWORD_HASH||!e.OWNER_GITHUB_TOKEN)return respond({setupRequired:true,error:'Owner access needs one-time secure setup.'},503);
 if(!await session(request,e))return respond({error:'Please sign in.'},401);
 try{const ref=await gh(e,'git/ref/heads/main');const f=await gh(e,'contents/content/site.json?ref='+ref.object.sha);const bytes=Uint8Array.from(atob(f.content.replace(/\n/g,'')),c=>c.charCodeAt(0));return respond({content:JSON.parse(new TextDecoder().decode(bytes)),revision:ref.object.sha})}catch{return respond({error:'Could not read the repository. Check the editor connection.'},502)}
}
export async function POST(request:Request){
 const origin=new URL(request.url).origin;
 if(request.headers.get("origin")!==origin)return respond({error:"Invalid origin."},403);
 if(new URL(request.url).searchParams.get("setup")=== "1")return setup(request);
 let e:OwnerEnv;try{e=await ownerEnv()}catch{return respond({error:"The editor could not open its secure settings."},503)}
 if(request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Invalid origin.'},403);
 if(!e.DB||!e.OWNER_PASSWORD_HASH||!e.OWNER_GITHUB_TOKEN)return respond({setupRequired:true,error:'Owner access needs one-time secure setup.'},503);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return respond({error:'JSON required'},415);
 if(Number(request.headers.get('content-length')||0)>12000000)return respond({error:'Upload too large'},413);
 let b:any;try{const raw=await request.text();if(raw.length>12000000)return respond({error:'Upload too large'},413);b=JSON.parse(raw)}catch{return respond({error:'Invalid request'},400)}
 if(b.action==='login'){
 const key=await hash(request.headers.get('CF-Connecting-IP')||'unknown');const now=Date.now();
 await e.DB.prepare('INSERT INTO owner_attempts (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END').bind(key,now,now-900000,now-900000,now).run();
 const row:any=await e.DB.prepare('SELECT attempts FROM owner_attempts WHERE key=?').bind(key).first();if(row.attempts>10)return respond({error:'Too many attempts. Try again in 15 minutes.'},429);
 if(typeof b.password!=='string'||b.password.length>256||!await verify(b.password,e)||b.username!==(e.OWNER_USERNAME||'remy'))return respond({error:'Incorrect username or password.'},401);
 const token=crypto.randomUUID()+crypto.randomUUID();await e.DB.prepare('DELETE FROM owner_sessions WHERE expires_at<?').bind(now).run();await e.DB.prepare('INSERT INTO owner_sessions (token_hash,expires_at) VALUES (?,?)').bind(await hash(token),now+14400000).run();return respond({token});
 }
 if(!await session(request,e))return respond({error:'Your session expired. Sign in again.'},401);
 if(b.action==='logout'){await e.DB.prepare('DELETE FROM owner_sessions WHERE token_hash=?').bind(await hash(request.headers.get('Authorization')!.slice(7))).run();return respond({ok:true})}
 if(b.action!=='publish')return respond({error:'Unknown action'},400);
 let content:any;try{content=validate(b.content)}catch(err){return respond({error:(err as Error).message},400)}
 try{
 const ref=await gh(e,'git/ref/heads/main');if(ref.object.sha!==b.revision)return respond({error:'Someone changed the repo since you opened the editor. Reload before publishing; your draft is still on screen.'},409);
 const commit=await gh(e,`git/commits/${ref.object.sha}`);const tree:any[]=[{path:'content/site.json',mode:'100644',type:'blob',content:JSON.stringify(content,null,2)+'\n'}];
 if(!Array.isArray(b.uploads)||b.uploads.length>10)return respond({error:'Too many uploads'},400);
 for(const u of b.uploads){if(!/^public\/assets\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(u.path)||typeof u.data!=='string'||u.data.length>5600000)return respond({error:'Invalid photo upload'},400);const bytes=Uint8Array.from(atob(u.data),c=>c.charCodeAt(0));const ext=u.path.split('.').pop();const valid=ext==='jpg'?bytes[0]===255&&bytes[1]===216:ext==='png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===82&&bytes[1]===73&&bytes[8]===87&&bytes[9]===69;if(!valid)return respond({error:'Unsupported image data'},400);const blob=await gh(e,'git/blobs','POST',{content:u.data,encoding:'base64'});tree.push({path:u.path,mode:'100644',type:'blob',sha:blob.sha})}
 const newTree=await gh(e,'git/trees','POST',{base_tree:commit.tree.sha,tree});const next=await gh(e,'git/commits','POST',{message:'Update website from owner editor',tree:newTree.sha,parents:[ref.object.sha]});await gh(e,'git/refs/heads/main','PATCH',{sha:next.sha,force:false});return respond({revision:next.sha,url:`https://github.com/${REPO}/commit/${next.sha}`,site:'https://yarnhooker.com',message:'Saved to GitHub. The website will update when deployment finishes.'});
 }catch(err){return respond({error:(err as Error).message==='CONFLICT'?'The repo changed during publishing. Reload before trying again.':'Publishing failed. Your draft is still here. Check the GitHub connection and try again.'},(err as Error).message==='CONFLICT'?409:502)}
}

async function setup(request:Request){
 const e=baseEnv;if(!e.DB||!e.OWNER_SETUP_KEY||!e.OWNER_ENCRYPTION_KEY)return respond({error:'Secure setup is not configured.'},503);
 if(await e.DB.prepare('SELECT id FROM owner_settings WHERE id=1').first())return respond({error:'Setup is already complete.'},409);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return respond({error:'JSON required'},415);
 const raw=await request.text();if(raw.length>3000)return respond({error:'Request too large'},413);
 let b:any;try{b=JSON.parse(raw)}catch{return respond({error:'Invalid request'},400)}
 if(typeof b.key!=='string'||await hash(b.key)!==await hash(e.OWNER_SETUP_KEY))return respond({error:'Invalid setup link.'},403);
 if(b.username!=='remy'||typeof b.password!=='string'||b.password.length<14||b.password.length>128||typeof b.githubToken!=='string'||!/^github_pat_[A-Za-z0-9_]+$/.test(b.githubToken))return respond({error:'Use username remy, a password of 14–128 characters, and a fine-grained GitHub token.'},400);
 try{
 const check=await fetch('https://api.github.com/repos/'+REPO,{headers:{Authorization:'Bearer '+b.githubToken,'User-Agent':'Yarn-Hooker-Owner','Accept':'application/vnd.github+json'}});if(!check.ok)return respond({error:'GitHub could not verify this token. Limit it to the Yarn Hooker repo with Contents read/write permission.'},400);
 const salt=crypto.randomUUID();const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(b.password),'PBKDF2',false,['deriveBits']);const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);const passwordHash=salt+':'+Array.from(new Uint8Array(derived),v=>v.toString(16).padStart(2,'0')).join('');
 const encryptionKey=await crypto.subtle.importKey('raw',Uint8Array.from(atob(e.OWNER_ENCRYPTION_KEY),c=>c.charCodeAt(0)),'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},encryptionKey,new TextEncoder().encode(b.githubToken));const encoded=JSON.stringify({iv:btoa(String.fromCharCode(...iv)),data:btoa(String.fromCharCode(...new Uint8Array(encrypted)))});
 await e.DB.prepare('INSERT INTO owner_settings (id,username,password_hash,encrypted_token) VALUES (1,?,?,?)').bind(b.username,passwordHash,encoded).run();return respond({ok:true});
 }catch{return respond({error:'Setup could not be saved. Please try again.'},503)}
}
