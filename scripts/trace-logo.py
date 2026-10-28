"""Trace the supplied logo into transparent vector paths; requires Pillow + numpy."""
from PIL import Image
import numpy as np
from collections import defaultdict
from pathlib import Path
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'dist/assets/logo.jpg').convert('RGB').resize((860,801),Image.Resampling.LANCZOS)
palette=np.array([(246,236,222),(255,39,42),(245,176,183),(165,6,14),(22,19,19),(145,143,139),(247,247,243)],dtype=float)
a=np.asarray(im,dtype=float);labels=((a[:,:,None,:]-palette[None,None,:,:])**2).sum(3).argmin(2)
def simplify(p,eps=.65):
 if len(p)<3:return p
 ax,ay=p[0];bx,by=p[-1];dx=bx-ax;dy=by-ay
 denom=(dx*dx+dy*dy)**.5
 ds=[abs(dy*(x-ax)-dx*(y-ay))/denom if denom else ((x-ax)**2+(y-ay)**2)**.5 for x,y in p]
 i=max(range(len(ds)),key=ds.__getitem__)
 return simplify(p[:i+1],eps)[:-1]+simplify(p[i:],eps) if ds[i]>eps else [p[0],p[-1]]
def paths(mask):
 h,w=mask.shape;adj=defaultdict(list)
 for y,x in zip(*np.where(mask)):
  if y==0 or not mask[y-1,x]:adj[(x,y)].append((x+1,y))
  if x==w-1 or not mask[y,x+1]:adj[(x+1,y)].append((x+1,y+1))
  if y==h-1 or not mask[y+1,x]:adj[(x+1,y+1)].append((x,y+1))
  if x==0 or not mask[y,x-1]:adj[(x,y+1)].append((x,y))
 loops=[]
 while adj:
  start=next(iter(adj));p=[start];cur=start
  while True:
   nxt=adj[cur].pop()
   if not adj[cur]:del adj[cur]
   p.append(nxt);cur=nxt
   if cur==start:break
  area=abs(sum(p[i][0]*p[i+1][1]-p[i+1][0]*p[i][1] for i in range(len(p)-1)))/2
  if area<9:continue
  mid=len(p)//2;q=simplify(p[:mid+1])[:-1]+simplify(p[mid:])
  loops.append('M'+' L'.join(f'{x},{y}' for x,y in q)+'Z')
 return ' '.join(loops)
def save(name,crop):
 x0,y0,x1,y1=crop;lab=labels[y0:y1,x0:x1]
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {x1-x0} {y1-y0}" role="img" aria-label="Yarn Hooker"><title>Yarn Hooker</title>']
 for i,c in enumerate(palette[1:],1):
  p=paths(lab==i)
  if p:out.append(f'<path fill="#{int(c[0]):02x}{int(c[1]):02x}{int(c[2]):02x}" fill-rule="evenodd" d="{p}"/>')
 out.append('</svg>');(root/'dist/assets'/name).write_text('\n'.join(out))
save('yarn-hooker-logo.svg',(65,22,785,785))
save('yarn-hooker-wordmark.svg',(65,22,785,422))
