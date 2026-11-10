const form=document.querySelector('#trip-form');
const result=document.querySelector('#result');
const loading=document.querySelector('#loading');
const errorBox=document.querySelector('#error-box');
const plan=document.querySelector('#plan-content');
const visualContent=document.querySelector('#visual-content');
const sourceList=document.querySelector('#source-list');
const sourceLinks=document.querySelector('#sources');
const button=form.querySelector('.generate-button');
const btnLabel=button.querySelector('.button-label');
const note=document.querySelector('#notes');
note.addEventListener('input',()=>document.querySelector('#note-count').textContent=note.value.length);
document.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('#destination').value=b.dataset.destination;document.querySelector('#planner').scrollIntoView({behavior:'smooth'});document.querySelector('#destination').focus();}));
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');}
function renderMarkdown(raw){
 const lines=raw.replace(/\r/g,'').split('\n');let html='',list=null;
 const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());
 const divider=line=>cells(line).length>1&&cells(line).every(x=>/^:?-{3,}:?$/.test(x));
 const close=()=>{if(list){html+=`</${list}>`;list=null;}};
 for(let i=0;i<lines.length;i++){const line=lines[i],s=line.trim();if(!s){close();continue;}
  if(s.includes('|')&&i+1<lines.length&&divider(lines[i+1])){close();const headers=cells(s),aligns=cells(lines[i+1]);let rows=[];i+=2;while(i<lines.length&&lines[i].trim().includes('|')){rows.push(cells(lines[i]));i++;}i--;html+='<div class="table-scroll"><table><thead><tr>'+headers.map((cell,j)=>`<th${/^:.*:$/.test(aligns[j]||'')?' class="align-center"':''}>${inline(cell)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+headers.map((_,j)=>`<td>${inline(row[j]||'')}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';continue;}
  if(/^[-*_]{3,}$/.test(s)){close();html+='<hr>';continue;}
  const head=s.match(/^(#{1,4})\s+(.+)$/);if(head){close();const n=Math.min(head[1].length+1,4);html+=`<h${n}>${inline(head[2])}</h${n}>`;continue;}
  const ol=s.match(/^\d+[.)]\s+(.+)$/),ul=s.match(/^[-*+]\s+(.+)$/);
  if(ol||ul){const kind=ol?'ol':'ul';if(list!==kind){close();html+=`<${kind}>`;list=kind;}html+=`<li>${inline((ol||ul)[1])}</li>`;continue;}
  const quote=s.match(/^>\s?(.*)$/);if(quote){close();html+=`<blockquote>${inline(quote[1])}</blockquote>`;continue;}
  close();html+=`<p>${inline(s)}</p>`;
 }
 close();return html;
}
const SVG_NS='http://www.w3.org/2000/svg';
function svgNode(name,attrs={}){const node=document.createElementNS(SVG_NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
function shortLabel(value,max=17){const s=String(value||'').trim();return s.length>max?`${s.slice(0,max-1)}…`:s;}
function directionsUrl(route){
 const stops=(route.stops||[]).slice(0,5);if(stops.length<2)return '';
 const city=route.city||route.destination||'';const point=name=>city?`${name}, ${city}`:name;
 const params=new URLSearchParams({api:'1',origin:point(stops[0]),destination:point(stops[stops.length-1]),travelmode:'transit'});
 if(stops.length>2)params.set('waypoints',stops.slice(1,-1).map(point).join('|'));
 return `https://www.google.com/maps/dir/?${params.toString()}`;
}
function makeRouteDiagram(route){
 const stops=(route.stops||[]).slice(0,7);const width=Math.max(620,stops.length*155+45);const height=190;
 const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`${route.city||''}第${route.day||''}天路线顺序示意`});
 const bg=svgNode('rect',{x:0,y:0,width,height,rx:18,fill:'#edf3e8'});svg.append(bg);
 for(let i=0;i<6;i++)svg.append(svgNode('path',{d:`M${i*190-40} 0 C${i*190+60} 55 ${i*190-20} 125 ${i*190+90} ${height}`,fill:'none',stroke:'#dfe9dc','stroke-width':2}));
 const positions=stops.map((name,i)=>({name,x:42+i*(width-84)/Math.max(1,stops.length-1),y:i%2?67:120}));
 if(positions.length>1){const d=positions.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');svg.append(svgNode('path',{d,fill:'none',stroke:'#4e8067','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':'9 8'}));}
 positions.forEach((p,i)=>{
  const circle=svgNode('circle',{cx:p.x,cy:p.y,r:17,fill:i===0?'#e28c54':'#245d4e',stroke:'#fffefa','stroke-width':4});svg.append(circle);
  const number=svgNode('text',{x:p.x,y:p.y+5,'text-anchor':'middle',fill:'#fffefa','font-size':13,'font-weight':700});number.textContent=String(i+1);svg.append(number);
  const label=svgNode('text',{x:p.x,y:p.y+(i%2?43:-28),'text-anchor':'middle',fill:'#294c3e','font-size':12,'font-weight':600});label.textContent=shortLabel(p.name,15);svg.append(label);
 });
 return svg;
}
function addRouteCard(route){
 const card=document.createElement('article');card.className='route-card';
 const kicker=document.createElement('span');kicker.className='visual-kicker';kicker.textContent=`DAY ${String(route.day||'').padStart(2,'0')} · ROUTE`;card.append(kicker);
 const title=document.createElement('h3');title.textContent=`${route.city||'当天'} · 第${route.day||''}天`;card.append(title);
 const graphic=document.createElement('div');graphic.className='route-diagram-scroll';graphic.append(makeRouteDiagram(route));card.append(graphic);
 const footer=document.createElement('div');footer.className='route-card-footer';
 const note=document.createElement('p');note.textContent='路线顺序示意图，不按实际比例；路况与换乘以地图实时结果为准。';footer.append(note);
 const mapUrl=directionsUrl(route);if(mapUrl){const link=document.createElement('a');link.className='map-link';link.href=mapUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='在 Google 地图查看路线 ↗';footer.append(link);}
 card.append(footer);return card;
}
function normalizeImageText(value){return String(value||'').normalize('NFKD').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');}
function plainHtml(value){const parsed=new DOMParser().parseFromString(String(value||''),'text/html');return (parsed.body.textContent||'').trim();}
async function findCommonsImage(query,matchTerms=[]){
 const q=String(query||'').trim();if(!q)return null;
 const cacheKey=`tripmate.commons.v1.${q.toLocaleLowerCase()}`;
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&Date.now()-cached.savedAt<7*24*60*60*1000)return cached.image||null;}catch{}
 try{
  const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1000',origin:'*'});
  const response=await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);if(!response.ok)return null;
  const data=await response.json();const expected=matchTerms.map(normalizeImageText).filter(x=>x.length>=3);
  const pages=Object.values(data.query?.pages||{}).map(page=>{
   const info=page.imageinfo?.[0],meta=info?.extmetadata||{},description=plainHtml(meta.ImageDescription?.value||'');
   const searchable=normalizeImageText(`${page.title||''} ${description}`);
   const match=expected.length===0||expected.some(term=>searchable.includes(term));
   return {title:page.title||'',url:info?.thumburl||info?.url||'',mime:info?.mime||'',descriptionUrl:info?.descriptionurl||'',description,artist:plainHtml(meta.Artist?.value||meta.Credit?.value||''),license:plainHtml(meta.LicenseShortName?.value||''),match,searchable};
  }).filter(item=>item.match&&item.url&&item.mime.startsWith('image/')&&!/(logo|flag|icon|map|coat.of.arms|wordmark)/i.test(item.title));
  const image=pages[0]||null;try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),image}));}catch{}
  return image;
 }catch{return null;}
}
function addPhoto(target,query,matchTerms,alt){
 const placeholder=document.createElement('div');placeholder.className='photo-placeholder';placeholder.textContent='正在寻找可核实的当地图片…';target.append(placeholder);
 findCommonsImage(query,matchTerms).then(image=>{
  placeholder.remove();if(!image){const empty=document.createElement('div');empty.className='photo-empty';empty.textContent='暂未找到与该地点名称匹配的公开实景图';target.append(empty);return;}
  const figure=document.createElement('figure');figure.className='place-photo';const img=document.createElement('img');img.src=image.url;img.alt=alt;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>figure.remove();figure.append(img);
  const caption=document.createElement('figcaption');const source=document.createElement('a');source.href=image.descriptionUrl;source.target='_blank';source.rel='noopener noreferrer';source.textContent=`图片来源 Wikimedia Commons${image.artist?` · ${image.artist}`:''}${image.license?` · ${image.license}`:''}`;caption.append(source);figure.append(caption);target.append(figure);
 }).catch(()=>placeholder.remove());
}
function renderVisuals(visuals){
 visualContent.replaceChildren();if(!visuals){visualContent.hidden=true;return;}
 const heading=document.createElement('div');heading.className='visual-section-heading';const copy=document.createElement('div');const kicker=document.createElement('span');kicker.className='section-kicker';kicker.textContent='SEE THE ROUTE BEFORE YOU GO';const title=document.createElement('h3');title.textContent='路线、地点和当地灵感';copy.append(kicker,title);heading.append(copy);visualContent.append(heading);
 const destination=document.createElement('article');destination.className='destination-photo-card';const destinationInfo=document.createElement('div');destinationInfo.className='destination-photo-info';const label=document.createElement('span');label.className='visual-kicker';label.textContent='LOCAL MOMENT';const name=document.createElement('h4');name.textContent=visuals.destination||'目的地';const copyText=document.createElement('p');copyText.textContent='从当地地标与街景开始，看看这趟旅程会经过哪些地方。';destinationInfo.append(label,name,copyText);const photo=document.createElement('div');photo.className='destination-photo';destination.append(destinationInfo,photo);visualContent.append(destination);addPhoto(photo,visuals.destinationImageQuery||visuals.destination,visuals.destinationPhotoTerms?.length?visuals.destinationPhotoTerms:[visuals.destination],'目的地当地风景');
 const routes=(visuals.dayRoutes||[]).filter(route=>Array.isArray(route.stops)&&route.stops.length>=2);if(routes.length){const routeGrid=document.createElement('div');routeGrid.className='route-grid';routes.forEach(route=>routeGrid.append(addRouteCard(route)));visualContent.append(routeGrid);}
 const places=(visuals.places||[]).filter(place=>place.name&&/^https:\/\//i.test(place.url||''));if(places.length){const subheading=document.createElement('div');subheading.className='visual-subheading';const h=document.createElement('h3');h.textContent='沿途值得收藏的地方';const p=document.createElement('p');p.textContent='图片只在地点名称与公开图片资料能匹配时显示；未找到时不会拿别家照片代替。';subheading.append(h,p);visualContent.append(subheading);const cards=document.createElement('div');cards.className='place-photo-grid';places.forEach(place=>{
   const card=document.createElement('article');card.className='place-card';const media=document.createElement('div');media.className='place-card-media';card.append(media);const body=document.createElement('div');body.className='place-card-body';const type=document.createElement('span');type.className='place-type';type.textContent=place.type==='hotel'?'住宿推荐':'餐饮推荐';const title=document.createElement('h4');title.textContent=place.name;const area=document.createElement('p');area.className='place-city';area.textContent=place.city||visuals.destination||'';const link=document.createElement('a');link.href=place.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=place.type==='hotel'?'查看酒店详情 / 预订 ↗':'查看餐厅详情 / 菜单 ↗';body.append(type,title,area,link);card.append(body);cards.append(card);addPhoto(media,place.imageQuery||`${place.name} ${place.city}`,[place.name],`${place.name} 相关实景图`);
  });visualContent.append(cards);}
 visualContent.hidden=false;
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const interests=[...form.querySelectorAll('input[name="interests"]:checked')].map(x=>x.value);
 const payload={destination:document.querySelector('#destination').value.trim(),dates:document.querySelector('#dates').value.trim(),days:Number(document.querySelector('#days').value),people:Number(document.querySelector('#people').value),budget:document.querySelector('#budget').value,pace:document.querySelector('#pace').value,interests,notes:note.value.trim()};
 if(!payload.destination)return;
 result.hidden=false;loading.hidden=false;errorBox.hidden=true;plan.hidden=true;visualContent.hidden=true;visualContent.replaceChildren();document.querySelector('#price-check').hidden=true;sourceList.hidden=true;sourceLinks.replaceChildren();document.querySelector('#result-title').textContent=`${payload.destination} · ${payload.days} 天旅行攻略`;result.scrollIntoView({behavior:'smooth',block:'start'});button.disabled=true;btnLabel.textContent='正在规划…';
 try{const response=await fetch('/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'暂时无法生成攻略。');plan.innerHTML=renderMarkdown(data.text);plan.hidden=false;renderVisuals(data.visuals);if(data.checkedAt){const checked=new Date(data.checkedAt);document.querySelector('#price-check').textContent=`本次攻略开始检索于 ${new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(checked)}（北京时间）。金额以链接页面及商家结算页为准。`;document.querySelector('#price-check').hidden=false;}if(data.sources?.length){for(const item of data.sources){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;sourceLinks.append(a);}sourceList.hidden=false;}}
 catch(err){errorBox.textContent=err.message||'网络连接失败，请稍后重试。';errorBox.hidden=false;}
 finally{loading.hidden=true;button.disabled=false;btnLabel.textContent='再规划一份攻略';}
});
document.querySelector('#copy-plan').addEventListener('click',async()=>{const text=plan.innerText;if(!text)return;try{await navigator.clipboard.writeText(text);const b=document.querySelector('#copy-plan');b.innerHTML='已复制 <span>✓</span>';setTimeout(()=>b.innerHTML='复制攻略 <span>↗</span>',1800);}catch{document.querySelector('#copy-plan').textContent='复制失败，请手动选择';}});

