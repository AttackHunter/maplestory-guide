const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../market-tools.js');
const rows=[{name:'Gloves Attack Greater',cat:'Scrolls',median:500,reports:20,x:500,trend:{pct:10}},{name:'Gloves Attack Chaos',cat:'Scrolls',median:900,reports:1,x:900,trend:null},{name:'Gloves DEX',cat:'Scrolls',median:700,reports:100,x:700,trend:{pct:-20}},{name:'Leather',cat:'Etc',median:10,reports:40,x:1,trend:null}];
const state={q:'',cat:'all',sort:'price',min:0,saved:false};
test('multiword search combines category, sample and saved filters',()=>{
 assert.deepEqual(M.select(rows,{...state,q:'attack gloves',cat:'Scrolls',min:3},new Set()).map(x=>x.name),['Gloves Attack Greater']);
 assert.deepEqual(M.select(rows,{...state,saved:true},new Set(['Leather'])).map(x=>x.name),['Leather']);
 assert.equal(M.select(rows,{...state,q:'missing'},new Set()).length,0);
});
test('thin samples stay behind reported prices and missing trends sort last',()=>{
 assert.equal(M.select(rows,state,new Set()).at(-1).name,'Gloves Attack Chaos');
 assert.equal(M.select(rows,{...state,sort:'rising'},new Set())[0].name,'Gloves Attack Greater');
 assert.equal(M.select(rows,{...state,sort:'falling'},new Set())[0].name,'Gloves DEX');
});
test('pagination clamps bounds and handles empty results',()=>{
 const many=Array.from({length:126},(_,i)=>i);
 assert.deepEqual(M.page(many,99,50),{rows:many.slice(100),number:3,pages:3,total:126,start:101,end:126});
 assert.equal(M.page([],2,50).start,0);assert.equal(M.page(many,-1,25).number,1);assert.equal(M.page(many,1,999).rows.length,50);
});
test('watchlist sanitizes malformed data, duplicate names and retired items',()=>{
 assert.deepEqual(M.savedNames(['Leather','Leather','<script>',2],rows),['Leather']);assert.deepEqual(M.savedNames({},rows),[]);
});
test('fees and quantities produce conservative whole-meso estimates',()=>{
 assert.deepEqual(M.proceeds(100000,4,3),{gross:400000,net:388000,fee:12000});
 assert.equal(M.proceeds(1,1,3).net,0);assert.equal(M.proceeds(999,2,100).net,0);
 for(const args of [[10,0,3],[10,1.5,3],[10,1,101],[NaN,1,3],[1.2,1,3],[Number.MAX_SAFE_INTEGER,2,3]])assert.equal(M.proceeds(...args),null);
});
const flip={cost:50000,quantity:2,sales:[110000,100000,120000,115000,105000,125000,102000,99000,118000,108000],nextAsk:109999,age:2,daily:25,budget:200000,slots:7,gear:true,rollChecked:true,badRoll:false};
test('gear requires explicit roll and slot verification',()=>{
 assert.equal(M.flip({...flip,rollChecked:false}).status,'incomplete');assert.equal(M.flip({...flip,slots:NaN}).status,'incomplete');
});
test('resale is capped by matching-sale median and next competing ask',()=>{
 const result=M.flip(flip);assert.equal(result.resale,109998);assert.equal(result.profit,113396);assert.equal(result.breakEven,51547);assert.equal(result.status,'priority');
 assert.equal(M.flip({...flip,nextAsk:999999}).resale,110000);
});
test('stale, unaffordable, excluded and low-margin items never become picks',()=>{
 for(const override of [{age:21},{budget:99999},{excluded:true},{cost:108000}])assert.equal(M.flip({...flip,...override}).status,'skip');
 assert.equal(M.flip({...flip,budget:NaN}).status,'incomplete');
 assert.equal(M.flip({...flip,sales:[0]}).status,'incomplete');
 assert.equal(M.flip({...flip,sales:[110000]}).status,'review');
});
test('below-base rolls need both minimum profit and return; slow demand is explicit',()=>{
 const result=M.flip({...flip,cost:96000,badRoll:true});assert.equal(result.status,'review');assert.match(result.message,/Below-base/);
 assert.match(M.flip({...flip,daily:1,age:6}).message,/may already be gone/);
});
test('all inline scripts compile and local assets exist',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
 for(const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^":#]+\.(?:js|css))"/g))assert.ok(fs.existsSync(m[1]),m[1]);
});
