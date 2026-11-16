/* Public Google Maps embed + official Google Maps URLs + Naver search links. */
(() => {
  const categories=[
    ['all','随便逛逛',''],['cafe','咖啡店','카페'],['dessert','甜品 / 面包','디저트 베이커리'],
    ['fashion','衣服 / 买手店','의류 편집샵'],['accessory','饰品 / 包包','액세서리 가방'],
    ['food','美食 / 简餐','음식점'],['convenience','便利店','편의점'],['beauty','美妆 / 香氛','화장품 향수'],['pharmacy','药店','약국']
  ];
  const encode=encodeURIComponent;
  const html=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=document.createElement('dialog');panel.id='nearby-dialog';panel.className='nearby-dialog';
  panel.setAttribute('aria-labelledby','nearby-title');
  panel.innerHTML=`<div class="nearby-header"><div><div class="eyebrow">A LITTLE DETOUR / 看看附近</div><h2 id="nearby-title">这一站附近，还有什么？</h2></div><button class="nearby-close" aria-label="关闭附近地图">×</button></div><p class="nearby-anchor" id="nearby-anchor"></p><div class="nearby-categories" role="group" aria-label="想逛哪一类店">${categories.map(([id,label],i)=>`<button data-nearby-category="${id}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><form class="nearby-search"><label for="nearby-query">自己找一家</label><div><input id="nearby-query" maxlength="80" placeholder="例如 vintage、黑胶店、药店…" autocomplete="off"><button type="submit">搜索附近</button></div></form><div class="nearby-platforms"><a class="nearby-naver" target="_blank" rel="noopener">在 Naver 搜附近 ↗</a><a class="nearby-google" target="_blank" rel="noopener">在 Google 完整地图中查看 ↗</a><a class="nearby-center" target="_blank" rel="noopener">只看中心地点 ↗</a></div><p class="nearby-status" role="status"></p><div class="nearby-frame"><iframe title="Google附近店铺地图" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="eager"></iframe></div><p class="nearby-help">可以拖动、放大、点店铺标记。点评、营业时间和步行距离请打开完整地图确认；周边搜索范围由地图平台决定，不是固定500米。新选的店不会自动改动原来的环线行程。</p>`;
  document.body.append(panel);
  let context=null,category='all',custom='',opener=null;

  function fromPlace(place){
    return {name:place.name,text:place.kr+' '+place.address.replace('旧址：',''),naver:map(place),approx:false};
  }
  function fromPoint(point){
    if(point.place&&lookup[point.place]&&!/待|尚未/.test(lookup[point.place].address))return fromPlace(lookup[point.place]);
    return {name:point.name,text:point.home?'서울 동대문구 장안동':point.query||point.name,approx:!!point.home||/示意|代表点|附近|区域/.test(point.accuracy),naver:null};
  }
  function refresh(){
    if(!context)return;
    const chosen=categories.find(row=>row[0]===category)||categories[0],term=custom||chosen[2];
    const query=term?term+' near '+context.text:context.text;
    const naverQuery=term?context.text+' 근처 '+term:context.text;
    const google='https://www.google.com/maps/search/?api=1&query='+encode(query);
    const center='https://www.google.com/maps/search/?api=1&query='+encode(context.text);
    panel.querySelector('.nearby-anchor').textContent='以「'+context.name+'」为中心'+(context.approx?' · 使用街区范围搜店':'');
    panel.querySelector('.nearby-naver').href='https://map.naver.com/p/search/'+encode(naverQuery);
    panel.querySelector('.nearby-google').href=google;
    panel.querySelector('.nearby-center').href=context.naver||center;
    panel.querySelector('.nearby-status').textContent=term?'正在显示：'+(custom||chosen[1])+' · 可打开完整地图查看店铺详情':'显示中心地点和周围地图标记；点上面的类别可搜更多店。';
    panel.querySelectorAll('[data-nearby-category]').forEach(button=>button.setAttribute('aria-pressed',String(!custom&&button.dataset.nearbyCategory===category)));
    const iframe=panel.querySelector('iframe');
    iframe.src='https://www.google.com/maps?q='+encode(query)+'&output=embed&hl=zh-CN&z=16';
    iframe.title='Google周边地图：'+context.name+' · '+(custom||chosen[1]);
  }
  function open(next,source){
    context=next;category='all';custom='';opener=source;
    panel.querySelector('input').value='';refresh();
    if(!panel.open)panel.showModal();
    document.body.classList.add('nearby-open');panel.scrollTop=0;
    panel.querySelector('.nearby-close').focus({preventScroll:true});
  }
  panel.querySelector('.nearby-close').addEventListener('click',()=>panel.close());
  panel.addEventListener('close',()=>{
    panel.querySelector('iframe').src='about:blank';document.body.classList.remove('nearby-open');
    if(opener?.isConnected)opener.focus({preventScroll:true});
  });
  panel.addEventListener('click',event=>{
    const categoryButton=event.target.closest('[data-nearby-category]');
    if(categoryButton){category=categoryButton.dataset.nearbyCategory;custom='';panel.querySelector('input').value='';refresh();}
    if(event.target===panel){const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)panel.close();}
  });
  panel.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();custom=panel.querySelector('input').value.trim();if(!custom)return;refresh();
  });
  document.addEventListener('click',event=>{
    const placeButton=event.target.closest('[data-nearby-place]');
    if(placeButton&&lookup[placeButton.dataset.nearbyPlace])open(fromPlace(lookup[placeButton.dataset.nearbyPlace]),placeButton);
    const pointButton=event.target.closest('[data-nearby-day]');
    if(pointButton){
      const day=+pointButton.dataset.nearbyDay,index=+pointButton.dataset.nearbyPoint;
      if(ROUTES[day]?.points[index])open(fromPoint(ROUTES[day].points[index]),pointButton);
    }
  });
})();
