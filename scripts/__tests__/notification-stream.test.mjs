import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('bells and popups share one stream, route events correctly, and release it on logout', () => {
  let opened = 0, closed = 0;
  const handlers = new Map();
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/notificationStream.ts','utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText, { exports, EventSource: class {
    constructor(){opened++;}
    addEventListener(type, handler){handlers.set(type,handler);}
    close(){closed++;}
  }});
  const events=[];
  const desktop=exports.subscribeNotificationEvent('message',()=>events.push('desktop'));
  const mobile=exports.subscribeNotificationEvent('message',()=>events.push('mobile'));
  const popup=exports.subscribeNotificationEvent('chat-message',()=>events.push('popup'));
  assert.equal(opened,1);
  handlers.get('message')({data:'{}'});
  handlers.get('chat-message')({data:'{}'});
  assert.deepEqual(events,['desktop','mobile','popup']);
  desktop();mobile();assert.equal(closed,0);
  popup();assert.equal(closed,1);
  exports.subscribeNotificationEvent('message',()=>{})();
  assert.equal(opened,2);assert.equal(closed,2);
});
