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
function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/(^|[\s(])(https?:\/\/[^\s<)\]]+)/g,(match,prefix,url)=>`${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);}
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
 const kicker=document.createElement('span');kicker.className='visual-kicker';kicker.textContent=`第 ${String(route.day||'').padStart(2,'0')} 天 · 路线图`;card.append(kicker);
 const title=document.createElement('h3');title.textContent=`${route.city||'当天'} · 第${route.day||''}天`;card.append(title);
 const graphic=document.createElement('div');graphic.className='route-diagram-scroll';graphic.append(makeRouteDiagram(route));card.append(graphic);
 const footer=document.createElement('div');footer.className='route-card-footer';
 const note=document.createElement('p');note.textContent='路线顺序示意图，不按实际比例；路况与换乘以地图实时结果为准。';footer.append(note);
 const mapUrl=directionsUrl(route);if(mapUrl){const link=document.createElement('a');link.className='map-link';link.href=mapUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='在 Google 地图查看路线 ↗';footer.append(link);}
 card.append(footer);return card;
}
function addPhoto(target,pageUrls,alt){
 const pages=[...new Set((Array.isArray(pageUrls)?pageUrls:[pageUrls]).filter(url=>/^https:\/\//i.test(url||'')))];
 const placeholder=document.createElement('div');placeholder.className='photo-placeholder';placeholder.textContent=pages.length?'正在读取攻略引用页的图片…':'没有可核实的图片来源页';target.append(placeholder);
 if(!pages.length)return;
 const figure=document.createElement('figure');figure.className='place-photo';figure.style.opacity='0';const img=document.createElement('img');img.alt=alt;img.loading='eager';img.referrerPolicy='no-referrer';
 const caption=document.createElement('figcaption');const source=document.createElement('a');source.target='_blank';source.rel='noopener noreferrer';source.textContent='图片预览来自攻略引用页 ↗';caption.append(source);figure.append(img,caption);
 target.append(figure);let next=0,currentPage='',timer=0;const deadline=Date.now()+30000;
 const unavailable=()=>{clearTimeout(timer);figure.remove();placeholder.textContent='图片暂时无法读取，请打开下方详情链接查看';};
 const loadNext=()=>{clearTimeout(timer);if(Date.now()>=deadline){unavailable();return;}currentPage=pages[next++];if(!currentPage){unavailable();return;}img.src=`/api/place-photo?page=${encodeURIComponent(currentPage)}`;timer=setTimeout(()=>{if(Date.now()>=deadline)unavailable();else loadNext();},Math.min(15000,deadline-Date.now()));};
 img.onload=()=>{clearTimeout(timer);source.href=currentPage;figure.style.opacity='1';placeholder.remove();};img.onerror=loadNext;loadNext();
}
function renderVisuals(visuals,fallbackDestination=''){
 visuals=visuals||{destination:fallbackDestination,destinationPhotoPageUrl:'',destinationPhotoPageUrls:[],dayRoutes:[],places:[]};
 visualContent.replaceChildren();
 const heading=document.createElement('div');heading.className='visual-section-heading';const copy=document.createElement('div');const kicker=document.createElement('span');kicker.className='section-kicker';kicker.textContent='目的地图片 · 每日路线图 · 推荐商家';const title=document.createElement('h3');title.textContent='先看沿途风景，再打开实用链接';copy.append(kicker,title);heading.append(copy);visualContent.append(heading);
 const destination=document.createElement('article');destination.className='destination-photo-card';const destinationInfo=document.createElement('div');destinationInfo.className='destination-photo-info';const label=document.createElement('span');label.className='visual-kicker';label.textContent='当地风景';const name=document.createElement('h4');name.textContent=visuals.destination||'目的地';const copyText=document.createElement('p');copyText.textContent='图片取自本次攻略引用的公开介绍页面。';destinationInfo.append(label,name,copyText);const photo=document.createElement('div');photo.className='destination-photo';destination.append(destinationInfo,photo);visualContent.append(destination);addPhoto(photo,visuals.destinationPhotoPageUrls?.length?visuals.destinationPhotoPageUrls:[visuals.destinationPhotoPageUrl],'目的地当地风景');
 const routes=(visuals.dayRoutes||[]).filter(route=>Array.isArray(route.stops)&&route.stops.length>=2);if(routes.length){const routeGrid=document.createElement('div');routeGrid.className='route-grid';routes.forEach(route=>routeGrid.append(addRouteCard(route)));visualContent.append(routeGrid);}
 const places=(visuals.places||[]).filter(place=>place.name&&/^https:\/\//i.test(place.url||''));if(places.length){const subheading=document.createElement('div');subheading.className='visual-subheading';const h=document.createElement('h3');h.textContent='沿途值得收藏的地方';const p=document.createElement('p');p.textContent='酒店与餐厅图片来自攻略列出的对应详情页，图片下方可打开原页面。';subheading.append(h,p);visualContent.append(subheading);const cards=document.createElement('div');cards.className='place-photo-grid';places.forEach(place=>{
   const card=document.createElement('article');card.className='place-card';const media=document.createElement('div');media.className='place-card-media';card.append(media);const body=document.createElement('div');body.className='place-card-body';const type=document.createElement('span');type.className='place-type';type.textContent=place.type==='hotel'?'住宿推荐':'餐饮推荐';const title=document.createElement('h4');title.textContent=place.name;const area=document.createElement('p');area.className='place-city';area.textContent=place.city||visuals.destination||'';const link=document.createElement('a');link.href=place.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=place.type==='hotel'?'查看酒店详情 / 预订 ↗':'查看餐厅详情 / 菜单 ↗';body.append(type,title,area,link);card.append(body);cards.append(card);addPhoto(media,place.photoPageUrls?.length?place.photoPageUrls:[place.url],`${place.name} 详情页图片预览`);
  });visualContent.append(cards);}
 visualContent.hidden=false;
}
async function readPlanResponse(response,onProgress){
 if(!response.body?.getReader)return response.json();
 const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',announced=0;
 while(true){
  const part=await reader.read();if(part.done)break;raw+=decoder.decode(part.value,{stream:true});
  const marker='"progress":[';const start=raw.indexOf(marker);if(start<0)continue;
  const from=start+marker.length,end=raw.indexOf('],',from),progressText=raw.slice(from,end<0?raw.length:end);
  const messages=[...progressText.matchAll(/"(?:\\.|[^"\\])*"/g)];
  while(announced<messages.length){try{const message=JSON.parse(messages[announced++][0]);if(message)onProgress(message);}catch{announced++;}}
 }
 return JSON.parse(raw);
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const interests=[...form.querySelectorAll('input[name="interests"]:checked')].map(x=>x.value);
 const payload={destination:document.querySelector('#destination').value.trim(),dates:document.querySelector('#dates').value.trim(),days:Number(document.querySelector('#days').value),people:Number(document.querySelector('#people').value),budget:document.querySelector('#budget').value,pace:document.querySelector('#pace').value,interests,notes:note.value.trim()};
 if(!payload.destination)return;
 result.hidden=false;loading.hidden=false;errorBox.hidden=true;plan.hidden=true;visualContent.hidden=true;visualContent.replaceChildren();document.querySelector('#price-check').hidden=true;sourceList.hidden=true;sourceLinks.replaceChildren();document.querySelector('#result-title').textContent=`${payload.destination} · ${payload.days} 天旅行攻略`;result.scrollIntoView({behavior:'smooth',block:'start'});button.disabled=true;btnLabel.textContent='正在规划…';
 try{const response=await fetch('/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const progressLabel=loading.querySelector('p');progressLabel.textContent='正在联网查询公开资料…';const data=await readPlanResponse(response,message=>{progressLabel.textContent=`${message}…`;});if(!response.ok||data.error)throw new Error(data.error||'暂时无法生成攻略。');plan.innerHTML=renderMarkdown(data.text);plan.hidden=false;renderVisuals(data.visuals,payload.destination);if(data.checkedAt){const checked=new Date(data.checkedAt);document.querySelector('#price-check').textContent=`本次攻略开始检索于 ${new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(checked)}（北京时间）。金额以链接页面及商家结算页为准。${data.incomplete?' 本次内容触及输出长度上限，部分段落可能不完整。':''}`;document.querySelector('#price-check').hidden=false;}if(data.sources?.length){for(const item of data.sources){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;sourceLinks.append(a);}sourceList.hidden=false;}}
 catch(err){errorBox.textContent=err.message||'网络连接失败，请稍后重试。';errorBox.hidden=false;}
 finally{loading.hidden=true;button.disabled=false;btnLabel.textContent='再规划一份攻略';}
});
document.querySelector('#copy-plan').addEventListener('click',async()=>{const text=plan.innerText;if(!text)return;try{await navigator.clipboard.writeText(text);const b=document.querySelector('#copy-plan');b.innerHTML='已复制 <span>✓</span>';setTimeout(()=>b.innerHTML='复制攻略 <span>↗</span>',1800);}catch{document.querySelector('#copy-plan').textContent='复制失败，请手动选择';}});
let selectedAgent='intake';
document.querySelectorAll('.agent-action').forEach(button=>button.addEventListener('click',()=>{selectedAgent=button.dataset.agent;document.querySelectorAll('.agent-action').forEach(item=>item.classList.toggle('selected',item===button));}));
document.querySelector('#run-agent').addEventListener('click',async()=>{
 const task=document.querySelector('#agent-task').value.trim();if(!task){document.querySelector('#agent-task').focus();return;}
 const result=document.querySelector('#result'),title=document.querySelector('#result-title'),loading=document.querySelector('#loading'),error=document.querySelector('#error-box');
 result.hidden=false;title.textContent='旅伴 Agent 正在工作';loading.hidden=false;error.hidden=true;plan.hidden=true;visualContent.hidden=true;sourceList.hidden=true;sourceLinks.replaceChildren();document.querySelector('#price-check').hidden=true;
 const run=document.querySelector('#run-agent');run.disabled=true;run.querySelector('.button-label').textContent='Agent 正在执行…';loading.querySelector('p').textContent='正在按所选 Agent 的职责检索并整理结果…';result.scrollIntoView({behavior:'smooth',block:'start'});
 const interests=[...form.querySelectorAll('input[name="interests"]:checked')].map(x=>x.value);
 try{const response=await fetch('/api/agent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agent:selectedAgent,task,destination:document.querySelector('#destination').value.trim(),dates:document.querySelector('#dates').value.trim(),days:Number(document.querySelector('#days').value),people:Number(document.querySelector('#people').value),budget:document.querySelector('#budget').value,pace:document.querySelector('#pace').value,interests})});const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'Agent 执行失败。');title.textContent=data.agent;plan.innerHTML=renderMarkdown(data.text);plan.hidden=false;if(data.sources?.length){for(const item of data.sources){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;sourceLinks.append(a);}sourceList.hidden=false;}const checked=new Date(data.checkedAt);const check=document.querySelector('#price-check');check.textContent=`检索时间：${new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(checked)}（北京时间）。请通过来源链接复核动态价格及规则。`;check.hidden=false;}
 catch(err){error.textContent=err.message||'Agent 请求失败。';error.hidden=false;}
 finally{loading.hidden=true;run.disabled=false;run.querySelector('.button-label').textContent='运行所选 Agent';}
});

