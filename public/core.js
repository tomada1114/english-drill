export const FORMAT = 'english-drill-result/v1';
export const ID = /^\d{4}-\d{2}-\d{2}(?:-lesson)?$/;

export function validateSet(data) {
  if (!data || !ID.test(data.id) || !/^[a-f0-9]{64}$/.test(data.set_hash || '') ||
      !Array.isArray(data.questions) || !data.questions.length) throw new Error('問題データを確認できません。');
  const ids = new Set();
  for (const q of data.questions) {
    if (!q || !/^q\d{2}$/.test(q.id) || ids.has(q.id) || !Array.isArray(q.options) ||
        q.options.length !== 4 || q.options.filter(o => o.ok === true).length !== 1 ||
        !q.options.every(o => typeof o.t === 'string')) throw new Error('選択肢の形式が正しくありません。');
    ids.add(q.id);
  }
  return data;
}

export function choose(data, answers, qid, choice, at = new Date().toISOString()) {
  const q = data.questions.find(q => q.id === qid);
  if (!q || !Number.isInteger(choice) || !q.options[choice]) throw new Error('選択肢を確認してください。');
  if (Object.hasOwn(answers, qid)) return answers;
  const option = q.options[choice];
  return { ...answers, [qid]: { choice, chosen: option.t, correct: option.ok === true, at } };
}

export function restoreAnswers(data, saved) {
  if (!saved || saved.set_hash !== data.set_hash || typeof saved.answers !== 'object' || !saved.answers) return {};
  let answers = {};
  for (const q of data.questions) {
    const a = saved.answers[q.id];
    if (a && Number.isInteger(a.choice) && q.options[a.choice] &&
        a.chosen === q.options[a.choice].t && a.correct === (q.options[a.choice].ok === true) &&
        typeof a.at === 'string') answers = choose(data, answers, q.id, a.choice, a.at);
  }
  return answers;
}

export function result(data, answers) {
  const checked = restoreAnswers(data, { set_hash: data.set_hash, answers });
  if (Object.keys(checked).length !== data.questions.length) throw new Error('全問答えてから結果をコピーしてください。');
  return { format: FORMAT, drill: data.id, set_hash: data.set_hash, total: data.questions.length, answers: checked };
}

const CONTEXT = {
  morning: { name: '受講前', line: 'English Drill: 受講前', about: 'NativeCamp のレッスン前に解く予習ドリルです。直近7日のドリルとレッスンから、今日使いたい言い方と復習を出しています。' },
  lesson: { name: '受講後', line: 'English Drill: 受講後', about: 'NativeCamp のレッスン後に解く復習ドリルです。今日のレッスンで見つかった型と、期日が来た復習を出しています。' },
};

// The clipboard text opens with the context a fresh Claude Code or Codex session needs; the JSON block stays the importer contract.
export function clipboardText(data, answers) {
  const doc = result(data, answers), c = CONTEXT[data.kind] || CONTEXT.morning;
  const right = Object.values(doc.answers).filter(a => a.correct).length;
  const missed = data.questions.map((q, i) => ({ q, i })).filter(({ q }) => !doc.answers[q.id].correct)
    .map(({ q, i }) => `Q${i + 1}${q.label ? `（${q.label}）` : ''}`);
  return [
    `English Drill（${data.id}・${c.name}）を解き終えました。結果を記録してください。`,
    '',
    '## 文脈',
    `- tomada の英語学習の日課（iobsidian vault の daily-partner スキル）のうち、「${c.line}」の行にあたります。`,
    `- ${c.about}`,
    `- 結果: ${right} / ${doc.total} 問正解${missed.length ? `。間違えた問題: ${missed.join('、')}` : '（全問正解）'}`,
    '',
    '## お願い',
    'daily-partner スキルの手順に従って、次をしてください（細かな手順はスキル側に書いてあります）。',
    '1. 下の JSON を english-drill スキルで vault に取り込む。',
    `2. 取り込めたら、Notion の今日のデイリーノートの「${c.line}」にチェックを付ける。`,
    '3. 結果をひとことで伝え、ルーティンの次にやることをリンク付きで案内する。',
    '',
    '```json',
    JSON.stringify(doc, null, 2),
    '```',
    '',
  ].join('\n');
}

export function escape(text = '') {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function rich(text = '') { return escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
export function stem(text = '') { return rich(text).replace(/\[\[(.+?)\]\]/g, '<u>$1</u>').replace(/___/g, '<span class="blank" aria-label="空所">___</span>'); }
