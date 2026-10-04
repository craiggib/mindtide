import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../MindTide.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
const context = vm.createContext({ TextEncoder });
vm.runInContext(`${scripts[0]}\nglobalThis.C=TideCore;`, context);
const subject = {
  id: 'science', name: 'Science',
  stacks: [
    { id: 'a', name: 'Basics', cards: [{ id: 'ca', type: 'standard', front: 'A?', back: 'A', reverse: true, reviews: [{ rating: 'easy' }] }] },
    { id: 'b', name: 'Details', cards: [{ id: 'cb', type: 'pearl', front: 'A {{pearl}}.', back: 'Note', reviews: [{ rating: 'hard' }] }] },
    { id: 'c', name: 'New topic', cards: [{ id: 'cc', type: 'standard', front: 'C?', back: 'C', reviews: [] }] },
    { id: 'empty', name: 'Empty', cards: [] }
  ]
};
const source = html.slice(html.indexOf('  function studySetup('), html.indexOf('  function renderStudy()'));
const elements = new Map();
const filters = ['all', 'easy', 'hard'].map(category => ({
  dataset: { category }, pressed: category === 'all',
  count: { textContent: '' },
  setAttribute(name, value) { if (name === 'aria-pressed') this.pressed = value === 'true'; }
}));
const stacks = subject.stacks.filter(stack => stack.cards.length).map(stack => ({ value: stack.id, checked: true }));
let now = 0;
function element(selector) {
  if (!elements.has(selector)) elements.set(selector, { value: '', textContent: '', focus() {}, addEventListener(type, handler) { this[type] = handler; } });
  return elements.get(selector);
}
Object.assign(context, {
  currentSubject: () => subject,
  findCard: id => subject.stacks.flatMap(stack => stack.cards).find(card => card.id === id),
  esc: value => value,
  difficultyName: value => value === 'easy' ? 'Easy' : 'Hard',
  btn: () => '',
  notify: message => { context.notice = message; },
  route: { page: 'subject', subjectId: 'science' },
  study: null,
  render: () => {},
  renderStudy: () => {},
  performance: { now: () => now },
  setStudyFullscreen: async () => {},
  window: { scrollTo() {} },
  heading: (title, description, action) => `${title} ${description} ${action}`,
  pageError: () => '',
  commit: mutator => mutator({ subjects: [subject] }),
  closeDialog: () => {},
  openDialog: (title, body, actions, handler) => {
    context.body = body;
    context.confirm = handler;
    element('#study-scope').value = 'all';
    element('#study-duration').value = 'unlimited';
  },
  $: (selector, parent) => {
    if (selector === '.study-filter-count') return parent.count;
    if (selector === '#study-filters [aria-pressed="true"]') return filters.find(filter => filter.pressed);
    return element(selector);
  },
  document: {
    querySelectorAll: selector => {
      if (selector === '[data-study-stack]:checked') return stacks.filter(stack => stack.checked);
      if (selector === '#study-filters button') return filters;
      if (selector === '#study-filters [aria-pressed="true"]') return filters.filter(filter => filter.pressed);
      if (selector === '.rating-buttons [data-rating]') return [];
      throw new Error(`Unexpected selector: ${selector}`);
    },
    querySelector: () => stacks.find(stack => stack.checked) || null
  }
});
vm.runInContext(source, context);
vm.runInContext(html.slice(html.indexOf('  function rate('), html.indexOf('  function attemptDate(')), context);
const counts = () => filters.map(filter => Number(filter.dataset.count));
const ids = () => Array.from(context.study.pool, prompt => prompt.id).sort();
const selectFilter = category => {
  for (const filter of filters) filter.pressed = filter.dataset.category === category;
  context.updateStudyFilterCount();
};

context.studySetup();
assert.match(context.body, /Entire subject/);
assert.match(context.body, /Selected stacks/);
assert.match(context.body, /value="empty" disabled/);
assert.deepEqual(counts(), [4, 2, 1]);
assert.equal(element('#study-stack-picker').hidden, true);
element('#study-typed').checked = true;
context.confirm();
assert.deepEqual(ids(), ['ca:forward', 'ca:reverse', 'cb:forward', 'cc:forward']);
assert.equal(context.study.name, 'Science');
assert.equal(context.study.typed, true);
assert.equal(context.study.showSource, true);
assert.equal(context.study.origin.page, 'subject');

context.studySetup();
element('#study-scope').value = 'selected';
stacks.find(stack => stack.value === 'c').checked = false;
element('#study-scope').change();
assert.equal(element('#study-stack-picker').hidden, false);
assert.deepEqual(counts(), [3, 2, 1]);
context.confirm();
assert.deepEqual(ids(), ['ca:forward', 'ca:reverse', 'cb:forward']);
assert.equal(context.study.name, 'Science · 2 stacks');
context.study.revealed = true;
const ratedId = context.study.queue[0].cardId;
context.rate('hard');
assert.equal(context.findCard(ratedId).reviews.at(-1).rating, 'hard');
const originalIds = ids();
for (let i = 0; i < 12; i++) {
  now += 1000;
  await context.advanceStudy();
  assert.ok(originalIds.includes(context.study.queue[0].id));
  assert.deepEqual(ids(), originalIds);
  assert.equal(context.study.revealed, false);
  assert.equal(context.study.response, '');
}
subject.stacks[0].cards[0].reviews = [{ rating: 'easy' }];
selectFilter('hard');
context.confirm();
assert.deepEqual(ids(), ['cb:forward']);

