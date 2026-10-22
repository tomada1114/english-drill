import { ID, validateSet, choose, restoreAnswers, result, escape, rich, stem } from './core.js';

const main = document.querySelector('main');
const label = kind => kind === 'lesson' ? 'レッスン後' : '受講前';
const day = id => id.slice(0, 10).replaceAll('-', '.');
const KEYS = 'HJKL', CHOICE_CODES = ['KeyH', 'KeyJ', 'KeyK', 'KeyL'];
let data, answers = {}, page = 'notes', current = 0, noteIndex = 0, selected = -1;
let storageKey, storageAvailable = true;

async function getJSON(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(response.status === 404 ? 'この問題はまだ公開されていません。' : '問題を読み込めませんでした。');
  return response.json();
}

function setStorageStatus() {
  document.querySelector('#storage-status').textContent = storageAvailable
    ? '回答はこの端末に途中保存します。別の端末とは共有されません。'
    : '途中保存を使えません。解き終えたら、このページを閉じる前に結果をコピーしてください。';
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ set_hash: data.set_hash, answers })); }
  catch { storageAvailable = false; }
  setStorageStatus();
}
function progress() {
  const n = Object.keys(answers).length;
  return `<div class="progress"><label for="progress">回答済み <b>${n} / ${data.questions.length}</b></label><progress id="progress" value="${n}" max="${data.questions.length}"></progress></div>`;
}
function heading(kicker, title, intro = '') {
  return `<div class="page-heading"><p class="eyebrow">${escape(kicker)}</p><h1>${escape(title)}</h1>${intro ? `<p class="intro">${escape(intro)}</p>` : ''}</div>`;
}
function moveFocus() { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function nav(prev, next, action) {
  return `<div class="actions"><button id="prev" class="secondary" ${prev ? '' : 'disabled'}>← 戻る</button><button id="next" class="primary">${next} <span aria-hidden="true">→</span></button></div><p class="keyhelp">${action}</p>`;
}

async function home() {
  const catalog = await getJSON('/data/index.json');
  if (!Array.isArray(catalog)) throw new Error('問題一覧の形式が正しくありません。');
  const rows = catalog.filter(s => ID.test(s.id));
  const latest = ['morning', 'lesson'].map(kind => rows.find(s => s.kind === kind)).filter(Boolean);
  const link = s => `<a class="set-link" href="/?drill=${encodeURIComponent(s.id)}"><span><small>${escape(day(s.id))} · ${label(s.kind)}</small><b>${s.kind === 'lesson' ? 'レッスンで見つけた型を確かめる' : '今日、口に出したい英語を確かめる'}</b><span>${Number(s.questions)}問 · 注意点 ${Number(s.notes)}つ</span></span><span aria-hidden="true">↗</span></a>`;
  main.innerHTML = heading('PRACTICE, ONE QUESTION AT A TIME', '今日の英語を、一問ずつ。', '選んで、確かめて、次へ。キーボードでもスマホでも、自分のペースで進められます。') +
    (latest.length ? `<section class="set-list" aria-label="最新の問題">${latest.map(link).join('')}</section><details class="archive"><summary>これまでの問題（${rows.length}回）</summary>${rows.map(link).join('')}</details>` : '<p>公開されている問題はまだありません。</p>') +
    '<p class="home-note">解き終えたら結果をコピーして、Claude Code または Codex に渡してください。学習記録への保存は、その後に行います。</p>';
}

function notes() {
  const n = data.notes[noteIndex];
  if (!n) { page = 'quiz'; render(); return; }
  main.innerHTML = heading(`${day(data.id)} · ${label(data.kind)} · 注意点 ${noteIndex + 1} / ${data.notes.length}`, n.title, 'まずは今日気をつける言い方を確認しましょう。') +
    `<article class="note"><p class="rule">${rich(n.rule)}</p>${(n.why || []).length ? `<ul>${n.why.map(w => `<li>${rich(w)}</li>`).join('')}</ul>` : ''}<div class="examples">${(n.examples || []).map(e => `<p class="example ${e.good ? 'good' : 'bad'}"><span>${e.good ? '○' : '×'}</span><span lang="en">${rich(e.good || e.bad)}</span></p>`).join('')}</div></article>` +
    nav(noteIndex > 0, noteIndex + 1 < data.notes.length ? '次の注意点' : '問題をはじめる', '<kbd>h</kbd> / <kbd>←</kbd> 戻る　<kbd>l</kbd> / <kbd>→</kbd> / <kbd>Enter</kbd> 次へ');
  document.querySelector('#prev').onclick = () => { if (noteIndex) { noteIndex--; render(true); } };
  document.querySelector('#next').onclick = () => { if (++noteIndex >= data.notes.length) page = 'quiz'; render(true); };
}

function quiz() {
  const q = data.questions[current], a = answers[q.id];
  main.innerHTML = `<div class="quiz-meta"><p class="eyebrow">${day(data.id)} · ${label(data.kind)}</p><button id="review-notes" class="text-button">注意点を読む</button></div>${progress()}` +
    `<article class="question" aria-labelledby="question-title"><div class="question-top"><span class="number">Q${String(current + 1).padStart(2, '0')}</span><span>${escape(q.scene || '')}${q.review ? ' · 復習' : ''}</span></div><h1 id="question-title" class="question-title">${escape(q.ask || '正しいものを選んでください')}</h1><p class="stem" lang="en">${stem(q.stem)}</p><div class="options" role="group" aria-label="選択肢">` +
    q.options.map((o, i) => `<button class="option${i === selected ? ' selected' : ''}${a && o.ok ? ' correct' : ''}${a && a.choice === i && !o.ok ? ' wrong' : ''}" data-choice="${i}" aria-pressed="${i === (a ? a.choice : selected)}" ${a ? 'disabled' : ''}><span class="option-key">${KEYS[i]}</span><span lang="en">${rich(o.t)}</span>${a && o.ok ? '<span class="answer-mark">正解</span>' : ''}</button>`).join('') +
    `</div>${a ? `<section class="feedback ${a.correct ? 'good' : 'bad'}" aria-label="答え合わせ"><h2>${a.correct ? '正解です。' : 'ここを確認しましょう。'}</h2><p>${rich(q.explain)}</p>${!a.correct && q.options[a.choice].why ? `<p class="why">選んだ答えについて：${rich(q.options[a.choice].why)}</p>` : ''}<details><summary>ほかの選択肢の解説</summary>${q.options.filter(o => !o.ok).map(o => `<p><strong lang="en">${rich(o.t)}</strong><br>${rich(o.why)}</p>`).join('')}</details></section>` : ''}</article>` +
    `<div class="actions"><button id="prev" class="secondary" ${current ? '' : 'disabled'}>← 前の問題</button>${a ? `<button id="next" class="primary">${current + 1 === data.questions.length ? '結果を見る' : '次の問題'} →</button>` : `<button id="answer" class="primary" ${selected < 0 ? 'disabled' : ''}>答えを確かめる <kbd>Enter</kbd></button>`}</div><p class="keyhelp"><kbd>h</kbd><kbd>j</kbd><kbd>k</kbd><kbd>l</kbd> 選択肢 1〜4 で答える　<kbd>Enter</kbd> ${a ? '次へ' : '選んだ答えを確かめる'}</p><p id="announcement" class="sr-only" role="status"></p>`;
  document.querySelectorAll('[data-choice]').forEach(b => { b.onclick = () => select(Number(b.dataset.choice)); });
  document.querySelector('#answer')?.addEventListener('click', submit);
  document.querySelector('#prev').onclick = previous;
  document.querySelector('#next')?.addEventListener('click', next);
  document.querySelector('#review-notes').onclick = () => { page = 'notes'; noteIndex = 0; render(true); };
}
function select(i) {
  if (answers[data.questions[current].id]) return;
  selected = i;
  document.querySelectorAll('[data-choice]').forEach((b, j) => { b.classList.toggle('selected', j === i); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
  document.querySelector('#answer').disabled = false;
  document.querySelector(`[data-choice="${i}"]`).focus({ preventScroll: true });
}
function submit() {
  if (selected < 0 || answers[data.questions[current].id]) return;
  answers = choose(data, answers, data.questions[current].id, selected);
  save(); render();
  document.querySelector('#next').focus({ preventScroll: true });
  document.querySelector('#announcement').textContent = answers[data.questions[current].id].correct ? '正解です。' : '答えと解説を確認してください。';
}
function previous() { if (current) { current--; selected = answers[data.questions[current].id]?.choice ?? -1; render(true); } }
function next() {
  if (!answers[data.questions[current].id]) return;
  if (current + 1 < data.questions.length) { current++; selected = answers[data.questions[current].id]?.choice ?? -1; }
  else page = 'summary';
  render(true);
}
function summary() {
  const missing = data.questions.findIndex(q => !answers[q.id]);
  if (missing >= 0) { current = missing; selected = -1; page = 'quiz'; render(true); return; }
  const right = Object.values(answers).filter(a => a.correct).length;
  const wrong = data.questions.filter(q => !answers[q.id].correct);
  main.innerHTML = heading(`${day(data.id)} · ${label(data.kind)}`, '今日のドリル、おつかれさまでした。') +
    `<div class="result-score"><b>${right}<span> / ${data.questions.length}</span></b><p>問 正解</p></div><section class="export"><h2>結果をコピーして、学習記録へ。</h2><p>Claude Code または Codex に貼り付けて、「この結果を取り込んで」と伝えてください。</p><button id="copy" class="primary">結果をコピー</button><p id="copy-status" role="status"></p><details id="copy-fallback"><summary>結果のテキストを表示</summary><label for="result-json">コピーする結果</label><textarea id="result-json" readonly spellcheck="false"></textarea></details></section>` +
    `<section class="review"><h2>${wrong.length ? 'もう一度確認したい問題' : '全問正解です。'}</h2>${wrong.map(q => `<button class="review-link" data-review="${data.questions.indexOf(q)}">Q${data.questions.indexOf(q) + 1}　${escape(q.label)} <span>解説を見る →</span></button>`).join('')}</section><a class="back-home" href="/">問題一覧へ戻る →</a>`;
  const text = JSON.stringify(result(data, answers), null, 2);
  document.querySelector('#result-json').value = text;
  document.querySelector('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText(text); document.querySelector('#copy-status').textContent = 'コピーしました。Claude Code または Codex に貼り付けてください。'; }
    catch { document.querySelector('#copy-fallback').open = true; const ta = document.querySelector('#result-json'); ta.focus(); ta.select(); document.querySelector('#copy-status').textContent = '下の結果を選択してコピーしてください。'; }
  };
  document.querySelectorAll('[data-review]').forEach(b => { b.onclick = () => { current = Number(b.dataset.review); page = 'quiz'; render(true); }; });
}
function render(focus = false) { ({ notes, quiz, summary })[page](); if (focus) moveFocus(); }

window.addEventListener('keydown', e => {
  // Match physical keys (e.code) so Japanese input mode, which reports 'Process' or kana in e.key, still works.
  if (!data || e.repeat || e.ctrlKey || e.metaKey || e.altKey ||
      e.target.closest('input, textarea, select, [contenteditable="true"], summary')) return;
  const code = e.code, enter = code === 'Enter' || code === 'NumpadEnter';
  const take = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (page === 'notes') {
    if (code === 'KeyL' || code === 'ArrowRight' || (enter && (e.target === main || e.target === document.body))) { take(); document.querySelector('#next').click(); }
    if (code === 'KeyH' || code === 'ArrowLeft') { take(); document.querySelector('#prev').click(); }
  } else if (page === 'quiz') {
    const a = answers[data.questions[current].id], choice = CHOICE_CODES.indexOf(code);
    if (!a && choice >= 0) { take(); select(choice); submit(); }
    else if (enter && !e.target.closest('a, button:not([data-choice]):not(#answer):not(#next)')) { take(); a ? next() : submit(); }
  }
}, { capture: true });

(async () => {
  try {
    const id = new URL(location.href).searchParams.get('drill');
    if (!id) { await home(); return; }
    if (!ID.test(id)) throw new Error('問題のURLを確認してください。');
    data = validateSet(await getJSON(`/data/${encodeURIComponent(id)}.json`));
    if (data.id !== id) throw new Error('指定した問題とデータが一致しません。');
    document.title = `${day(id)} ${label(data.kind)} · English Drill`;
    storageKey = `english-drill:v1:${data.id}:${data.set_hash}`;
    try { answers = restoreAnswers(data, JSON.parse(localStorage.getItem(storageKey))); }
    catch { storageAvailable = false; }
    setStorageStatus();
    const firstMissing = data.questions.findIndex(q => !answers[q.id]);
    if (firstMissing === -1) page = 'summary';
    else if (Object.keys(answers).length) { page = 'quiz'; current = firstMissing; }
    else if (!data.notes.length) page = 'quiz';
    render(true);
  } catch (error) {
    main.innerHTML = heading('ENGLISH DRILL', '問題を開けませんでした。', error.message) + '<p>接続を確認して、もう一度お試しください。</p><div class="actions"><a class="secondary" href="/">問題一覧へ</a><button class="primary" id="retry">もう一度読み込む</button></div>';
    document.querySelector('#retry').onclick = () => location.reload();
  }
})();
