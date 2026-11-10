// Đo chữ bị cắt trong thành phần Đội agent (.at) và mọi phần tử có text-overflow/overflow ẩn
const { chromium } = require('/home/hieu/workspace/do-an/bank-ai/frontend/node_modules/playwright');
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();let bad=0,n=0;
for(const [w,h] of [[1280,800],[1366,768],[1440,900],[1920,1080]]){for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')).sort()){
 const p=await b.newPage({viewport:{width:w,height:h}});await p.goto('file://'+path.join(dir,f));
 const r=await p.evaluate(()=>{const o=[];let at=0;document.querySelectorAll('.at').forEach(()=>at++);
  for(const e of document.querySelectorAll('body *')){if(!e.closest('.at'))continue;const s=getComputedStyle(e);if(s.display==='none')continue;if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&(s.overflow!=='visible'||s.textOverflow==='ellipsis'))o.push(e.className+':'+e.textContent.trim().slice(0,20));
   const t=[...e.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).length;if(t&&s.textOverflow==='ellipsis')o.push('ellipsis '+e.className);}
  return {at,o}});
 if(r.at)n++;if(r.o.length){bad++;console.log(f+'@'+w,JSON.stringify(r.o.slice(0,3)))}await p.close();}}
console.log('lượt đo có thành phần Đội agent:',n,'| lượt có chữ bị cắt:',bad);await b.close()})();