for (const stack of stacks) stack.checked = false;
element('#study-stack-picker').change();
assert.deepEqual(counts(), [0, 0, 0]);
assert.equal(element('#dialog [data-action="dialog-confirm"]').disabled, true);
assert.match(element('#study-selection-count').textContent, /Choose at least one stack/);
assert.throws(() => context.confirm(), /Choose at least one stack/);
selectFilter('easy');
assert.match(element('#study-selection-count').textContent, /Choose at least one stack/);
stacks.find(stack => stack.value === 'b').checked = true;
element('#study-stack-picker').change();
assert.equal(element('#dialog [data-action="dialog-confirm"]').disabled, true);
assert.throws(() => context.confirm(), /No cards have this label/);
selectFilter('all');
context.confirm();
assert.equal(context.study.name, 'Details');
element('#study-scope').value = 'all';
element('#study-scope').change();
assert.deepEqual(counts(), [4, 2, 1]);

context.studySetup('a');
assert.doesNotMatch(context.body, /id="study-scope"/);
context.confirm();
assert.deepEqual(ids(), ['ca:forward', 'ca:reverse']);
assert.equal(context.study.name, 'Basics');
assert.equal(context.study.showSource, false);
context.studySetup(null, context.C.prompts(subject, 'b'));
assert.doesNotMatch(context.body, /id="study-scope"/);
context.confirm();
assert.equal(context.study.name, 'Missed cards');
assert.deepEqual(ids(), ['cb:forward']);
context.studySetup('empty');
assert.match(context.notice, /Add a card to this stack/);
const savedStacks = subject.stacks;
subject.stacks = [];
context.studySetup();
assert.match(context.notice, /Add a card to this subject/);
subject.stacks = savedStacks;

// One pass counts physical cards, not forward/reverse prompts.
context.studySetup();
element('#study-duration').value = 'once';
element('#study-duration').change();
assert.deepEqual(counts(), [3, 1, 1]);
assert.equal(element('#study-selection-count').textContent, '3 cards selected');
context.confirm();
assert.deepEqual(ids(), ['ca:forward', 'cb:forward', 'cc:forward']);
assert.equal(context.study.mode, 'once');
const onceSession = context.study;
for (let index = 0; index < 3; index++) {
  now += 5000;
  await context.advanceStudy();
}
assert.equal(onceSession.completed, true);
assert.equal(onceSession.durationMs, 15000);
assert.equal(onceSession.stats.size, 3);
assert.ok([...onceSession.stats.values()].every(stat => stat.visits === 1 && stat.durationMs === 5000));
await context.advanceStudy();
await context.finishStudy();
assert.equal(onceSession.durationMs, 15000);
context.renderStudySummary();
assert.match(element('#content').innerHTML, /You saw every selected card/);
assert.match(element('#content').innerHTML, /Total duration<\/dt><dd>15s/);
assert.match(element('#content').innerHTML, /Not marked this session<\/dt><dd>3 cards/);

// Open-ended timing aggregates both directions and repeats without counting flips.
context.studySetup('a');
context.confirm();
const endless = context.study;
endless.queue = [...endless.pool];
now += 2000;
endless.revealed = true;
context.rate('easy'); // Selecting an already-saved label still counts in this session.
assert.equal(endless.labels.get('ca'), 'easy');
context.rate('hard'); // The last label wins, with no double-counting.
now += 4000;
await context.advanceStudy();
assert.equal(endless.stats.get('ca').durationMs, 6000);
now += 10000;
await context.advanceStudy();
now += 2000;
await context.finishStudy();
assert.equal(endless.durationMs, 18000);
assert.equal(endless.stats.get('ca').visits, 3);
assert.equal(endless.stats.get('ca').durationMs, 18000);
context.renderStudySummary();
assert.match(element('#content').innerHTML, /Marked Hard<\/dt><dd>1 card/);
assert.match(element('#content').innerHTML, /Marked Easy<\/dt><dd>0 cards/);
assert.match(element('#content').innerHTML, /6s avg \/ visit/);
assert.match(element('#content').innerHTML, /3 visits · 18s total/);
context.rate('easy');
assert.equal(endless.labels.get('ca'), 'hard');

// Ending early includes the currently displayed card and leaves unseen cards out.
context.studySetup();
element('#study-duration').value = 'once';
element('#study-duration').change();
context.confirm();
now += 9000;
await context.finishStudy();
assert.equal(context.study.stats.size, 1);
assert.equal(context.study.durationMs, 9000);
context.renderStudySummary();
assert.match(element('#content').innerHTML, /You saw 1 of 3 selected cards/);

// A fullscreen-exit failure leaves the last card intact and can be retried.
context.studySetup('b');
element('#study-duration').value = 'once';
element('#study-duration').change();
context.confirm();
context.setStudyFullscreen = async () => { throw new Error('Fullscreen blocked'); };
now += 3000;
await assert.rejects(context.advanceStudy(), /Fullscreen blocked/);
assert.equal(context.study.completed, false);
assert.equal(context.study.finishing, false);
assert.equal(context.study.queue.length, 1);
assert.equal(context.study.stats.size, 0);
context.setStudyFullscreen = async () => {};
now += 2000;
await context.advanceStudy();
assert.equal(context.study.completed, true);
assert.equal(context.study.durationMs, 5000);
assert.equal(context.study.stats.get('cb').visits, 1);
assert.equal(context.study.stats.get('cb').durationMs, 5000);
assert.equal(context.studyTime(999), '1s');
assert.equal(context.studyTime(60000), '1m 0s');
assert.equal(context.studyTime(3661000), '1h 1m 1s');
console.log('MindTide study tests passed.');
