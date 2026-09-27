import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';

const html = fs.readFileSync(new URL('../MindTide.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]);

for (const source of scripts) {
  assert.doesNotThrow(() => new Function(source));
}

assert.match(html, /role="tablist" aria-label="Testing sections"/);
assert.match(html, /role="tab" id="testing-tab-/);
assert.match(html, /role="tabpanel" aria-labelledby="testing-tab-/);
assert.match(html, /data-action="testing-tab"/);
assert.match(html, /\['ArrowLeft','ArrowRight','Home','End'\]/);
assert.match(html, /name="theme"/);
assert.match(html, /Rainforest Frogs/);
assert.match(html, /:root\[data-theme=rainforest\]/);
assert.match(html, /class="shore rainforest-art"/);
assert.match(html, /Outer Space Aliens/);
assert.match(html, /:root\[data-theme=outerspace\]/);
assert.match(html, /class="shore space-art"/);
assert.match(html, /Desert Fossil Dig/);
assert.match(html, /:root\[data-theme=desert\]/);
assert.match(html, /class="shore desert-art"/);
assert.match(html, /class="gecko-scuttle"/);
assert.match(html, /Alpine Field Camp/);
assert.match(html, /:root\[data-theme=alpine\]/);
assert.match(html, /class="shore alpine-art"/);

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

const storage = new Map([
  ['mindtide.vault.v1', JSON.stringify({ version: 2, key: 'sk-test' })]
]);
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
};

new Function(`${scripts[0]}\nglobalThis.__TideCore = TideCore;`)();
const core = globalThis.__TideCore;

const legacyJournal = {
  schemaVersion: 1,
  subjects: [{
    id: 'subject-1',
    name: 'Science',
    stacks: [{
      id: 'stack-1',
      name: 'Basics',
      cards: [{
        id: 'card-1',
        type: 'standard',
        front: 'What is gravity?',
        back: 'A force that attracts masses.',
        reverse: false,
        frontImage: '',
        backImage: '',
        links: [],
        reviews: []
      }]
    }],
    history: [{
      id: 'attempt-1',
      at: '2026-01-01T10:00:00.000Z',
      scopeName: 'Basics',
      stackId: 'stack-1',
      difficulty: 'current',
      model: 'claude-haiku-4-5-20251001',
      durationMs: 12000,
      correct: 1,
      total: 1,
      questions: [{
        promptId: 'card-1:forward',
        cardId: 'card-1',
        stackId: 'stack-1',
        direction: 'forward',
        question: 'How is gravity defined?',
        originalQuestion: 'What is gravity?',
        answer: 'A force that attracts masses.',
        choices: [
          'A force that attracts masses.',
          'A kind of radiation.',
          'A chemical bond.',
          'A unit of temperature.'
        ],
        selected: 0,
        correctIndex: 0,
        cacheKey: 'a'.repeat(64)
      }]
    }]
  }],
  cache: {},
  settings: { model: 'claude-haiku-4-5-20251001' }
};

const migrated = core.validateLibrary(legacyJournal);
const completed = migrated.subjects[0].history[0];
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.settings.theme, 'coastal');
assert.deepEqual(core.THEMES, ['coastal', 'rainforest', 'outerspace', 'desert', 'alpine']);
assert.equal(completed.status, 'complete');
assert.equal(completed.startedAt, legacyJournal.subjects[0].history[0].at);
assert.equal(completed.completedAt, legacyJournal.subjects[0].history[0].at);

const rainforestJournal = structuredClone(migrated);
rainforestJournal.settings.theme = 'rainforest';
const validatedRainforest = core.validateLibrary(rainforestJournal);
assert.equal(validatedRainforest.settings.theme, 'rainforest');

const outerspaceJournal = structuredClone(migrated);
outerspaceJournal.settings.theme = 'outerspace';
const validatedOuterspace = core.validateLibrary(outerspaceJournal);
assert.equal(validatedOuterspace.settings.theme, 'outerspace');

const desertJournal = structuredClone(migrated);
desertJournal.settings.theme = 'desert';
assert.equal(core.validateLibrary(desertJournal).settings.theme, 'desert');

const alpineJournal = structuredClone(migrated);
alpineJournal.settings.theme = 'alpine';
assert.equal(core.validateLibrary(alpineJournal).settings.theme, 'alpine');

const unsupportedTheme = structuredClone(migrated);
unsupportedTheme.settings.theme = 'midnight';
assert.throws(
  () => core.validateLibrary(unsupportedTheme),
  /settings\.theme has an unsupported value/
);
unsupportedTheme.settings.theme = null;
assert.throws(
  () => core.validateLibrary(unsupportedTheme),
  /settings\.theme has an unsupported value/
);

core.save(alpineJournal);
assert.equal(
  JSON.parse(storage.get(core.STORAGE_KEY)).settings.theme,
  'alpine'
);
assert.equal(core.load(legacyJournal).settings.theme, 'alpine');

const pendingJournal = structuredClone(migrated);
pendingJournal.subjects[0].history.unshift({
  id: 'attempt-2',
  status: 'in_progress',
  startedAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:05:00.000Z',
  completedAt: null,
  scopeName: 'Basics',
  stackId: 'stack-1',
  difficulty: 'easy',
  model: 'claude-haiku-4-5-20251001',
  durationMs: 300000,
  correct: null,
  total: 1,
  questions: [{
    ...completed.questions[0],
    selected: null,
    image: ''
  }]
});

const pending = core.validateLibrary(pendingJournal).subjects[0].history[0];
assert.equal(pending.status, 'in_progress');
assert.equal(pending.correct, null);
assert.equal(pending.questions[0].selected, null);

const prompt = core.prompts(migrated.subjects[0])[0];
const shallowKey = await core.cacheKey(prompt, 'shallow', migrated.settings.model);
migrated.cache[shallowKey] = {
  key: shallowKey,
  cardId: prompt.cardId,
  direction: prompt.direction,
  difficulty: 'shallow',
  model: migrated.settings.model,
  version: 2,
  generatedAt: '2026-01-01T10:00:00.000Z',
  question: 'How is gravity defined?',
  choices: ['A kind of radiation.', 'A chemical bond.', 'A unit of temperature.']
};

const legacyEasy = await core.cached(migrated, prompt, 'easy');
assert.equal(legacyEasy?.difficulty, 'shallow');

const generationLibrary = {
  cache: {},
  settings: { model: 'claude-haiku-4-5-20251001' }
};
const prompts = [
  prompt,
  {
    ...prompt,
    id: 'card-2:forward',
    cardId: 'card-2',
    question: 'Photosynthesis',
    answer: 'The process plants use to convert light energy into chemical energy.'
  }
];
let requestNumber = 0;
globalThis.fetch = async (_url, options) => {
  requestNumber++;
  const request = JSON.parse(options.body);
  const sent = JSON.parse(request.messages[0].content).items;
  const outputItems = request.output_config.format.schema.properties.items;
  assert.equal(outputItems.type, 'object');
  assert.equal(outputItems.additionalProperties, false);
  assert.deepEqual(outputItems.required, sent.map(item => item.id));
  assert.deepEqual(Object.keys(outputItems.properties), sent.map(item => item.id));
  assert.deepEqual(
    outputItems.properties[sent[0].id].required,
    ['question', 'choice1', 'choice2', 'choice3', 'choice4', 'choice5']
  );
  const items = Object.fromEntries(sent.map(item => [item.id, item.id === prompt.id
    ? {
        question: 'How is gravity defined?',
        choice1: 'A force that attracts masses.',
        choice2: 'A kind of radiation.',
        choice3: 'A chemical bond.',
        choice4: 'A unit of temperature.',
        choice5: 'A method of cell division.'
      }
    : {
        question: requestNumber === 1 ? 'Photosynthesis' : 'How would you define photosynthesis?',
        choice1: 'The breakdown of rocks by wind.',
        choice2: 'The movement of blood through the heart.',
        choice3: 'The transfer of heat through empty space.',
        choice4: 'The loss of water through leaf pores.',
        choice5: 'The storage of minerals in roots.'
      }]));
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ items }) }]
    })
  };
};

