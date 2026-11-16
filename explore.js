/* Preference discovery and browser-local itinerary additions. No private data leaves the browser. */
(() => {
 const key='seoul-explore-v1',seen='seoul-explore-seen',safe=esc;
 const base=JSON.parse(JSON.stringify(ROUTES));
 const tags={bagel:['面包甜品','咖啡店',40,25],octopus:['韩式料理','街区夜景',105,60,'辣'],bytp:['拍照打卡','逛街买衣服',0,30],gopchang:['烤肉内脏',null,100,60,'内脏'],darak:['西餐简餐','咖啡店',100,60],minari:['汤饭热食',null,85,45],sm:[null,'城市建筑',0,25],forest:[null,'自然公园',0,40],daelim:['咖啡','城市建筑',45,40],bongchu:['韩式料理',null,115,50,'辣'],hybe:[null,'城市建筑',0,20],passion:['面包甜品','咖啡店',80,35],han:['面包甜品',null,35,20],salt:['面包甜品',null,30,20],sando:['面包甜品','咖啡店',65,45],ason:[null,'逛街买衣服',0,45],coy:[null,'逛街买衣服',0,45],aeae:[null,'逛街买衣服',0,45],musinsa:[null,'逛街买衣服',0,60],standard:[null,'逛街买衣服',0,45],matin:[null,'逛街买衣服',0,45],standoil:[null,'包包饰品',0,40],tamb:[null,'香氛美妆',0,30],haus:[null,'城市建筑',0,50],mardi:[null,'逛街买衣服',0,35],diptyque:[null,'香氛美妆',0,45],daiso:[null,'生活小物',0,40],nyum:[null,'包包饰品',0,40],nyuh:[null,'包包饰品',0,40],nyud:[null,'包包饰品',0,40],hangang:[null,'江景散步',0,45],convenience:['便利店小吃','江景散步',40,30],mangwon:['市场小吃','传统市场',60,90],gwangjang:['市场小吃','传统市场',75,90],'subdued-popup':[null,'逛街买衣服',0,35],'chanel-popup':[null,'拍照打卡',0,35]};
 const scenes=['江景散步','自然公园','城市建筑','街区夜景','拍照打卡','传统市场'];
 const foods=['韩式料理','汤饭热食','烤肉内脏','西餐简餐','咖啡','面包甜品','市场小吃','便利店小吃'];
 const shops=['逛街买衣服','包包饰品','香氛美妆','生活小物'];
 let saved={profile:null,added:[]};try{const value=JSON.parse(localStorage.getItem(key));if(value&&typeof value==='object')saved={profile:value.profile||null,added:Array.isArray(value.added)?value.added.filter(a=>tags[a.id]&&Number.isInteger(a.day)&&a.day>=0&&a.day<4):[]};}catch{}
 let draft=saved.profile||{groups:['THE BOYZ'],other:'',scenes:[],foods:[],shops:[],avoid:[],budget:100},step=0,focusBack=null;
 const coord={};base.forEach(r=>r.points.forEach(p=>{if(p.place&&!coord[p.place])coord[p.place]={ll:p.ll,accuracy:p.accuracy};}));
 coord.forest={...coord.sm,accuracy:'首尔林片区代表点，非公园入口'};
 coord.passion={ll:[37.53871,127.0021404],accuracy:'OpenStreetMap同门牌地点定位，非入口测量'};
 const candidates=PLACES.filter(p=>tags[p.id]&&coord[p.id]&&!/旧址|尚未|待定位/.test(p.address));
 const originalDay=id=>base.findIndex(r=>r.points.some(p=>p.place===id||(id==='forest'&&p.place==='sm')));
 const recommendedDay=p=>{const d=originalDay(p.id);return d>=0?d:/圣水|首尔林|汉江/.test(p.area)?3:/弘大|新村|望远|延禧/.test(p.area)?2:/汉南|龙山|明洞|狎鸥亭/.test(p.area)?1:0;};
 const distance=(a,b)=>{const rad=Math.PI/180,lat=(a[0]+b[0])*rad/2;return Math.hypot((a[0]-b[0])*111.2,(a[1]-b[1])*111.2*Math.cos(lat));};
 function insertion(points,ll){let best={at:1,cost:Infinity};for(let i=1;i<points.length-1;i++){if(points[i].home||points[i+1].home)continue;const cost=distance(points[i].ll,ll)+distance(ll,points[i+1].ll)-distance(points[i].ll,points[i+1].ll);if(cost<best.cost)best={at:i+1,cost};}return best;}
 const store=()=>{try{localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem(seen,'1');return true;}catch{return false;}};
 const banner=document.createElement('div');banner.className='explore-banner';banner.innerHTML='<div><span class="eyebrow">FIND YOUR SEOUL</span><strong>这次首尔，想遇见什么？</strong><small>选团体、风景和口味，找到适合你的那几站。</small></div><button data-explore-open>探索我的喜好 ↗</button>';
 document.querySelector('#journey').before(banner);
 const navLink=document.createElement('a');navLink.href='#explore';navLink.textContent='探索';navLink.dataset.exploreOpen='';document.querySelector('nav').prepend(navLink);
 const dialog=document.createElement('dialog');dialog.id='explore-dialog';dialog.className='explore-dialog';dialog.setAttribute('aria-labelledby','explore-title');document.body.append(dialog);
 const choice=(field,values)=>`<div class="explore-choices">${values.map(v=>`<label><input type="checkbox" name="${field}" value="${safe(v)}" ${(draft[field]||[]).includes(v)?'checked':''}><span>${safe(v)}</span></label>`).join('')}</div>`;
 function collect(){const form=dialog.querySelector('form');if(!form)return;['groups','scenes','foods','shops','avoid'].forEach(field=>{if(form.querySelector(`[name="${field}"]`))draft[field]=[...form.querySelectorAll(`[name="${field}"]:checked`)].map(x=>x.value);});if(form.elements.other)draft.other=form.elements.other.value.trim().slice(0,60);if(form.elements.budget)draft.budget=+form.elements.budget.value;}
 function render(){
  const titles=['先从喜欢的人开始。','你想看什么样的首尔？','这一趟，想吃些什么？','再留一点时间给逛街。','为你挑出的首尔片段。'];
  let body='';
  if(step===0)body=`<p>可多选，也可以不追星、直接继续。当前这份是12月5–9日的首尔行程。</p>${choice('groups',['THE BOYZ','BTS','SEVENTEEN','aespa','NCT','Stray Kids'])}<label class="explore-field">其他团体 / 成员<input name="other" maxlength="60" value="${safe(draft.other||'')}" placeholder="也可以写下你的本命"></label><p class="explore-note">本站目前以 THE BOYZ 线索最完整。其他团体会结合风景、饮食和购物推荐，不将普通地点冒充成员同款。</p>`;
  if(step===1)body=`<p>选几个让你愿意多停一会儿的风景。</p>${choice('scenes',scenes)}`;
  if(step===2)body=`<p>咖啡甜品、热乎乎的正餐，还是市场里边走边吃？</p>${choice('foods',foods)}<h3>不想吃的，也告诉我</h3>${choice('avoid',['不吃辣','不吃内脏','不吃生食'])}<label class="explore-field">每人每餐预算（人民币）<select name="budget">${[[60,'¥20–60 · 实惠优先'],[100,'¥20–100 · 日常舒适'],[150,'¥20–150 · 偶尔吃好一点']].map(([v,t])=>`<option value="${v}" ${+draft.budget===v?'selected':''}>${t}</option>`).join('')}</select></label><p class="explore-note">按已整理的点单预算筛选，不是实时菜单；市场和餐厅仍需现场确认辣度与食材。</p>`;
  if(step===3)body=`<p>选你想逛的类型；不选也可以以散步和吃饭为主。</p>${choice('shops',shops)}<p class="explore-note">推荐从本站已有来源的地点中匹配，不会自动预约、下单或替你改动基础行程。偏好和新增站点保存在当前浏览器。</p>`;
  if(step===4)body=results();
  dialog.innerHTML=`<header class="explore-head"><div><div class="eyebrow">YOUR SEOUL / ${step<4?`0${step+1} OF 04`:'YOUR PICKS'}</div><h2 id="explore-title">${titles[step]}</h2></div><button type="button" class="explore-close" aria-label="关闭探索">×</button></header>${step<4?`<div class="explore-progress" aria-label="第${step+1}步，共4步">${[0,1,2,3].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div><form>${body}</form>`:body}<p id="explore-status" role="status"></p><div class="explore-footer">${step>0?`<button class="explore-secondary" data-explore-back>${step===4?'重新选喜好':'上一步'}</button>`:'<button class="explore-secondary" data-explore-skip>先看原行程</button>'}<button class="explore-primary" data-explore-next>${step===4?'回到我的行程 ↗':step===3?'看看推荐 ↗':'继续 →'}</button></div>`;
  if(step<4)dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();next();});
  dialog.scrollTop=0;
 }
 function ranked(){return candidates.map(p=>{
  const t=tags[p.id],why=[],pref=saved.profile||draft;let score=0;
  if(t[0]&&t[2]>pref.budget)return null;
  if((pref.avoid||[]).includes('不吃辣')&&t[4]==='辣')return null;
  if((pref.avoid||[]).includes('不吃内脏')&&t[4]==='内脏')return null;
  if((pref.groups||[]).includes('THE BOYZ')&&p.member){score+=4;why.push('THE BOYZ线索，证据级别见来源');}
  if((pref.foods||[]).includes(t[0])){score+=5;why.push('喜欢'+t[0]);}
  if((pref.scenes||[]).includes(t[1])){score+=5;why.push('想看'+t[1]);}
  if((pref.shops||[]).includes(t[1])){score+=5;why.push('想逛'+t[1]);}
  if(t[0]&&t[2]<=pref.budget){score+=1;why.push('规划花费在预算内');}
  if(p.id==='minari'&&(pref.avoid||[]).includes('不吃生食'))why.push('按熟食汤饭推荐，不点生牛肉');
  if(p.id==='passion'&&score>1)score+=.5;
  return {p,score,why:why.length?why:['轻松顺路的基础选项']};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id)).slice(0,12);}
 function results(){
  const profile=saved.profile||draft,chosen=[...(profile.groups||[]),profile.other,...(profile.scenes||[]),...(profile.foods||[]),...(profile.shops||[])].filter(Boolean);
  return `<p class="explore-summary">${safe(chosen.length?chosen.join(' · '):'随心看看首尔')}<br><small>每人每餐不超过¥${safe(profile.budget)} · 按本站已整理地点匹配</small></p><p class="explore-note">“已在行程”可直接查看；新地点先选日期，再加入。加入后同步显示在当天时间线、编号地图和顺序图中；按相邻地点估算插入位置，具体交通仍需地图确认。</p><div class="explore-results">${ranked().map(({p,why})=>{
   const planned=originalDay(p.id),added=saved.added.find(a=>a.id===p.id),day=added?.day??recommendedDay(p),t=tags[p.id];
   return `<article class="explore-result" data-explore-result="${p.id}"><div class="eyebrow">${safe(p.area)} / ${t[0]?'FOOD & COFFEE':'WALK & SHOP'}</div><h3>${safe(p.name)}</h3><p>${safe(why.join(' · '))}</p><small>${t[0]?`规划人均约¥${t[2]}以内，按建议菜单；`:'购物消费另计；'}建议留${t[3]}分钟</small><p class="explore-note">${safe(p.status)}${planned>=0?' · 已在'+DAYS[planned].date:added?' · 已加入'+DAYS[added.day].date:''}</p><div class="explore-result-links"><a href="${safe(p.source)}" target="_blank" rel="noopener">来源 ↗</a><button type="button" data-nearby-place="${p.id}">看附近 ↗</button></div>${planned>=0?`<button class="explore-secondary" data-explore-view="${planned}">已在 ${DAYS[planned].date} · 查看当天</button>`:added?`<button class="explore-secondary" data-explore-view="${added.day}">查看 ${DAYS[added.day].date} 新增站点</button><button class="explore-text" data-explore-remove="${p.id}">移除</button>`:`<label class="explore-day-label">加入哪一天<select data-explore-day="${p.id}">${DAYS.map((d,i)=>`<option value="${i}" ${i===4?'disabled':''} ${day===i?'selected':''}>${d.date} ${d.week}${i===4?' · 机场日，不加景点':''}${i===recommendedDay(p)?' · 同区优先':''}</option>`).join('')}</select></label><p class="explore-fit" data-explore-fit="${p.id}">${fitText(p,day)}</p><button class="explore-primary" data-explore-add="${p.id}">加入这一天 ＋</button>`}</article>`;
  }).join('')}</div>`;
 }
 function fitText(p,day){const fit=insertion(base[day].points,coord[p.id].ll),minutes=saved.added.filter(a=>a.day===day).reduce((n,a)=>n+tags[a.id][3],0)+tags[p.id][3];return safe((day===recommendedDay(p)?'与当天区域相近':'跨区选择，优先考虑'+DAYS[recommendedDay(p)].date)+'；新增后需腾出约'+minutes+'分钟'+(fit.cost>2?'。直线绕行估计约'+fit.cost.toFixed(1)+'公里，交通时间另算':'，具体步行以地图为准')+'。');}
 function next(){if(step===4){dialog.close();document.querySelector('#journey').scrollIntoView({behavior:'smooth'});return;}collect();if(step===3){saved.profile=JSON.parse(JSON.stringify(draft));const ok=store();step=4;render();if(!ok)dialog.querySelector('#explore-status').textContent='浏览器暂不允许保存；本次浏览仍可继续使用。';}else{step++;render();}dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus({preventScroll:true});}
 function open(source){focusBack=source;draft=JSON.parse(JSON.stringify(saved.profile||draft));step=saved.profile?4:0;render();dialog.showModal();document.body.classList.add('explore-open');dialog.querySelector('.explore-close').focus();}
 dialog.addEventListener('close',()=>{document.body.classList.remove('explore-open');try{localStorage.setItem(seen,'1');}catch{}focusBack?.focus?.({preventScroll:true});});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-explore-open]');if(b){e.preventDefault();open(b);}});
 dialog.addEventListener('change',e=>{if(e.target.matches('[data-explore-day]')){const p=lookup[e.target.dataset.exploreDay];dialog.querySelector(`[data-explore-fit="${p.id}"]`).textContent=fitText(p,+e.target.value);}});
 dialog.addEventListener('click',e=>{
  if(e.target.closest('.explore-close,[data-explore-skip]'))dialog.close();
  if(e.target.closest('[data-explore-next]'))next();
  if(e.target.closest('[data-explore-back]')){collect();step=step===4?0:step-1;render();}
  const add=e.target.closest('[data-explore-add]');if(add){const id=add.dataset.exploreAdd,day=+dialog.querySelector(`[data-explore-day="${id}"]`).value;if(day>=0&&day<4&&!saved.added.some(a=>a.id===id)&&originalDay(id)<0){saved.added.push({id,day});const ok=store();apply();render();dialog.querySelector('#explore-status').textContent=lookup[id].name+'已加入'+DAYS[day].date+(ok?'，已保存在此浏览器。':'；浏览器不允许保存，刷新后可能丢失。');}}
  const view=e.target.closest('[data-explore-view]');if(view){dialog.close();activate(+view.dataset.exploreView);document.querySelector('#journey').scrollIntoView({behavior:'smooth'});}
  const remove=e.target.closest('[data-explore-remove]');if(remove)removeAddition(remove.dataset.exploreRemove,true);
 });
 document.addEventListener('click',e=>{const b=e.target.closest('[data-explore-remove]');if(b&&!dialog.contains(b))removeAddition(b.dataset.exploreRemove,false);});
 function removeAddition(id,rerender){saved.added=saved.added.filter(a=>a.id!==id);store();apply();if(rerender)render();}
 function exportSvg(route,day){const height=180+route.points.length*92;return URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}"><rect width="760" height="${height}" fill="#edf3ef"/><style>text{font-family:Microsoft YaHei,sans-serif;fill:#213f3b}</style><text x="40" y="45" font-size="25">${safe(DAYS[day].date)} · 我的探索动线</text><text x="40" y="80" font-size="14">机动站点需另腾时间；连线仅表示顺序，不是实际交通导航。</text>${route.points.map((p,i)=>`<circle cx="55" cy="${130+i*92}" r="18" fill="#315d52"/><text x="55" y="${136+i*92}" text-anchor="middle" style="fill:white">${i+1}</text><text x="90" y="${124+i*92}" font-size="14">${safe(p.time)}</text><text x="90" y="${152+i*92}" font-size="20">${safe(p.name)}</text>`).join('')}</svg>`],{type:'image/svg+xml'}));}
 const urls=new Map();
 function apply(){
  document.querySelectorAll('.explore-added,.explore-day-note').forEach(e=>e.remove());
  for(let day=0;day<5;day++){
   const route=JSON.parse(JSON.stringify(base[day])),adds=saved.added.filter(a=>a.day===day&&lookup[a.id]&&coord[a.id]&&originalDay(a.id)<0),originalCore=new Set(route.core.map(i=>route.points[i]));
   if(urls.has(day)){URL.revokeObjectURL(urls.get(day));urls.delete(day);}
   adds.forEach(a=>{const p=lookup[a.id],fit=insertion(route.points,coord[a.id].ll),before=route.points[fit.at-1];a.after=before.name;
    const node={name:'探索追加 · '+p.name,time:'机动 · 约'+tags[p.id][3]+'分钟',detail:'根据你的喜好加入。建议接在'+before.name+'之后；原有预约、营业与钟点不自动顺延，请用机动时间或替换一家店。跨区时交通时间另算。',mode:'choice',leg:'探索追加；实际步行与交通需当日查地图',ll:coord[p.id].ll,accuracy:coord[p.id].accuracy,optional:true,place:p.id,explore:true};route.points.splice(fit.at,0,node);
   });
   route.core=route.points.map((p,i)=>(originalCore.has(p)||p.explore)?i:null).filter(i=>i!==null);
   if(adds.length){route.summary+=' 已加'+adds.length+'个探索站；时刻未自动重排，请先腾出约'+adds.reduce((n,a)=>n+tags[a.id][3],0)+'分钟再出发。';route.export=exportSvg(route,day);urls.set(day,route.export);}
   ROUTES[day]=route;
   document.dispatchEvent(new CustomEvent('itinerarychange',{detail:day}));
   const timeline=document.querySelector(`#day-${day} .timeline`);
   if(adds.length){const note=document.createElement('p');note.className='explore-day-note';note.textContent='已加入'+adds.length+'个探索地点，需另外腾出约'+adds.reduce((n,a)=>n+tags[a.id][3],0)+'分钟。地图已插入候选顺序；基础时刻未顺延，优先用机动段或替换同区店铺。';timeline.before(note);}
   route.points.filter(p=>p.explore).forEach(point=>{const p=lookup[point.place],node=document.createElement('div');node.className='stop explore-added';node.innerHTML=`<div class="time">${safe(point.time)}</div><div><b>${safe(point.name)}</b><p>${safe(point.detail)}</p><a href="${safe(map(p))}" target="_blank" rel="noopener">Naver地图 ↗</a><button data-nearby-place="${p.id}">逛附近 ↗</button><button data-explore-remove="${p.id}">从当天移除</button></div>`;
    const index=route.points.indexOf(point);let anchor=null;
    for(let i=index-1;i>=0&&!anchor;i--){const id=route.points[i].place;if(id)anchor=[...timeline.querySelectorAll('.stop')].find(s=>s.querySelector(`[data-place="${id}"]`)||s.dataset.exploreId===id);}
    node.dataset.exploreId=p.id;if(anchor)anchor.after(node);else timeline.prepend(node);
   });
  }
  const count=saved.added.length;banner.querySelector('strong').textContent=saved.profile?'为你的喜欢，留几站首尔。':'这次首尔，想遇见什么？';banner.querySelector('small').textContent=saved.profile?'偏好已设置'+(count?' · 新增'+count+'个探索地点':' · 查看推荐，选一站加入行程'):'选团体、风景和口味，找到适合你的那几站。';banner.querySelector('button').textContent=saved.profile?'查看我的推荐 ↗':'探索我的喜好 ↗';
 }
 if(saved.added.length||saved.profile)apply();
 let first=true;try{first=!localStorage.getItem(seen);}catch{}
 if(first)setTimeout(()=>{if(!document.querySelector('dialog[open]'))open(banner.querySelector('button'));},450);
})();
