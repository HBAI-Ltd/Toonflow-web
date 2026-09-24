const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
const { reactive, effectScope } = require('vue');
const source = path.resolve(__dirname, '../src/utils/usePreflightSelection.ts');
let usePreflightSelection;
if (fs.existsSync(source)) {
  const result = esbuild.buildSync({ entryPoints: [source], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue'] });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, loaded, loaded.exports);
  usePreflightSelection = loaded.exports.usePreflightSelection;
}
test('running reviews never persist empty initialization; completed review defaults survive and explicit user deselection survives refresh', () => {
  assert.equal(typeof usePreflightSelection, 'function', 'review lifecycle owns selection persistence');
  const saved = new Map();
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const props = reactive({ state: { review: { id: 'r2', status: 'running' } }, sessionKey: 'session' });
  const scope = effectScope();
  const ids = scope.run(() => usePreflightSelection(() => props.state, () => props.sessionKey));
  assert.deepEqual(ids.value, []);
  assert.equal(saved.size, 0);
  props.state.pendingFindings = {
    findings: [
      { findingId: 'yellow', level: '🟡', blockRef: { importId: '12', internalIndex: 3 }, issue: 'yellow' },
      { findingId: 'warning', level: '⚠️', blockRef: { importId: '12', internalIndex: 3 }, issue: 'warning' },
    ], blockingIssues: [],
  };
  assert.deepEqual(ids.value, []);
  assert.equal(saved.size, 0);
  props.state.review.status = 'complete';
  assert.deepEqual(ids.value, ['yellow']);
  assert.equal(saved.size, 0, 'programmatic defaults do not claim to be explicit user choices');
  ids.value = [];
  assert.equal(saved.get('scriptAgent-preflight-selection:session:r2'), '[]');
  props.state = JSON.parse(JSON.stringify(props.state));
  assert.deepEqual(ids.value, [], 'same review refresh preserves explicit empty selection');
  props.state = { review: { id: 'r3', status: 'running' }, pendingFindings: props.state.pendingFindings };
  assert.deepEqual(ids.value, []);
  assert.equal(saved.has('scriptAgent-preflight-selection:session:r3'), false);
  props.state.review.status = 'complete';
  assert.deepEqual(ids.value, ['yellow'], 'new complete review restores its own defaults');
  scope.stop();
});
