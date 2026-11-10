(function(){
const c=window.OWNER_PREVIEW_CONFIG||window.SITE_CONTENT;if(!c)return;
window.PREVIEW_CATALOG=c.products.filter(p=>!p.hidden);
// Uploaded images and image paths are resolved against the current deployment.

const selectors={heroEyebrow:'.hero .eyebrow',heroTitle:'.hero h1',heroDescription:'.hero-copy p',heroButton:'.hero-copy .button',collectionEyebrow:'.collection .eyebrow',collectionTitle:'.collection h2',catalogNote:'#catalog-note',lookbookEyebrow:'.lookbook .eyebrow',lookbookTitle:'.lookbook h2',lookbookDescription:'.lookbook .section-top p',makerEyebrow:'.studio .eyebrow',makerTitle:'.studio h2',makerDescription:'.studio-copy>p',customEyebrow:'.custom .eyebrow',customTitle:'.custom h2',customDescription:'.custom p',customButton:'.custom .button',footerDescription:'footer>div'};
for(const [key,selector] of Object.entries(selectors)){const el=document.querySelector(selector);if(el&&typeof c.text[key]==='string')el.textContent=c.text[key]}
for(const [key,value] of Object.entries(c.theme)){if(/^#[a-f0-9]{6}$/i.test(value))document.documentElement.style.setProperty('--'+key,value)}
document.querySelector('.custom').style.background=c.theme.customBackground;
document.querySelectorAll('a[href*="instagram.com"]').forEach(a=>a.href=c.instagram);
document.querySelector('.studio-image img').src=c.makerImage;
document.querySelectorAll('.wordmark img,.footer-brand img').forEach(i=>i.src=c.logo);document.querySelector('.logo-art').src=c.fullLogo;
const slides=document.querySelector('.hero-slides');slides.replaceChildren();for(const [i,p] of c.slides.entries()){const img=document.createElement('img');img.className='hero-slide'+(i===0?' is-current':'');img.src=p.src;img.alt=p.alt;slides.append(img)}
const main=document.querySelector('main');for(const s of c.sections){const el=document.getElementById(s.id)||document.querySelector('.'+s.id);if(el){el.hidden=!s.visible;main.append(el)}}
document.querySelectorAll('.lookbook-grid [data-product]').forEach(b=>{if(!window.PREVIEW_CATALOG.some(p=>p.id===b.dataset.product))b.hidden=true});
})();
