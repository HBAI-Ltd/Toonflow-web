const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
const vue = require('vue');
const pinia = require('pinia');
Object.assign(globalThis, vue, { defineStore: pinia.defineStore });
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
globalThis.window = { $message: { error() {} } };

async function loadStore() {
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/stores/scriptAgent.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue'],
    tsconfigRaw: { compilerOptions: { baseUrl: path.resolve(__dirname, '..'), paths: { '@/*': ['src/*'] } } },
    plugins: [{ name: 'external-services', setup(build) {
      build.onResolve({ filter: /^(socket\.io-client|@\/utils\/axios|@\/stores\/setting|@\/stores\/project|@\/router)$/ }, args => ({ path: args.path, namespace: 'services' }));
      build.onLoad({ filter: /.*/, namespace: 'services' }, args => ({ loader: 'js', contents: {
        'socket.io-client': 'exports.io = () => globalThis.__socket;',
        '@/utils/axios': 'module.exports = { post: (...args) => globalThis.__post(...args) };',
        '@/stores/setting': 'module.exports = () => ({baseUrl:"test"});',
        '@/stores/project': 'module.exports = () => ({project:{id:"1"}});',
        '@/router': 'module.exports = {currentRoute:{value:{query:{}}}};',
      }[args.path] }));
    } }],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, loaded, loaded.exports);
  return loaded.exports.default;
}

test('reconnect restores preflight and late HTTP snapshots cannot overwrite newer socket review results', async () => {
  pinia.setActivePinia(pinia.createPinia());
  const listeners = new Map();
  const requests = [];
  globalThis.__post = (url, body) => url === '/agents/getMemory' ? Promise.resolve({ data: [] }) : new Promise(resolve => requests.push({ url, body, resolve }));
  globalThis.__socket = {
    connected: true,
    on(event, fn) { listeners.set(event, [...(listeners.get(event) ?? []), fn]); return this; },
    emit() {},
    connect() {},
    disconnect() {},
  };
  const receive = (event, data) => (listeners.get(event) ?? []).forEach(fn => fn(data));
  const createStore = await loadStore();
  const store = createStore({ projectId: '1', importId: 12, merge: true });
  assert.equal(typeof store.getPlanData, 'function', 'server refresh belongs to the session store');
  store.connect();
  await vue.nextTick();
  assert.equal(requests.length, 1, 'already-connected sockets also load persisted state');
  assert.deepEqual(requests[0].body, { projectId: '1', agentType: 'scriptAgent', importId: 12, merge: true });
  receive('preflight:update', { preflight: { review: { id: 'new', status: 'complete' } }, preflightReport: 'new report' });
  requests[0].resolve({ data: { id: 9, data: { preflight: { review: { id: 'stale', status: 'running' } }, preflightReport: 'stale report', script: [] } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.planData.preflight.review.id, 'new');
  assert.equal(store.planData.preflightReport, 'new report');
  receive('connect');
  assert.equal(requests.length, 2);
  requests[1].resolve({ data: { id: 9, data: { preflight: { review: { id: 'persisted', status: 'complete' }, proposal: { id: 'p1', confirmed: false, blocks: [] } }, preflightReport: 'persisted report', script: [] } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.planData.preflight.proposal.id, 'p1');
  assert.equal(store.planData.preflightReport, 'persisted report');
  const save = store.setPlanData();
  assert.equal(Object.hasOwn(requests[2].body.data, 'preflight'), false, 'editing workspace content must not write server-owned approvals');
  requests[2].resolve({ data: {} });
  await save;
  receive('message', { id:'repair-output', role:'assistant', status:'streaming', content:[{id:'repair-text',type:'text',status:'complete',data:'<correctedBlock importId="12" internalIndex="3">完整候选正文</correctedBlock>'}] });
  receive('message:update', {id:'repair-output',status:'complete'});
  assert.doesNotMatch(JSON.stringify(store.messages),/correctedBlock|完整候选正文/,'repair protocol belongs in the diff panel, not the chat text');
  assert.equal(requests.length,3,'candidate XML must never trigger the editable-workspace save callback');
});