const persist = async entries => {
  for (const entry of entries) generationLibrary.cache[entry.key] = entry;
};

let partialError = '';
try {
  await core.generate(generationLibrary, prompts, 'easy', { onBatch: persist });
} catch (error) {
  partialError = error.message;
}
assert.match(partialError, /card-2:forward/);
assert.doesNotMatch(partialError, /Affected questions: card-1:forward/);
assert.equal(Object.keys(generationLibrary.cache).length, 1);

const generated = await core.generate(generationLibrary, prompts, 'easy', { onBatch: persist });
assert.equal(generated.length, 2);
assert.ok(generated.every(Boolean));
assert.equal(requestNumber, 2);

const incompleteLibrary = {
  cache: {},
  settings: { model: 'claude-haiku-4-5-20251001' }
};
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    stop_reason: 'end_turn',
    content: [{
      type: 'text',
      text: JSON.stringify({
        items: {
          [prompt.id]: {
            question: 'How is gravity defined?',
            choice1: 'A force that attracts masses.',
            choice2: 'A kind of radiation.',
            choice3: 'A chemical bond.',
            choice4: 'A unit of temperature.',
            choice5: 'A method of cell division.'
          }
        }
      })
    }]
  })
});
const persistIncomplete = async entries => {
  for (const entry of entries) incompleteLibrary.cache[entry.key] = entry;
};
let incompleteError = '';
try {
  await core.generate(incompleteLibrary, prompts, 'easy', { onBatch: persistIncomplete });
} catch (error) {
  incompleteError = error.message;
}
assert.match(incompleteError, /card-2:forward was missing from the response/);
assert.match(incompleteError, /retry only these questions/);
assert.doesNotMatch(incompleteError, /Affected questions: card-1:forward/);
assert.equal(Object.keys(incompleteLibrary.cache).length, 1);

