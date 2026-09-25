import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { encryptStoredChatMessage, decryptStoredChatMessage, readStoredChatMessage } from '../../src/lib/chatServerEncryption.js';
const context={id:'message-1',trip_id:'trip-1',sender_id:'sender-1'};
test('runtime accepts the same surrounding key whitespace as the production validator', () => {
 const old = process.env.CHAT_ENCRYPTION_KEY;
 const key = randomBytes(32).toString('hex');
 try {
  process.env.CHAT_ENCRYPTION_KEY = ` ${key}\r\n`;
  const stored = encryptStoredChatMessage('Hello from mobile 👋', context);
  process.env.CHAT_ENCRYPTION_KEY = key;
  assert.equal(decryptStoredChatMessage(stored, context), 'Hello from mobile 👋');
  process.env.CHAT_ENCRYPTION_KEY = 'invalid';
  assert.throws(() => encryptStoredChatMessage('secret', context), {code:'CHAT_ENCRYPTION_UNAVAILABLE'});
 } finally { if (old === undefined) delete process.env.CHAT_ENCRYPTION_KEY; else process.env.CHAT_ENCRYPTION_KEY = old; }
});
test('server encryption round-trips text and emojis with unique nonces',()=>{
 const old=process.env.CHAT_ENCRYPTION_KEY;process.env.CHAT_ENCRYPTION_KEY=randomBytes(32).toString('hex');
 try {
  const text='Meet in Goa tomorrow ??';const first=encryptStoredChatMessage(text,context);const second=encryptStoredChatMessage(text,context);
  assert.notEqual(first,second);assert.ok(!first.includes(text));assert.equal(decryptStoredChatMessage(first,context),text);
  assert.equal(readStoredChatMessage({...context,message:first,encryption_version:2}),text);
  assert.throws(()=>decryptStoredChatMessage(first,{...context,trip_id:'other-trip'}));
  assert.throws(()=>decryptStoredChatMessage(first,{...context,sender_id:'other-sender'}));
  assert.throws(()=>decryptStoredChatMessage(first,{...context,id:'other-message'}));
  const parts=first.split(':');const tag=Buffer.from(parts[3],'base64');tag[0]^=1;parts[3]=tag.toString('base64');
  assert.throws(()=>decryptStoredChatMessage(parts.join(':'),context));
  process.env.CHAT_ENCRYPTION_KEY=randomBytes(32).toString('hex');assert.throws(()=>decryptStoredChatMessage(first,context));
 }finally{if(old===undefined)delete process.env.CHAT_ENCRYPTION_KEY;else process.env.CHAT_ENCRYPTION_KEY=old;}
});
test('missing key never causes a plaintext fallback, and old formats are preserved',()=>{
 const old=process.env.CHAT_ENCRYPTION_KEY;delete process.env.CHAT_ENCRYPTION_KEY;
 try {
  assert.throws(()=>encryptStoredChatMessage('secret',context),/CHAT_ENCRYPTION_KEY/);
  assert.equal(readStoredChatMessage({...context,message:'legacy',encryption_version:0}),'legacy');
  assert.match(readStoredChatMessage({...context,message:'old PGP ciphertext',encryption_version:1}),/original key/);
  assert.throws(()=>readStoredChatMessage({...context,message:'unknown',encryption_version:99}));
 }finally{if(old!==undefined)process.env.CHAT_ENCRYPTION_KEY=old;}
});
