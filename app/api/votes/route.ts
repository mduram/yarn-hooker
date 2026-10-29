import { env } from 'cloudflare:workers';
import catalogText from '../../../public/catalog.js?raw';
const allowed = new Set(Array.from(catalogText.matchAll(/"id":\s*"([^"]+)"/g),m=>m[1]));
const cookieName='yh_visitor';
const json=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
function visitor(request:Request) { const value=request.headers.get('cookie')?.match(/(?:^|;\s*)yh_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];return value; }
async function snapshot(id:string) {
 const db=env.DB!;
 const [counts,own]=await Promise.all([db.prepare('SELECT product_id,COUNT(*) AS count FROM votes GROUP BY product_id').all(),db.prepare('SELECT product_id FROM votes WHERE visitor_id=?').bind(id).all()]);
 return {counts:Object.fromEntries(counts.results.map((r:any)=>[r.product_id,r.count])),liked:own.results.map((r:any)=>r.product_id)};
}
export async function GET(request:Request) {
 if(!env.DB)return json({error:'Votes are temporarily unavailable.'},503);
 const existing=visitor(request),id=existing||crypto.randomUUID();
 const cookie=existing?undefined:`${cookieName}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`;
 try{return json(await snapshot(id),200,cookie)}catch{return json({error:'Votes are temporarily unavailable.'},503)}
}
export async function POST(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
 if(Number(request.headers.get('content-length')||0)>1024)return json({error:'Request too large'},413);
 const id=visitor(request);if(!id)return json({error:'Please reload before voting.'},400);
 if(!env.DB)return json({error:'Votes are temporarily unavailable.'},503);
 try{
 const raw=await request.text();if(raw.length>1024)return json({error:'Request too large'},413);
 const {productId,liked}=JSON.parse(raw);if(!allowed.has(productId)||typeof liked!=='boolean')return json({error:'Unknown item'},400);
 if(liked)await env.DB.prepare('INSERT OR IGNORE INTO votes (product_id,visitor_id,created_at) VALUES (?,?,?)').bind(productId,id,Date.now()).run();
 else await env.DB.prepare('DELETE FROM votes WHERE product_id=? AND visitor_id=?').bind(productId,id).run();
 return json(await snapshot(id));
 }catch{return json({error:'Could not save your vote. Please try again.'},503)}
}