const blankLibrary = {
  cache: {},
  settings: { model: 'claude-haiku-4-5-20251001' }
};
const blankPrompt = {
  ...prompt,
  id: 'card-3:forward',
  cardId: 'card-3',
  question: 'Marine reserves protect ____ from fishing pressure.',
  answer: 'spawning biomass'
};
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    stop_reason: 'end_turn',
    content: [{
      type: 'text',
      text: JSON.stringify({
        items: {
          [blankPrompt.id]: {
            question: 'Within marine reserves, fishing pressure is reduced to protect ___.',
            choice1: 'spawning biomass',
            choice2: 'coastal rainfall',
            choice3: 'atmospheric pressure',
            choice4: 'river sediment',
            choice5: 'surface salinity'
          }
        }
      })
    }]
  })
});
const blankGenerated = await core.generate(blankLibrary, [blankPrompt], 'easy', {
  onBatch: async entries => {
    for (const entry of entries) blankLibrary.cache[entry.key] = entry;
  }
});
assert.equal(blankGenerated[0].question, 'Within marine reserves, fishing pressure is reduced to protect ____.');
assert.equal(blankGenerated[0].choices.length, 3);
assert.ok(blankGenerated[0].choices.every(choice => core.normalize(choice) !== core.normalize(blankPrompt.answer)));

// Stack sharing (.mt files)
assert.equal(core.SHARE_FORMAT, 'mindtide-stack');
assert.equal(core.SHARE_EXTENSION, '.mt');
assert.equal(core.shareFileName('Coral Reef Systems!', new Date('2026-02-03T10:00:00Z')), 'coral-reef-systems-2026-02-03.mt');
assert.equal(core.shareFileName('   ', new Date('2026-02-03T10:00:00Z')), 'card-stack-2026-02-03.mt');

const sharedSource = {
  id: 'stack-share',
  name: 'Coral reef systems',
  cards: [
    { id: 'c1', type: 'standard', front: 'What is a polyp?', back: 'A coral animal.', reverse: true, frontImage: '', backImage: '', links: [], reviews: [{ at: '2026-01-01T00:00:00Z', rating: 'easy' }] },
    { id: 'c2', type: 'pearl', front: 'Reefs are built by {{calcium carbonate}}.', back: '', reverse: false, frontImage: '', backImage: '', links: [{ label: 'NOAA', url: 'https://example.com/reef' }], reviews: [] }
  ]
};
const sharePayload = core.buildStackShare(sharedSource);
assert.equal(sharePayload.format, 'mindtide-stack');
assert.equal(sharePayload.version, 1);
assert.deepEqual(sharePayload.stack, { name: 'Coral reef systems' });
assert.equal(sharePayload.cards.length, 2);
assert.ok(sharePayload.cards.every(card => !('id' in card) && !('reviews' in card)));

const roundTrip = core.validateStackShare(JSON.stringify(sharePayload));
assert.equal(roundTrip.name, 'Coral reef systems');
assert.equal(roundTrip.cards.length, 2);
assert.equal(roundTrip.cards[0].reverse, true);
assert.equal(roundTrip.cards[1].type, 'pearl');
assert.equal(roundTrip.cards[1].links[0].url, 'https://example.com/reef');

assert.throws(() => core.buildStackShare({ name: 'Empty', cards: [] }), /cards/);
assert.throws(() => core.validateStackShare('{not json'), /could not be read/);
assert.throws(() => core.validateStackShare({ format: 'mindtide-cards', version: 1, cards: [] }), /card file/i);
assert.throws(() => core.validateStackShare({ schemaVersion: 1, subjects: [] }), /journal backup/i);
assert.throws(() => core.validateStackShare({ ...sharePayload, extra: true }), /Invalid shared stack/);
assert.throws(() => core.validateStackShare({ ...sharePayload, stack: { name: '' } }), /Invalid shared stack/);

// A shared stack is also accepted by the card importer.
const asCards = core.validateCardImport(JSON.stringify(sharePayload));
assert.equal(asCards.length, 2);
assert.throws(() => core.validateLibrary(sharePayload), /Invalid library/);

console.log('MindTide core tests passed.');
