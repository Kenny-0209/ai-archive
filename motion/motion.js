(() => {
  'use strict';

  const all = Array.isArray(window.MOTION_CATALOG) ? window.MOTION_CATALOG : [];
  const local = window.MOTION_LOCAL || {};
  const $ = (id) => document.getElementById(id);
  const pageSize = 24;
  const titleSort = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
  const rows = [...all].sort((a, b) => titleSort.compare(a.title, b.title));
  const searchable = rows.map((row) => [row, [row.title, row.group, row.preset || '', ...row.tags].join(' ').toLowerCase()]);
  let shown = pageSize;
  let current = null;
  let opener = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function allowed(value, hostname) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && url.host === hostname && !url.username && !url.password && url.pathname.startsWith('/components/')) {
        return url.href;
      }
    } catch (_) {}
    return '';
  }

  const original = (row) => allowed(row.url, 'www.originkit.dev');
  const media = (url) => allowed(url, 'cdn.originkit.dev');

  function originalLink(row) {
    const node = element('a', 'source', '원본 ↗');
    node.href = original(row);
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    node.setAttribute('aria-label', row.title + ' 원본 새 탭');
    return node;
  }

  function card(row) {
    const article = element('article', 'card');
    const thumb = element('div', 'thumb');
    thumb.setAttribute('aria-hidden', 'true');
    thumb.append(element('span', '', row.title));
    const poster = media(row.poster);
    if (poster) {
      const image = element('img');
      image.src = poster;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => image.remove(), { once: true });
      thumb.append(image);
    }
    const body = element('div', 'card-body');
    body.append(element('p', 'card-type', row.group), element('h2', '', row.title));
    const actions = element('div', 'card-actions');
    const button = element('button', 'control watch', '미리보기');
    button.type = 'button';
    button.setAttribute('aria-label', row.title + ' 미리보기');
    button.addEventListener('click', () => open(row, button));
    actions.append(button, originalLink(row));
    body.append(actions);
    article.append(thumb, body);
    return article;
  }

  function render(focusMore = false) {
    const category = $('category').value;
    const terms = $('query').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const result = searchable
      .filter(([row, text]) => (!category || row.group === category) && terms.every((term) => text.includes(term)))
      .map(([row]) => row);
    const grid = $('grid');
    const oldLength = grid.childElementCount;
    const next = result.slice(0, shown);
    if (focusMore) grid.append(...next.slice(oldLength).map(card));
    else grid.replaceChildren(...next.map(card));
    if (focusMore && next.length > oldLength) grid.children[oldLength].querySelector('button').focus();
    $('count').textContent = `${result.length.toLocaleString('ko-KR')}개 사례${result.length > shown ? ` · ${shown}개 표시` : ''}`;
    $('empty').hidden = result.length !== 0;
    $('more').hidden = result.length <= shown;
  }

  function replaceCase(id) {
    if (location.protocol === 'file:') return;
    const url = new URL(location.href);
    if (id) url.searchParams.set('case', id);
    else url.searchParams.delete('case');
    history.replaceState(null, '', url);
  }

  function show(mode) {
    const stage = $('stage');
    stage.replaceChildren();
    $('show-video').setAttribute('aria-pressed', String(mode === 'video'));
    $('show-live').setAttribute('aria-pressed', String(mode === 'live'));
    const note = $('preview-note');
    if (mode === 'video') {
      const player = element('video');
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      if (media(current.poster)) player.poster = media(current.poster);
      player.addEventListener('error', () => {
        note.textContent = '시연 영상을 불러오지 못했습니다. 직접 체험하거나 원본을 새 탭에서 열 수 있습니다.';
      }, { once: true });
      player.src = media(current.video);
      stage.append(player);
      note.textContent = current.preset
        ? '영상은 기본 시연입니다. 선택한 프리셋은 직접 체험에서 확인할 수 있습니다.'
        : '재생 버튼을 누르면 Origin Kit의 공식 시연 영상을 볼 수 있습니다.';
      return;
    }
    const frame = element('iframe');
    frame.title = current.title + ' · Origin Kit';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.src = original(current);
    stage.append(frame);
    note.textContent = 'Origin Kit의 원본 화면입니다. 여기에 표시되지 않으면 원본을 새 탭에서 열어 주세요.';
  }

  function open(row, trigger) {
    current = row;
    opener = trigger;
    $('preview-title').textContent = row.title;
    $('preview-category').textContent = 'ORIGIN KIT / ' + row.group;
    $('original').href = original(row);
    const asset = local[row.id]?.source;
    $('local-source').hidden = !asset;
    if (asset) $('local-source').href = encodeURI(asset);
    else $('local-source').removeAttribute('href');
    const hasVideo = Boolean(media(row.video));
    $('show-video').hidden = !hasVideo;
    $('preview').showModal();
    show(hasVideo ? 'video' : 'live');
    replaceCase(row.id);
  }

  const categories = [...new Set(rows.map((row) => row.group))].sort(titleSort.compare);
  for (const group of categories) $('category').add(new Option(group, group));
  const changed = () => { shown = pageSize; render(); };
  $('query').addEventListener('input', changed);
  $('category').addEventListener('change', changed);
  $('reset').addEventListener('click', () => {
    $('query').value = '';
    $('category').value = '';
    changed();
    $('query').focus();
  });
  $('more').addEventListener('click', () => { shown += pageSize; render(true); });
  $('show-video').addEventListener('click', () => { if (current) show('video'); });
  $('show-live').addEventListener('click', () => { if (current) show('live'); });
  $('preview').addEventListener('close', () => {
    $('stage').replaceChildren();
    current = null;
    replaceCase(null);
    opener?.focus();
    opener = null;
  });
  render();

  const selected = new URLSearchParams(location.search).get('case');
  const selectedRow = rows.find((row) => row.id === selected);
  if (selectedRow) open(selectedRow, null);
})();
