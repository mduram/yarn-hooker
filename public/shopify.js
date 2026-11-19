(function(root){
const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function normalize(p,catalog={categories:[]}){
 const terms=[p.productType,...(p.tags||[]),p.title,p.handle].join(' ');
 const explicit=(catalog.categories||[]).find(c=>[p.productType,...(p.tags||[])].some(t=>normal(t)===normal(c.name)));
 const printed=/print|linocut|woodcut|poster|nautical.*tee/i.test(terms);
 const category=explicit?.name||(printed?'Prints':/bag|tote/i.test(terms)?'Bags':/hat|scarf|hood|beanie/i.test(terms)?'Hats & scarves':/blanket|home/i.test(terms)?'Home':'Clothing');
 const variants=p.variants.nodes;const available=variants.filter(v=>v.availableForSale);const first=available[0]||variants[0];
 const counts=available.map(v=>v.currentlyNotInStock?null:v.quantityAvailable);
 const inventory=!available.length?0:counts.every(Number.isInteger)?counts.reduce((a,b)=>a+b,0):null;
 const sizes=[...new Set(variants.flatMap(v=>(v.selectedOptions||[]).filter(o=>/size/i.test(o.name)).map(o=>o.value)))].join(', ');
 const prices=variants.map(v=>Number(v.price.amount));
 return {id:p.id,handle:p.handle,title:p.title,description:p.description,category,collection:explicit?.collection||(printed?'Prints':'Crochet'),images:p.images.nodes.map(i=>i.url),imageLabels:p.images.nodes.map((i,n)=>i.altText||`View ${n+1}`),variants,price:String(Math.min(...prices)),currency:first.price.currencyCode,priceVaries:new Set(prices).size>1,sizes,inventory,availableForSale:available.length>0};
}
const inventoryError=e=>e.extensions?.code==='ACCESS_DENIED'&&e.path?.at(-1)==='quantityAvailable';
function unwrap(j){const errors=(j.errors||[]).filter(e=>!inventoryError(e));if(errors.length||!j.data)throw Error(errors[0]?.message||'The shop could not complete this request.');return j.data}
function variantRow(row,products){const p=products.find(p=>p.id===row.productId),v=p?.variants.find(v=>v.id===row.variant);return {...row,title:p?.title||row.title,image:v?.image?.url||p?.images[0]||row.image,price:v?.price.amount??row.price,currency:v?.price.currencyCode||row.currency,size:v&&v.title!=='Default Title'?v.title:'',unavailable:!v?.availableForSale,limit:v&&!v.currentlyNotInStock&&Number.isInteger(v.quantityAvailable)?v.quantityAvailable:null}}
function checkoutLines(rows){if(!rows.length||rows.some(r=>r.unavailable||!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(r.variant)))throw Error('A piece in your bag is no longer available. Remove it before continuing.');if(rows.some(r=>r.limit!==null&&r.quantity>r.limit))throw Error('A quantity in your bag exceeds current stock. Reduce it before continuing.');return rows.map(x=>({merchandiseId:x.variant,quantity:x.quantity}))}
function stockAdjustments(rows,accepted){
 const totals=accepted?new Map():null;
 if(totals)for(const line of accepted){const id=line.merchandise?.id;if(id&&Number.isInteger(line.quantity)&&line.quantity>=0)totals.set(id,(totals.get(id)||0)+line.quantity)}
 return rows.flatMap(row=>{const max=totals?totals.get(row.variant)||0:row.limit;if(!Number.isInteger(max)||max<0||row.quantity<=max)return [];if(totals)totals.set(row.variant,Math.max(0,max-Math.min(row.quantity,max)));return [{id:row.id,quantity:max,title:row.title}]});
}
function present(products,overrides=[]){return products.map(p=>{const o=overrides.find(o=>o.id===p.id)||{};return {...p,title:o.title?.trim()||p.title,description:o.description?.trim()||p.description,category:o.category?.trim()||p.category,collection:o.collection||p.collection,images:o.images?.length?o.images:p.images,imageLabels:o.images?.length?o.images.map((_,i)=>`View ${i+1}`):p.imageLabels,hidden:!!o.hidden,position:Number.isFinite(o.position)?o.position:9999}}).sort((a,b)=>a.position-b.position)}
async function catalog(config,settings={}){
 const query=`query Products($after:String){products(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id handle title description productType tags images(first:12){nodes{url altText}} variants(first:100){pageInfo{hasNextPage}nodes{id title availableForSale currentlyNotInStock quantityAvailable selectedOptions{name value}image{url}price{amount currencyCode}}}}}}`;
 let nodes=[],after=null;do{const r=await fetch(`https://${config.domain}/api/${config.apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':config.publicAccessToken},body:JSON.stringify({query,variables:{after}}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Shopify could not be reached. Try refreshing again.');const d=unwrap(await r.json());nodes.push(...d.products.nodes);after=d.products.pageInfo.hasNextPage?d.products.pageInfo.endCursor:null}while(after);
 if(nodes.some(p=>p.variants.pageInfo.hasNextPage))throw Error('A product has more than 100 variants.');return nodes.filter(p=>p.images.nodes.length&&p.variants.nodes.length).map(p=>normalize(p,settings.catalog));
}
root.YHShopify={normalize,unwrap,variantRow,checkoutLines,present,catalog,stockAdjustments};
})(typeof window==='undefined'?globalThis:window);
