/* Daily route maps: geographic order overview, with an independent schematic fallback. */
(() => {
  const maps = new Map();
  const modes = {metro:{color:'#4b60a0',label:'地铁 / 接驳'},walk:{color:'#39785f',label:'步行'},taxi:{color:'#a3422d',label:'打车 / 可替换'},choice:{color:'#89794c',label:'现场选择'}};
  const safe = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nav = point => point.place && lookup[point.place] ? map(lookup[point.place]) : 'https://map.naver.com/p/search/'+encodeURIComponent(point.query || point.name);
  const nodeInfo = point => `<div class="map-time">${safe(point.time)}</div><h4>${safe(point.name)}</h4><p>${safe(point.detail)}</p><p class="map-accuracy">定位：${safe(point.accuracy)}</p><a href="${safe(nav(point))}" target="_blank" rel="noopener">用 Naver 查看 / 导航 ↗</a>${point.place?` <a href="#place-${safe(point.place)}" data-place="${safe(point.place)}">看地点详情 ↗</a>`:''}`;

  ROUTES.forEach((route,day) => {
    const section = document.createElement('section');
    section.className = 'route-map-section';
    section.setAttribute('aria-label',DAYS[day].date+'每日动线地图');
    section.innerHTML = `<div class="map-heading"><div><div class="eyebrow">YOUR DAILY MAP / 每日动线</div><h3>先看方位，再按编号走。</h3></div><a class="map-download" href="${safe(route.export)}" download>保存当天顺序图 ↓</a></div><p class="map-explain">${safe(route.summary)}</p><div class="map-toolbar" role="group" aria-label="地图显示范围"><button data-map-scope="core" aria-pressed="true">${safe(route.coreLabel)}</button><button data-map-scope="all" aria-pressed="false">当天全程（含住宿）</button><button data-map-fit>恢复当前范围</button></div><div class="map-legend">${Object.entries(modes).map(([key,value])=>`<span><i style="background:${value.color}"></i>${value.label}</span>`).join('')}<span>○ 住宿仅为大致区域</span></div><div class="map-layout"><div class="map-main"><div id="route-map-${day}" class="geo-map" aria-label="${DAYS[day].date}可缩放地理地图"></div><p class="map-state" role="status">地图载入后可缩放；点编号查看这一站。</p><div class="map-detail" aria-live="polite">${nodeInfo(route.points[route.core[0]])}</div></div><div class="map-itinerary" aria-label="按顺序浏览地图站点">${route.points.map((point,index)=>`<div class="map-route-item">${index?`<div class="map-transfer" style="color:${modes[point.mode].color}">↓ ${safe(point.leg)}</div>`:''}<button class="route-stop" data-map-stop="${index}" aria-pressed="false"><span class="route-number">${index+1}</span><span><small>${safe(point.time)}</small><strong>${safe(point.name)}</strong>${point.optional?'<em>可选 / 二选一</em>':''}</span></button></div>`).join('')}</div></div><p class="map-footnote">密集编号会自动错开，细灰线指向对应位置。彩色连线与箭头表示游玩顺序，未计算沿街步行、实际轨道线路或实时路况；不要沿直线导航。门店入口以卡片地址和 Naver 当日路线为准。住宿圈依据你提供的 Airbnb 范围图估计。</p><details class="map-schematic"><summary>看完整顺序图（无网络也能看，可保存）</summary><img src="${safe(route.export)}" alt="${DAYS[day].date}每日路线编号、时间与交通顺序示意图；完整文字同右侧列表" loading="lazy"></details>`;
    document.querySelector(`#day-${day} .timeline`).before(section);
    const state = {section,scope:'core',selected:route.core[0],route,map:null,layer:null,markers:new Map(),arrows:[]};
    maps.set(day,state);
    section.addEventListener('click',event => {
      const scope=event.target.closest('[data-map-scope]');
      if(scope){state.scope=scope.dataset.mapScope;if(state.scope==='core'&&!state.route.core.includes(state.selected))state.selected=state.route.core[0];draw(day);const list=state.section.querySelector('.map-itinerary'),item=list.querySelector(`[data-map-stop="${state.selected}"]`);list.scrollTop+=item.getBoundingClientRect().top-list.getBoundingClientRect().top-45;return;}
      if(event.target.closest('[data-map-fit]')){fit(state);return;}
      const stop=event.target.closest('[data-map-stop]');
      if(stop)select(state,+stop.dataset.mapStop,true);
    });
    select(state,state.selected,false);
  });

  function fit(state){
    if(!state.map)return;
    const points=(state.scope==='all'?state.route.points:state.route.core.map(i=>state.route.points[i])).map(p=>p.ll);
    state.map.invalidateSize();
    state.map.fitBounds(L.latLngBounds(points),{padding:[38,38],maxZoom:16,animate:false});
    spreadPins(state);
  }
  function select(state,index,zoom){
    state.selected=index;
    state.section.querySelector('.map-detail').innerHTML=`<span class="detail-number">${index+1}</span>`+nodeInfo(state.route.points[index]);
    state.section.querySelectorAll('[data-map-stop]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.mapStop===index)));
    if(state.map){
      if(zoom){
        if(state.scope==='core'&&!state.route.core.includes(index)){state.scope='all';draw([...maps].find(([_,value])=>value===state)[0]);}
        state.map.setView(state.route.points[index].ll,Math.max(state.map.getZoom(),16),{animate:false});
      }
      state.markers.forEach(({marker,indices})=>{const element=marker.getElement();if(element)element.classList.toggle('pin-selected',indices.includes(index));});
    }
  }
  function arrows(state){
    if(!state.map)return;
    state.arrows.forEach(({marker,from,to,color})=>{
      const a=state.map.latLngToLayerPoint(from),b=state.map.latLngToLayerPoint(to);
      const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
      marker.setIcon(L.divIcon({className:'route-arrow',html:`<span style="color:${color};transform:rotate(${angle}deg)">➜</span>`,iconSize:[20,20],iconAnchor:[10,10]}));
    });
  }
  function spreadPins(state){
    if(!state.map)return;
    const used=[];
    state.markers.forEach(value=>{
      const origin=state.route.points[value.indices[0]].ll;
      const base=state.map.latLngToLayerPoint(origin);
      let position=base;
      for(let attempt=0;attempt<160;attempt++){
        const ring=Math.ceil(attempt/12),angle=(attempt%12)*Math.PI/6;
        const candidate=attempt?L.point(base.x+Math.cos(angle)*ring*29,base.y+Math.sin(angle)*ring*29):base;
        if(used.every(other=>candidate.distanceTo(other)>37)){position=candidate;break;}
      }
      used.push(position);
      const shifted=state.map.layerPointToLatLng(position);value.marker.setLatLng(shifted);
      if(value.leader)value.leader.remove();
      value.leader=position.distanceTo(base)>3?L.polyline([origin,shifted],{color:'#6b756e',weight:1,opacity:.8,interactive:false}).addTo(state.layer):null;
    });
  }
  function draw(day){
    const state=maps.get(day);if(!state)return;
    const status=state.section.querySelector('.map-state');
    state.section.querySelectorAll('[data-map-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapScope===state.scope)));
    if(!window.L){status.textContent='地理地图组件未能加载，请展开下方完整顺序图；编号和导航列表仍可使用。';state.section.querySelector('.map-schematic').open=true;state.section.querySelector('.map-schematic img').loading='eager';return;}
    if(!state.map){
      state.map=L.map('route-map-'+day,{scrollWheelZoom:false,attributionControl:true});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{status.textContent='部分底图未加载；编号与方向线仍可读，也可展开下方顺序图。'}).addTo(state.map);
      state.map.on('zoomend',()=>{arrows(state);spreadPins(state)});
      status.textContent='可拖动、缩放；点编号或下方站名查看时间和导航。连线只表示顺序。';
    }
    if(state.layer)state.layer.remove();
    state.layer=L.layerGroup().addTo(state.map);state.markers.clear();state.arrows=[];
    const indices=state.scope==='all'?state.route.points.map((_,i)=>i):state.route.core;
    indices.forEach((index,n)=>{
      const point=state.route.points[index];
      if(n){
        const previous=state.route.points[indices[n-1]],style=modes[point.mode];
        L.polyline([previous.ll,point.ll],{color:style.color,weight:3,opacity:.85,dashArray:point.mode==='walk'?null:'7 7'}).addTo(state.layer);
        const middle=[(previous.ll[0]+point.ll[0])/2,(previous.ll[1]+point.ll[1])/2];
        const marker=L.marker(middle,{interactive:false,keyboard:false,zIndexOffset:-1000,icon:L.divIcon({className:'route-arrow',html:'',iconSize:[20,20]})}).addTo(state.layer);
        state.arrows.push({marker,from:previous.ll,to:point.ll,color:style.color});
      }
    });
    const groups=new Map();
    indices.forEach(index=>{const point=state.route.points[index],key=point.ll.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index)});
    groups.forEach(indices=>{
      const point=state.route.points[indices[0]],numbers=indices.map(i=>i+1).join('/');
      if(point.home)L.circle(point.ll,{radius:650,color:'#a3422d',weight:1,dashArray:'5 5',fillColor:'#a3422d',fillOpacity:.10}).addTo(state.layer);
      const marker=L.marker(point.ll,{icon:L.divIcon({className:'route-pin'+(point.home?' home-pin':''),html:`<span>${numbers}</span>`,iconSize:[34,34],iconAnchor:[17,17]}),title:indices.map(i=>(i+1)+' '+state.route.points[i].name).join(' / '),alt:point.name,keyboard:true}).addTo(state.layer);
      marker.bindTooltip(indices.map(i=>(i+1)+' '+safe(state.route.points[i].name)).join('<br>'),{direction:'top',offset:[0,-15]});
      marker.on('click',()=>select(state,indices[0],false));state.markers.set(indices[0],{marker,indices});
    });
    fit(state);arrows(state);spreadPins(state);select(state,state.selected,false);
  }
  document.addEventListener('daychange',event=>requestAnimationFrame(()=>draw(event.detail)));
  draw(0);
})();
