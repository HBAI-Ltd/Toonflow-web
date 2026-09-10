const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { createSSRApp } = require('vue');
const { renderToString } = require('@vue/server-renderer');
globalThis.localStorage = { getItem() { return null; }, setItem() {} };

async function render(state, report = '') {
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/views/scriptAgent/components/PreflightPanel.vue')],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue'],
    tsconfigRaw: { compilerOptions: { baseUrl: path.resolve(__dirname, '..'), paths: { '@/*': ['src/*'] } } },
    plugins: [{ name: 'render-vue', setup(build) {
      build.onLoad({ filter: /\.vue$/ }, args => {
        const { descriptor } = parse(fs.readFileSync(args.path, 'utf8'), { filename: args.path });
        return { contents: compileScript(descriptor, { id: 'preflight-test', inlineTemplate: true }).content, loader: 'ts' };
      });
      // The report renderer is unrelated to approval visibility and uses browser-only facilities.
      build.onResolve({ filter: /^md-editor-v3$/ }, () => ({ path: 'report', namespace: 'report' }));
      build.onLoad({ filter: /.*/, namespace: 'report' }, () => ({ contents: 'exports.MdPreview = {render() {return null;}};', loader: 'js' }));
    } }],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, loaded, loaded.exports);
  return renderToString(createSSRApp(loaded.exports.default, { state, report, busy: false, connected: true, sessionKey: 'render-test' }));
}
const reviewed = {
  review: { id: 'r1', status: 'complete' },
  pendingFindings: {
    findings: [
      { findingId: 'yellow', level: '🟡', blockRef: { importId: '12', internalIndex: 3 }, issue: 'yellow issue' },
      { findingId: 'warning', level: '⚠️', blockRef: { importId: '12', internalIndex: 3 }, issue: 'warning issue' },
    ],
    blockingIssues: [{ issueId: 'red', blockRef: { importId: '12', internalIndex: 3 }, issue: 'red issue' }],
  },
};
const buttons = html => [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match => match[1]);
test('rendered findings have only repairable checkboxes and an explicit red-inclusive ignore action', async () => {
  const html = await render(reviewed);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
  assert.match(inputs[0], /checked/);
  assert.doesNotMatch(inputs[1], /checked/);
  assert.match(html, /red issue/);
  assert.match(html, /不支持自动修复/);
  assert.deepEqual(buttons(html), ['修复已选问题（1）', '手动忽略并继续']);
});
test('persisted diff renders exact server changes with confirmation or discard available', async () => {
  const html = await render({ ...reviewed, proposal: { id: 'p1', confirmed: false, blocks: [{
    importId: '12', internalIndex: 3, oldText: '<old> & original', newText: '<new> & revised', baseHash: 'hash',
    diff: [{ type: 'remove', text: '<old> & original' }, { type: 'add', text: '<new> & revised' }],
  }] } });
  assert.deepEqual(buttons(html), ['确认差异并复审', '放弃全部候选修改并重审原文']);
  assert.match(html, /class="remove"[^]*&lt;old&gt; &amp; original/);
  assert.match(html, /class="add"[^]*&lt;new&gt; &amp; revised/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 0);
});
test('confirmed diff and stale review expose no approval buttons until its complete re-review arrives', async () => {
  const state = { ...reviewed, proposal: { id: 'p1', confirmed: true, blocks: [] } };
  assert.deepEqual(buttons(await render(state)), ['放弃全部候选修改并重审原文']);
  state.review = { id: 'r2', status: 'running', proposalId: 'p1' };
  assert.deepEqual(buttons(await render(state)), ['放弃全部候选修改并重审原文']);
  state.review.status = 'complete';
  assert.deepEqual(buttons(await render(state)), ['修复已选问题（1）', '手动忽略并继续', '放弃全部候选修改并重审原文']);
});

test('character diff chunks preserve whitespace without adding marker characters to the source text', async () => {
  const html = await render({ ...reviewed, proposal: { id: 'p2', confirmed: false, blocks: [{
    importId: '12', internalIndex: 3, oldText: '太阳是冷的恒星。\n保留下一行', newText: '太阳是热的恒星。\n保留下一行', baseHash: 'hash',
    diff: [{ type: 'equal', text: '太阳是' }, { type: 'remove', text: '冷的' }, { type: 'add', text: '热的' }, { type: 'equal', text: '恒星。\n保留下一行' }],
  }] } });
  const renderedDiff = html.match(/<pre class="diff"[^>]*>([^]*?)<\/pre>/)[1];
  assert.equal(renderedDiff.replace(/<[^>]*>/g, ''), '太阳是冷的热的恒星。\n保留下一行');
});

test('complete findings expose the full audit report by default for user review', async () => {
  const html = await render(reviewed, '完整报告，包含立场与受众建议');
  assert.match(html, /<details\b[^>]*class="report"[^>]*\bopen(?:[\s=>])/);
});
