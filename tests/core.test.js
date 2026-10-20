import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { FORMAT, validateSet, choose, result, restoreAnswers, rich, stem } from '../public/core.js';

const sample = () => ({ id: '2026-10-20', set_hash: 'a'.repeat(64), notes: [], questions: [1,2].map(i => ({ id: `q0${i}`, options: [{ t: 'right', ok: true }, { t: 'wrong', why: 'No' }, { t: 'three' }, { t: 'four' }] })) });
test('a first answer stays immutable and copy matches the importer contract', () => {
  const s = sample();
  let a = choose(s, {}, 'q01', 0, '2026-10-20T10:00:00Z');
  assert.equal(choose(s, a, 'q01', 1), a);
  assert.throws(() => result(s, a), /全問/);
  a = choose(s, a, 'q02', 1);
  const doc = result(s, a);
  assert.equal(doc.format, FORMAT); assert.equal(doc.drill, s.id); assert.equal(doc.total, 2);
  assert.equal(doc.answers.q01.correct, true); assert.equal(doc.answers.q02.correct, false);
});
test('restoration rejects another snapshot, broken choices and forged answers', () => {
  const s = sample(), a = choose(s, {}, 'q01', 0);
  assert.deepEqual(restoreAnswers(s, { set_hash: 'b'.repeat(64), answers: a }), {});
  assert.deepEqual(restoreAnswers(s, { set_hash: s.set_hash, answers: { q01: { ...a.q01, choice: 8 } } }), {});
  assert.deepEqual(restoreAnswers(s, { set_hash: s.set_hash, answers: { q01: { ...a.q01, correct: false } } }), {});
  assert.deepEqual(restoreAnswers(s, { set_hash: s.set_hash, answers: a }), a);
});
test('invalid IDs, duplicate questions and ambiguous answer keys are rejected', () => {
  const s = sample(); assert.equal(validateSet(s), s);
  assert.throws(() => validateSet({ ...s, id: '../private' }));
  assert.throws(() => validateSet({ ...s, questions: [s.questions[0], s.questions[0]] }));
  s.questions[0].options[1].ok = true; assert.throws(() => validateSet(s));
});
test('limited formatting never executes lesson text as HTML', () => {
  assert.equal(rich('<img src=x onerror=alert(1)> **word**'), '&lt;img src=x onerror=alert(1)&gt; <strong>word</strong>');
  assert.equal(stem('I [[was]] ___'), 'I <u>was</u> <span class="blank" aria-label="空所">___</span>');
});
test('every public snapshot is valid and a complete result can be copied', async () => {
  const root = new URL('../public/data/', import.meta.url);
  const catalog = JSON.parse(await readFile(new URL('index.json', root)));
  assert.ok(catalog.length);
  const names = await readdir(root);
  for (const row of catalog) {
    assert.ok(names.includes(`${row.id}.json`));
    const s = validateSet(JSON.parse(await readFile(new URL(`${row.id}.json`, root))));
    assert.equal(row.questions, s.questions.length);
    let answers = {};
    for (const q of s.questions) {
      assert.equal(Object.hasOwn(q, 'source'), false); assert.equal(Object.hasOwn(q, 'item'), false);
      answers = choose(s, answers, q.id, q.options.findIndex(o => o.ok));
    }
    assert.equal(Object.keys(result(s, answers).answers).length, row.questions);
  }
});
