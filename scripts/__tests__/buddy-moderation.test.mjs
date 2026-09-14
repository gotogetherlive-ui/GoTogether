import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks) {
 const source = fs.readFileSync(new URL('../../'+path, import.meta.url), 'utf8');
 const exports = {};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]??require(n),console,Request,Response});
 return exports;
}
function setup() {
 let closed=false; let user={id:'owner'}, target={id:'request',status:'accepted',removed_at:null}, member=true, report=false;
 const notices=[];
 async function query(sql,args) {
  let rows=[];
  if(sql.includes('FROM trips')) rows=[{id:'trip',organizer_id:'owner',is_chat_closed:closed}];
  else if(sql.includes('FROM trip_requests')) rows=[target];
  else if(sql.startsWith('UPDATE trip_requests')) target={...target,status:'rejected',removed_at:'now',removal_reason:args[0]};
  else if(sql.startsWith('DELETE FROM trip_participants')) member=false;
  else if(sql.includes('FROM trip_participants')) rows=member && ['traveler','owner'].includes(args[1]) ? [{id:'membership'}]:[];
  else if(sql.includes('FROM reports')) rows=report?[{id:'report'}]:[];
  else if(sql.startsWith('INSERT INTO messages')) rows=[{id:args[0]}];
  else if(sql.startsWith('INSERT INTO reports')) report=true;
  else throw Error(sql);
  return {rows};
 }
 const mocks={'@/lib/chatServerEncryption':{encryptStoredChatMessage:()=> 'encrypted',readStoredChatMessage:row=>row.message},'@/lib/auth':{getSession:async()=>user},'@/lib/db':{transaction:async fn=>fn({query}),queryOne:async(...a)=>(await query(...a)).rows[0],query:async(sql)=>sql.includes('UNION SELECT organizer_id') ? ['owner', ...(member ? ['traveler'] : [])].filter(id=>id!==user.id).map(user_id=>({user_id})) : [],run:async()=>{}},'@/lib/notificationEvents':{notifyUser:async id=>notices.push(id),notifyAdmins:async()=>notices.push('admins')},'@/lib/admin':{isAdminUser:async u=>u?.id==='admin'}};
 const api=load('src/app/api/chat/[tripId]/members/[userId]/route.ts',mocks);
 return {setClosed:()=>closed=true,setUser:id=>user=id?{id}:null,notices,state:()=>({target,member,report}),act:(action,reason='',id='traveler')=>api.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({action,reason})}),{params:Promise.resolve({tripId:'trip',userId:id})}),chat:load('src/app/api/chat/[tripId]/route.ts',mocks),admin:load('src/app/api/admin/traveler-reports/route.ts',mocks)};
}
test('only organizer can remove; confirmation action revokes membership and records reason',async()=>{
 const s=setup();s.setUser(null);assert.equal((await s.act('remove')).status,401);
 s.setUser('traveler');assert.equal((await s.act('remove','','owner')).status,403);
 s.setUser('owner');assert.equal((await s.act('remove','Our travel plans differ')).status,200);
 assert.equal(s.state().member,false);assert.equal(s.state().target.removal_reason,'Our travel plans differ');assert.deepEqual(s.notices,['traveler','owner']);
 assert.equal((await s.act('remove')).status,409);
 s.setUser('traveler');const context={params:Promise.resolve({tripId:'trip'})};
 assert.equal((await s.chat.GET(new Request('http://localhost'),context)).status,403);
 assert.equal((await s.chat.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({message:'hello'})}),context)).status,403);
});
test('reports are private, validated, deduplicated, and do not remove members',async()=>{
 const s=setup();assert.equal((await s.act('report','short')).status,400);
 s.setUser('outsider');assert.equal((await s.act('report','Harassment in the chat')).status,403);
 s.setUser('owner');assert.equal((await s.act('report','Harassment in the chat')).status,200);
 assert.equal(s.state().member,true);assert.deepEqual(s.notices,['admins']);assert.equal((await s.act('report','Harassment in the chat')).status,409);
 assert.equal((await s.admin.GET()).status,403);s.setUser('admin');assert.equal((await s.admin.GET()).status,200);
});
test('organizer can separately report a removed traveler',async()=>{
 const s=setup();await s.act('remove');assert.equal((await s.act('report','Repeated abusive messages')).status,200);
});

test('closed chat keeps history accessible but rejects messages from organizer and members',async()=>{
 const s=setup();s.setClosed();const ctx={params:Promise.resolve({tripId:'trip'})};
 for(const id of ['owner','traveler']) {s.setUser(id);assert.equal((await s.chat.GET(new Request('http://localhost'),ctx)).status,200);assert.equal((await s.chat.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({message:'hello'})}),ctx)).status,410);}
});

test('new messages notify other current members, excluding the sender',async()=>{
 const s=setup();const ctx={params:Promise.resolve({tripId:'trip'})};
 const send=()=>s.chat.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({message:'hello'})}),ctx);
 assert.equal((await send()).status,200);assert.deepEqual(s.notices,['traveler']);
 s.notices.length=0;s.setUser('traveler');assert.equal((await send()).status,200);assert.deepEqual(s.notices,['owner']);
 s.setUser('owner');await s.act('remove');s.notices.length=0;
 assert.equal((await send()).status,200);assert.deepEqual(s.notices,[]);
});
