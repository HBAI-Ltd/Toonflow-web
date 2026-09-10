const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
const source = path.resolve(__dirname, '../src/utils/preflight.ts');
let helpers = {};
if (fs.existsSync(source)) {
  const result = esbuild.buildSync({ entryPoints: [source], bundle: true, platform: 'node', format: 'cjs', write: false });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, loaded, loaded.exports);
  helpers = loaded.exports;
}
const blockRef = { importId: '12', internalIndex: 3 };
const reviewed = {
  passed: false,
  review: { id: 'r1', status: 'complete' },
  pendingFindings: {
    findings: [
      { findingId: 'yellow', level: '🟡', blockRef, issue: '事实不准确' },
      { findingId: 'warning', level: '⚠️', blockRef, issue: '建议补充背景' },
    ],
    blockingIssues: [{ issueId: 'red', blockRef, issue: '缺少依据' }],
  },
};
test('selection defaults yellow on and warning off; restored selection removes stale and red IDs', () => {
  assert.equal(typeof helpers.restorePreflightSelection, 'function', 'selection behavior is implemented');
  assert.deepEqual(helpers.restorePreflightSelection(reviewed, null), ['yellow']);
  assert.deepEqual(helpers.restorePreflightSelection(reviewed, '["warning","red","stale","warning"]'), ['warning']);
  assert.deepEqual(helpers.restorePreflightSelection(reviewed, '[]'), []);
  assert.deepEqual(helpers.restorePreflightSelection(reviewed, '{broken'), ['yellow']);
});
test('repair contains only approved findings and ignore can explicitly bypass red issues', () => {
  assert.equal(typeof helpers.buildPreflightAction, 'function', 'action guard is implemented');
  assert.deepEqual(helpers.buildPreflightAction(reviewed, 'repair', ['warning', 'red', 'stale']), { type: 'repair', reviewId: 'r1', findingIds: ['warning'] });
  assert.equal(helpers.buildPreflightAction(reviewed, 'repair', []), null);
  assert.deepEqual(helpers.buildPreflightAction(reviewed, 'ignore'), { type: 'ignore', reviewId: 'r1' });
  assert.equal(helpers.buildPreflightAction(reviewed, 'proceed'), null);
});
test('persisted candidate requires diff confirmation and matching complete re-review before any continuation', () => {
  assert.equal(typeof helpers.getPreflightPhase, 'function', 'persisted flow is implemented');
  const candidate = { ...reviewed, proposal: { id: 'p1', confirmed: false, blocks: [] } };
  assert.equal(helpers.getPreflightPhase(candidate), 'diff');
  assert.deepEqual(helpers.buildPreflightAction(candidate, 'confirm_diff'), { type: 'confirm_diff', proposalId: 'p1' });
  assert.equal(helpers.buildPreflightAction(candidate, 'ignore'), null);
  assert.equal(helpers.buildPreflightAction(candidate, 'repair', ['yellow']), null);
  candidate.proposal.confirmed = true;
  assert.equal(helpers.getPreflightPhase(candidate), 'awaiting_review');
  assert.equal(helpers.buildPreflightAction(candidate, 'ignore'), null);
  candidate.review = { id: 'r2', status: 'running', proposalId: 'p1' };
  assert.equal(helpers.getPreflightPhase(candidate), 'reviewing');
  candidate.review.status = 'complete';
  assert.equal(helpers.getPreflightPhase(candidate), 'findings');
  assert.deepEqual(helpers.buildPreflightAction(candidate, 'ignore'), { type: 'ignore', reviewId: 'r2' });
});
test('unreviewed, failed, busy and passed states cannot approve; a clean complete review can proceed', () => {
  assert.equal(typeof helpers.buildPreflightAction, 'function');
  for (const state of [undefined, {}, { ...reviewed, review: { id: 'r1', status: 'failed' } }, { ...reviewed, passed: true }]) {
    assert.equal(helpers.buildPreflightAction(state, 'ignore'), null);
  }
  assert.equal(helpers.buildPreflightAction(reviewed, 'ignore', [], true), null);
  assert.deepEqual(helpers.buildPreflightAction({ review: { id: 'clean', status: 'complete' } }, 'proceed'), { type: 'proceed', reviewId: 'clean' });
});

test('discard recovers any persisted proposal using its exact ID while protecting busy and missing states', () => {
  for (const confirmed of [false, true]) {
    for (const status of ['complete', 'failed', 'running']) {
      const state = { ...reviewed, review: { id: 'r2', status }, proposal: { id: 'candidate-exact', confirmed, blocks: [] } };
      assert.deepEqual(helpers.buildPreflightAction(state, 'discard'), { type: 'discard', proposalId: 'candidate-exact' });
      assert.equal(helpers.buildPreflightAction(state, 'discard', [], true), null);
    }
  }
  assert.equal(helpers.buildPreflightAction(reviewed, 'discard'), null);
  assert.equal(helpers.buildPreflightAction(undefined, 'discard'), null);
});
