const form=document.querySelector('#trip-form');
const result=document.querySelector('#result');
const loading=document.querySelector('#loading');
const errorBox=document.querySelector('#error-box');
const plan=document.querySelector('#plan-content');
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
form.addEventListener('submit',async e=>{
 e.preventDefault();const interests=[...form.querySelectorAll('input[name="interests"]:checked')].map(x=>x.value);
 const payload={destination:document.querySelector('#destination').value.trim(),dates:document.querySelector('#dates').value.trim(),days:Number(document.querySelector('#days').value),people:Number(document.querySelector('#people').value),budget:document.querySelector('#budget').value,pace:document.querySelector('#pace').value,interests,notes:note.value.trim()};
 if(!payload.destination)return;
 result.hidden=false;loading.hidden=false;errorBox.hidden=true;plan.hidden=true;document.querySelector('#price-check').hidden=true;sourceList.hidden=true;sourceLinks.replaceChildren();document.querySelector('#result-title').textContent=`${payload.destination} · ${payload.days} 天旅行攻略`;result.scrollIntoView({behavior:'smooth',block:'start'});button.disabled=true;btnLabel.textContent='正在规划…';
 try{const response=await fetch('/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'暂时无法生成攻略。');plan.innerHTML=renderMarkdown(data.text);plan.hidden=false;if(data.checkedAt){const checked=new Date(data.checkedAt);document.querySelector('#price-check').textContent=`本次攻略开始检索于 ${new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(checked)}（北京时间）。金额以链接页面及商家结算页为准。`;document.querySelector('#price-check').hidden=false;}if(data.sources?.length){for(const item of data.sources){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;sourceLinks.append(a);}sourceList.hidden=false;}}
 catch(err){errorBox.textContent=err.message||'网络连接失败，请稍后重试。';errorBox.hidden=false;}
 finally{loading.hidden=true;button.disabled=false;btnLabel.textContent='再规划一份攻略';}
});
document.querySelector('#copy-plan').addEventListener('click',async()=>{const text=plan.innerText;if(!text)return;try{await navigator.clipboard.writeText(text);const b=document.querySelector('#copy-plan');b.innerHTML='已复制 <span>✓</span>';setTimeout(()=>b.innerHTML='复制攻略 <span>↗</span>',1800);}catch{document.querySelector('#copy-plan').textContent='复制失败，请手动选择';}});

