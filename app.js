(() => {
  'use strict';
  const data = Array.isArray(window.ARCHIVE_DATA) ? window.ARCHIVE_DATA : [];
  const analysis = window.ARCHIVE_ANALYSIS || {};
  const $ = (id) => document.getElementById(id);
  const state = { query:'', type:'전체', category:'전체 분야', sort:'curated', limit:18, savedOnly:false };
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem('ai-library-favorites-v1') || '[]')); } catch (_) {}
  const TYPES=['전체','스킬·관련 저장소','도구','참고 사이트','게시물'];
  const isSkill = (item) => ['스킬','스킬 모음','모음 내 스킬'].includes(item.kind);
  const typeMatch = (item) => state.type==='전체' || (state.type==='스킬·관련 저장소' && (isSkill(item)||item.kind==='저장소')) || (state.type==='도구' && item.kind==='도구') || (state.type==='참고 사이트' && item.kind==='참고 사이트') || (state.type==='게시물' && ['Instagram','Threads'].includes(item.kind));
  const categories = ['전체 분야', ...new Set(data.map(x=>x.category))];
  const icon = item => ({'Instagram':'◉','Threads':'@','스킬':'✳','스킬 모음':'✳','모음 내 스킬':'✳','저장소':'⌘','도구':'⌘','참고 사이트':'↗'}[item.kind] || '✦');
  function node(tag, cls, content) { const el=document.createElement(tag); if(cls) el.className=cls; if(content!==undefined) el.textContent=content; return el; }
  function filter() {
    const q=state.query.trim().toLocaleLowerCase();
    const result=data.filter(item=>typeMatch(item) && (state.category==='전체 분야'||item.category===state.category) && (!state.savedOnly||favorites.has(item.id)) && (!q||[item.title,item.url,item.description,item.category,item.kind,item.source,item.detail,...Object.values(analysis[item.id]||{})].join(' ').toLocaleLowerCase().includes(q)));
    if(state.sort==='name') result.sort((a,b)=>a.title.localeCompare(b.title,'ko'));
    if(state.sort==='category') result.sort((a,b)=>a.category.localeCompare(b.category,'ko')||a.title.localeCompare(b.title,'ko'));
    return result;
  }
  function filters() {
    $('typeFilters').replaceChildren(...TYPES.map(type=>{const button=node('button','chip'+(type===state.type?' active':''),type);button.type='button';button.setAttribute('aria-pressed',String(type===state.type));button.addEventListener('click',()=>{state.type=type;state.limit=18;render()});return button;}));
    $('categories').replaceChildren(...categories.map(cat=>{const button=node('button',cat===state.category?'active':'');button.type='button';button.setAttribute('aria-pressed',String(cat===state.category));button.append(node('span','category-name',cat),node('span','',String(cat==='전체 분야'?data.length:data.filter(x=>x.category===cat).length)));button.addEventListener('click',()=>{state.category=cat;state.limit=18;render()});return button;}));
  }
  function showDetail(item) {
    const target=$('dialogContent'), info=analysis[item.id]||{};target.replaceChildren();target.append(node('h2','',item.title));
    const badges=node('div','badges'); for(const value of [item.category,item.kind,item.status])badges.append(node('span','badge',value));target.append(badges);
    const section=(title,text,cls='')=>{if(!text)return;const block=node('section','detail-section '+cls);block.append(node('h3','',title),node('p','',text));target.append(block)};
    section('무엇을 하는 자료인가요?',item.description,'intro');
    section('어디에 활용할 수 있나요?',info.use);
    section('기대할 수 있는 장점',info.good,'positive');
    section('한계와 확인할 점',info.limits,'caution');
    if(item.detail && ['Instagram','Threads'].includes(item.kind)){let d=item.detail.replace(/\*\*/g,'').replace(/^\s*-\s*원문:.*$/gm,'').replace(/^\s*-\s*확인:.*$/gm,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').trim();section('게시물에서 확인한 내용',d)}
    target.append(node('div','meta','출처: '+item.source+' · '+(info.evidence||'')));
    const link=node('a','dialog-link','원문 열기 ↗');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';target.append(link);$('detailDialog').showModal();
  }
  function createCard(item) {
    const article=node('article','card'), info=analysis[item.id]||{}, media=node('div','card-media');
    const placeholder=node('div','media-placeholder');placeholder.append(node('span','',item.kind),node('strong','',item.title),node('small','','원문 이미지 미확인'));media.append(placeholder);
    if(info.image){const img=document.createElement('img');img.src=info.image;img.alt='';img.loading='lazy';img.decoding='async';img.addEventListener('load',()=>{placeholder.hidden=true});img.addEventListener('error',()=>{img.remove();placeholder.hidden=false});media.append(img);}
    const fav=node('button','favorite',favorites.has(item.id)?'★':'☆');fav.type='button';fav.setAttribute('aria-label',item.title+' 저장');fav.setAttribute('aria-pressed',String(favorites.has(item.id)));fav.addEventListener('click',()=>{favorites.has(item.id)?favorites.delete(item.id):favorites.add(item.id);try{localStorage.setItem('ai-library-favorites-v1',JSON.stringify([...favorites]))}catch(_){}render()});media.append(fav);article.append(media);const body=node('div','card-content');body.append(node('h3','',item.title),node('p','',item.description));
    const bottom=node('div','card-bottom'), badges=node('div','badges');badges.append(node('span','badge',item.kind),node('span','badge status',item.status));const btn=node('button','detail-button','자세히 ↗');btn.type='button';btn.addEventListener('click',()=>showDetail(item));bottom.append(badges,btn);body.append(bottom);article.append(body);return article;
  }
  function render(){
    filters(); const result=filter();$('visibleCount').textContent=result.length;$('filterHint').textContent=state.category==='전체 분야'?state.type:state.category;$('cards').replaceChildren(...result.slice(0,state.limit).map(createCard));$('empty').hidden=result.length>0;$('more').hidden=result.length<=state.limit;$('savedToggle').setAttribute('aria-pressed',String(state.savedOnly));$('savedToggle').firstChild.textContent=state.savedOnly?'★ ':'☆ ';
  }
  function clear(){state.query='';state.type='전체';state.category='전체 분야';state.sort='curated';state.limit=18;state.savedOnly=false;$('search').value='';$('sort').value='curated';render()}
  $('totalCount').textContent=data.length;$('skillCount').textContent=data.filter(x=>isSkill(x)||x.kind==='저장소').length;$('postCount').textContent=data.filter(x=>['Instagram','Threads'].includes(x.kind)).length;
  $('search').addEventListener('input',e=>{state.query=e.target.value;state.limit=18;render()});$('sort').addEventListener('change',e=>{state.sort=e.target.value;render()});$('savedToggle').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;state.limit=18;render()});$('more').addEventListener('click',()=>{state.limit+=18;render()});$('clear').addEventListener('click',clear);$('resetEmpty').addEventListener('click',clear);$('closeDialog').addEventListener('click',()=>$('detailDialog').close());$('detailDialog').addEventListener('click',e=>{if(e.target===$('detailDialog'))$('detailDialog').close()});document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea/i.test(document.activeElement.tagName)&&!$('detailDialog').open){e.preventDefault();$('search').focus()}});
  render();
})();
