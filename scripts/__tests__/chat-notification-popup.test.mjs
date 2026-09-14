import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function mount(initial = []) {
 let state = [], batch = initial, interval, event, cleanup, calls = 0;
 const timers = new Map();let nextTimer=0;
 const mocks = {
  react: {useState:()=>[state, value=>state=typeof value==='function'?value(state):value],useEffect:fn=>cleanup=fn()},
  'react/jsx-runtime': {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  'next/navigation':{useRouter:()=>({push:()=>{}})},
  './SessionProvider':{useSession:()=>({user:{id:'member'}})},
  'lucide-react':{},
  '@/lib/notificationStream':{subscribeNotificationEvent:(_,fn)=>{event=fn;return ()=>{}}},
 };
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ChatMessageToasts.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,require:name=>mocks[name],AbortController,
 EventSource:class {addEventListener(_,fn){event=fn}close(){}},
 fetch:async()=>{calls++;return {ok:true,json:async()=>({messages:batch})}},
 document:{hidden:false,addEventListener(){},removeEventListener(){}},
 setInterval:fn=>{interval=fn;return 1},clearInterval(){},
 setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id),
 });
 const component=exports.default();component.type();
 return {state:()=>state,flush:()=>new Promise(resolve=>setImmediate(resolve)),poll:()=>interval(),batch:value=>batch=value,event:message=>event({data:JSON.stringify(message)}),cleanup:()=>cleanup(),timers,calls:()=>calls};
}
const message=id=>({id,trip_id:'trip',sender_name:'Other traveler',trip_title:'Test trip',preview:'Hello'});
test('fallback suppresses old messages, then shows a new message even without live events',async()=>{
 const s=mount([message('old')]);await s.flush();assert.equal(s.state().length,0);
 s.batch([message('old'),message('new')]);s.poll();await s.flush();assert.equal(s.state()[0].id,'new');
 s.event(message('new'));assert.equal(s.state().length,1);assert.equal(s.timers.size,1);
 [...s.timers.values()][0]();assert.equal(s.state().length,0);s.cleanup();
});
test('live messages display immediately and polling does not duplicate them',async()=>{
 const s=mount();await s.flush();s.event(message('live'));assert.equal(s.state()[0].id,'live');
 s.batch([message('live')]);s.poll();await s.flush();assert.equal(s.timers.size,1);
 s.cleanup();assert.equal(s.timers.size,0);
});
