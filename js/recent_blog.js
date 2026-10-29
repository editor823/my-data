(()=>{
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const values=new Map(),queued=new Set(),pending=new Set();let identity='',running=false,blocked=null;
 window.recentBlogHtml=keyword=>'<span class="recent-blog" data-recent-keyword="'+esc(keyword)+'"><b>최근 30일 발행 문서수</b><button type="button" class="recent-blog-query" style="padding:6px 12px;border:1px solid #9bb6a6;border-radius:6px;background:#fff;color:#175e4d;font:700 14px sans-serif;cursor:pointer">조회하기</button><span class="recent-blog-result" aria-live="polite"></span><small class="recent-blog-note"></small></span>';
 function keysNow(){
  const keys={...(window.getSavedApiKeys?.()||{}),paidAccessKey:window.getPaidAccessKey?.()||''},next=JSON.stringify(keys);
  if(identity!==next){identity=next;values.clear();blocked=null;}
  return keys;
 }
 function render(keyword,entry){
  document.querySelectorAll('[data-recent-keyword]').forEach(box=>{
   if(box.dataset.recentKeyword!==keyword)return;
   const result=box.querySelector('.recent-blog-result'),note=box.querySelector('.recent-blog-note');
   const button=box.querySelector('.recent-blog-query');button.disabled=false;button.textContent=entry.error?'다시 조회':'조회하기';
   if(entry.error){result.textContent=entry.short||'조회 실패';note.textContent=entry.error;return;}
   const d=entry.data;
   result.textContent=d.recent30.toLocaleString('ko-KR')+'건'+(d.lowerBound?' 이상':'');
   note.textContent='전체 대비 '+(d.lowerBound?'최소 ':'')+d.share.toFixed(2)+'% · 확인 '+new Date(d.measuredAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+(d.lowerBound?' · 최신순 최대 1,000개 확인':'');
   box.title=d.start+'~'+d.end+' · '+d.basis+(d.lowerBound?' · 최대 확인 범위 내 최소치입니다.':'')+' · 확인 '+new Date(d.measuredAt).toLocaleString('ko-KR');
   box.dataset.complete='true';
  });
 }
 async function drain(){
  if(running)return;running=true;
  try{while(queued.size){
   const keyword=queued.values().next().value;queued.delete(keyword);
   try{
   const boxes=[...document.querySelectorAll('[data-recent-keyword]')].filter(b=>b.dataset.recentKeyword===keyword&&b.getClientRects().length);
   if(!boxes.length)continue;
   const keys=keysNow(),scope=identity,hit=values.get(keyword);
   if(hit&&hit.until>Date.now()){render(keyword,hit);continue;}
   if(blocked&&blocked.until>Date.now()){render(keyword,blocked);continue;}
   if(!keys.searchClientId||!keys.searchClientSecret){render(keyword,{short:'API 키 설정 필요',error:'내 API 키 설정에서 블로그 검색 키를 저장해 주세요.'});continue;}
   boxes.forEach(b=>b.querySelector('.recent-blog-result').textContent='조회 중…');
   let entry;
   try{
    const response=await fetch('/api/analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getRecentBlogMetrics',keyword,...keys}),signal:AbortSignal.timeout(45000)});
    const payload=await response.json();if(!response.ok||!payload.success){const error=new Error(payload.error||'최근 문서수 연결을 확인해 주세요.');error.code=payload.code;throw error;}
    entry={data:payload.data,until:Date.now()+900000};
   }catch(e){
    const daily=e.code==='recent_daily_limit',auth=/401|403|인증|권한|발급키/.test(e.message),rate=/429|한도|요청 제한/.test(e.message);
    entry={short:daily?'무료 20개 한도 도달':auth?'API 인증 확인 필요':rate?'호출 한도 도달':'조회 실패',error:daily?'한국시간 자정 초기화 · 유효한 유료키는 일일 제한 없음':auth?'내 API 키 설정에서 블로그 검색 Client ID·Secret과 사용 권한을 확인해 주세요.':rate?'호출 한도 때문에 잠시 후 다시 조회해 주세요.':e.message,until:Date.now()+60000};
    if(scope===identity&&(auth||rate)&&!daily)blocked=entry;
   }
   keysNow();if(scope!==identity){render(keyword,{short:'API 키 변경됨',error:'변경된 키로 다시 조회해 주세요.'});continue;}
   if(values.size>=500)values.clear();values.set(keyword,entry);render(keyword,entry);
   // One request at a time; never hammer NAVER when many rows appear together.
   await new Promise(resolve=>setTimeout(resolve,1200));
   }finally{pending.delete(keyword);}
  }}finally{running=false;}
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('.recent-blog-query');if(!button||button.disabled)return;
  const box=button.closest('[data-recent-keyword]'),keyword=box?.dataset.recentKeyword;if(!keyword)return;
  keysNow();if(pending.has(keyword))return;pending.add(keyword);
  document.querySelectorAll('[data-recent-keyword]').forEach(b=>{if(b.dataset.recentKeyword!==keyword)return;b.querySelector('.recent-blog-query').disabled=true;b.querySelector('.recent-blog-result').textContent='조회 대기 중…';});
  queued.add(keyword);void drain();
 });
})();
