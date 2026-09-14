import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/chatDates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Intl,Date});
test('date separators change at midnight in India, regardless of UTC date',()=>{
 assert.equal(exports.chatDateKey('2026-09-14T18:29:59Z'),'2026-09-14');
 assert.equal(exports.chatDateKey('2026-09-14T18:30:00Z'),'2026-09-15');
 assert.equal(exports.chatDateLabel('2026-09-14T18:30:00Z'),'15 September 2026');
 assert.match(exports.chatMessageTime('2026-09-14T18:30:00Z'),/12:00.*am IST/i);
});
