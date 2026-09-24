const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
globalThis.localStorage = { getItem() { return null; } };

async function loadUseChat() {
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/utils/useChat.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['vue'],
    plugins: [{
      name: 'fake-socket-client',
      setup(build) {
        build.onResolve({ filter: /^socket\.io-client$/ }, () => ({ path: 'fake-socket-client', namespace: 'test' }));
        build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents: 'module.exports.io = (...args) => globalThis.__TOONFLOW_TEST_IO__(...args);',
          loader: 'js',
        }));
      },
    }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports.useChat;
}

function fakeSocket() {
  const listeners = new Map();
  const emitted = [];
  return {
    connected: true,
    emitted,
    receive(event, data) { listeners.get(event)?.(data); },
    on(event, callback) { listeners.set(event, callback); return this; },
    once(event, callback) { listeners.set(event, callback); return this; },
    off(event) { listeners.delete(event); return this; },
    emit(event, data) { emitted.push({ event, data }); return this; },
    connect() { this.connected = true; listeners.get('connect')?.(); return this; },
    disconnect() { this.connected = false; listeners.get('disconnect')?.(); return this; },
  };
}

test('a second Start click is rejected immediately while the first turn awaits server output', async () => {
  const socket = fakeSocket();
  globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({ url: 'test', autoConnect: false, manageLifecycle: false });
  chat.connect();

  assert.equal(chat.chat('开始'), true);
  assert.equal(chat.status.value, 'pending');
  assert.equal(chat.isGenerating.value, true);
  assert.equal(chat.chat('开始'), false);
  assert.equal(socket.emitted.filter(item => item.event === 'chat').length, 1);
  assert.equal(chat.messages.value.filter(item => item.role === 'user').length, 1);
});

test('a disconnected chat does not leave a phantom user message or busy state', async () => {
  const socket = fakeSocket();
  globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({ url: 'test', autoConnect: false, manageLifecycle: false });
  chat.connect();
  socket.connected = false;

  assert.equal(chat.chat('开始'), false);
  assert.equal(chat.status.value, 'idle');
  assert.equal(chat.messages.value.length, 0);
});

test('preflight repair keeps attachments and structured approval and rejects a second action synchronously', async () => {
  const socket = fakeSocket();
  globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({ url: 'test', autoConnect: false, manageLifecycle: false });
  chat.connect();
  const action = { type: 'repair', reviewId: 'review-1', findingIds: ['finding-1'] };
  assert.equal(chat.chat('修复已选问题', [{ name: 'source.txt' }], { preflightAction: action }), true);
  assert.equal(chat.chat('手动忽略并继续', undefined, { preflightAction: { type: 'ignore', reviewId: 'review-1' } }), false);
  assert.deepEqual(socket.emitted.find(item => item.event === 'chat').data, {
    messageId: chat.messages.value[0].id, content: '修复已选问题', attachments: [{ name: 'source.txt' }], preflightAction: action,
  });
});

 test('history restoration keeps newer live output, hides historical XML without callbacks, and matches local user IDs', async () => {
  const socket = fakeSocket();
  globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  let xmlCalls = 0;
  const chat = useChat({url:'test', autoConnect:false, manageLifecycle:false, xmlTags:[{tag:'scriptItem',keepInMessage:false}], onXmlTag(){xmlCalls++;}});
  chat.connect();
  chat.chat('hello');
  const user = chat.messages.value[0];
  assert.equal(socket.emitted[0].data.messageId, user.id);
  let finish;
  const restoration = chat.restoreHistory(() => new Promise(resolve => {finish = resolve;}));
  chat.messages.value.push({id:'live',role:'assistant',status:'complete',content:[{type:'text',data:'newer'}]});
  finish([user,{id:'old',role:'assistant',status:'stop',ext:{interrupted:true},content:[{id:'t',type:'text',status:'pending',data:'saved<scriptItem name="x">hidden</scriptItem>'}]}]);
  await restoration;
  assert.equal(chat.messages.value.filter(m=>m.id===user.id).length,1);
  assert.equal(chat.findMessage('live').content[0].data,'newer');
  assert.equal(chat.findMessage('old').content[0].data,'saved');
  assert.equal(chat.findMessage('old').content[0].status,'stop');
  assert.equal(xmlCalls,0);
  assert.equal(chat.isGenerating.value,false);
});

test('reconnect snapshot fills missed deltas and revision replay adds only output newer than that snapshot', async () => {
  const socket = fakeSocket(); globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({url:'test',autoConnect:false,manageLifecycle:false}); chat.connect();
  socket.receive('message',{id:'a',role:'assistant',status:'streaming',journalRevision:1,ext:{journalRevision:1},content:[{id:'t',type:'text',status:'streaming',data:'A'}]});
  socket.receive('chat:state',{running:true});
  socket.disconnect();
  assert.equal(chat.isGenerating.value,true,'navigation does not unlock the scope');
  socket.connect();
  let finish; const restore = chat.restoreHistory(()=>new Promise(resolve=>{finish=resolve;}));
  socket.receive('content:update',{messageId:'a',contentId:'t',type:'text',strategy:'append',data:'C',journalRevision:3});
  finish([{id:'a',role:'assistant',status:'streaming',ext:{journalRevision:2},content:[{id:'t',type:'text',status:'streaming',data:'AB'}]}]);
  await restore;
  assert.equal(chat.findMessage('a').content[0].data,'ABC');
  socket.receive('message:update',{id:'a',status:'complete',journalRevision:4});
  assert.equal(chat.isGenerating.value,true,'message completion does not unlock before persistence');
  socket.receive('chat:state',{running:false});
  assert.equal(chat.isGenerating.value,false);
});

test('unknown message updates arriving during history load are replayed without duplicating saved deltas', async () => {
  const socket = fakeSocket(); globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({url:'test',autoConnect:false,manageLifecycle:false}); chat.connect();
  let finish; const restore = chat.restoreHistory(()=>new Promise(resolve=>{finish=resolve;}));
  assert.equal(chat.chat('blocked during restoration'),false);
  socket.receive('content:update',{messageId:'a',contentId:'t',type:'text',strategy:'append',data:'B',journalRevision:2});
  socket.receive('content:update',{messageId:'a',contentId:'t',type:'text',strategy:'append',data:'C',journalRevision:3});
  finish([{id:'a',role:'assistant',status:'streaming',ext:{journalRevision:2},content:[{id:'t',type:'text',status:'streaming',data:'AB'}]}]);
  await restore;
  assert.equal(chat.findMessage('a').content[0].data,'ABC');
});

test('stop can target the running scope before its first assistant message and stays locked until persisted', async () => {
  const socket = fakeSocket(); globalThis.__TOONFLOW_TEST_IO__ = () => socket;
  const useChat = await loadUseChat();
  const chat = useChat({url:'test',autoConnect:false,manageLifecycle:false}); chat.connect();
  socket.receive('chat:state',{running:true});
  assert.equal(chat.stopGenerate(),true);
  assert.equal(socket.emitted.at(-1).event,'stop');
  assert.equal(chat.isGenerating.value,true);
});
