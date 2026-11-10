const { chromium } = require('/home/hieu/workspace/do-an/bank-ai/frontend/node_modules/playwright');
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const only=process.argv[2]; const shots=process.argv[3]!=='noshot';
const SIZES=[[1280,800],[1366,768],[1440,900],[1920,1080]];
(async()=>{
 const b=await chromium.launch();
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html')&&(!only||f.includes(only))).sort();
 const rep={};
 for(const [w,h] of SIZES){ for(const f of files){
   const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
   await p.goto('file://'+path.join(dir,f));await p.waitForTimeout(300);
   const r=await p.evaluate(()=>{
    const parse=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
    const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
    const L=c=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
    const over=(f,bg)=>({r:f.r*f.a+bg.r*(1-f.a),g:f.g*f.a+bg.g*(1-f.a),b:f.b*f.a+bg.b*(1-f.a),a:1});
    const bgOf=el=>{const chain=[];let e=el;while(e){const s=getComputedStyle(e);const c=parse(s.backgroundColor);if(c.a>0)chain.push(c);if(c.a>=1)break;e=e.parentElement}
      let base={r:255,g:255,b:255,a:1};for(let i=chain.length-1;i>=0;i--)base=over(chain[i],base);return base};
    const out={tgt:[],gold1:0,goldAll:0,rows1:0,rowsAll:0,hmIn:0,tagHm:0,roleBad:0,ai1:null,ow:document.documentElement.scrollWidth-innerWidth,low:[],small:[],nolabel:[],noname:[],tabbad:[],invalid:[],minfs:99,n:0};
    for(const el of document.querySelectorAll('body *')){
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')continue;
      const rc=el.getBoundingClientRect();if(!rc.width&&!rc.height)continue;
      if(el.closest('.sr,.skip'))continue;
      const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
      if(txt){out.n++;let fg=parse(s.color);const bg=bgOf(el);fg=over(fg,bg);const a=L(fg),bb=L(bg);const cr=(Math.max(a,bb)+.05)/(Math.min(a,bb)+.05);
        const fs=parseFloat(s.fontSize);out.minfs=Math.min(out.minfs,fs);
        const large=fs>=24||(fs>=18.66&&parseInt(s.fontWeight)>=700);
        if(parseFloat(s.opacity)<1)out.low.push(['OPACITY',txt.slice(0,25)]);
        if(cr<(large?3:4.5))out.low.push([txt.slice(0,28),cr.toFixed(2)]);
        if(fs<12)out.small.push([txt.slice(0,20),fs]);}
      if(el.matches('input:not([type=hidden]),select,textarea')){const id=el.id;if(!((id&&document.querySelector(`label[for="${id}"]`))||el.closest('label')||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')))out.nolabel.push(el.outerHTML.slice(0,70));
        if(el.getAttribute('aria-invalid')==='true'&&!el.getAttribute('aria-describedby'))out.invalid.push(el.id);}
      if(el.matches('button,a[href],[role=button],[role=tab]')){const n=(el.getAttribute('aria-label')||el.textContent||'').trim();if(!n)out.noname.push(el.outerHTML.slice(0,60));}
      if(el.matches('[aria-selected]')&&!el.matches('[role=tab],[role=option]'))out.tabbad.push(el.outerHTML.slice(0,50));
    }
    const vis=e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);return r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden'};
    for(const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=tab],[role=radio]')){
      if(el.closest('.sr,.skip')||!vis(el))continue;const st=getComputedStyle(el);
      if(el.matches('input[type=radio],input[type=checkbox]')&&el.closest('label')){const r=el.closest('label').getBoundingClientRect();if(r.width>=24&&r.height>=24)continue;}
      if(el.matches('input[type=checkbox],input[type=radio]')&&st.opacity==='0'){const r=el.parentElement.getBoundingClientRect();if(r.width>=24&&r.height>=24)continue;}
      if(el.matches('a')&&st.display==='inline'&&el.closest('p,li,span,td,div.small,.small,.hint,.sub,label,.crumbs,.banner'))continue;
      const r=el.getBoundingClientRect();if(r.width<24||r.height<24)out.tgt.push([(el.getAttribute('aria-label')||el.textContent||el.id||el.tagName).trim().slice(0,22),Math.round(r.width)+'x'+Math.round(r.height)]);}
    const H=innerHeight;
    for(const g of document.querySelectorAll('.btn.gold')){if(!vis(g))continue;out.goldAll++;const r=g.getBoundingClientRect();if(r.top<H)out.gold1++;}
    for(const tr of document.querySelectorAll('tbody tr')){if(!vis(tr))continue;out.rowsAll++;const r=tr.getBoundingClientRect();if(r.bottom<=H)out.rows1++;}
    out.hmIn=document.querySelectorAll('.aib .tag-hm,.aib .hnode').length;out.tagHm=document.querySelectorAll('.tag-hm').length;
    out.roleBad=[...document.querySelectorAll('[role=radio]:not([aria-checked])')].length;
    const kl=document.querySelector('[aria-label="Kết luận của đội agent"]');if(kl){const r=kl.getBoundingClientRect();out.ai1=Math.round(r.bottom)<=H?'đủ':'cắt ('+Math.round(r.bottom)+'>'+H+')';}
    out.h1=document.querySelectorAll('h1').length;out.main=document.querySelectorAll('main').length;out.lang=document.documentElement.lang;
    const sk=document.querySelector('a.skip');out.skip=!!sk&&sk.getAttribute('href')==='#main'&&!!document.getElementById('main');
    out.tablist=[...document.querySelectorAll('[role=tab]')].every(t=>t.closest('[role=tablist]'));
    return out;});
   rep[`${f}@${w}`]=r;
   if(shots&&(only||true))await p.screenshot({path:`/tmp/ds4/after/${f.replace('.html','')}-${w}x${h}.png`,fullPage:false});
   await p.close();}}
 fs.writeFileSync('/tmp/ds4/report.json',JSON.stringify(rep,null,1));
 // tóm tắt
 let bad=0;for(const [k,r] of Object.entries(rep)){const issues=[];
  if(r.ow>0)issues.push('overflowX '+r.ow);if(r.low.length)issues.push('low '+JSON.stringify(r.low.slice(0,4)));if(r.small.length)issues.push('small '+JSON.stringify(r.small.slice(0,3)));
  if(r.nolabel.length)issues.push('nolabel '+r.nolabel.length);if(r.noname.length)issues.push('noname '+r.noname.length);if(r.tabbad.length)issues.push('tabbad');if(r.invalid.length)issues.push('invalid');
  if(r.tgt.length)issues.push('tgt<24 '+r.tgt.length+' '+JSON.stringify(r.tgt.slice(0,3)));if(r.hmIn)issues.push('humanInAI');if(r.roleBad)issues.push('roleBad');if(r.goldAll>1&&!k.startsWith('21-'))issues.push('gold>1');if(r.h1!==1)issues.push('h1='+r.h1);if(r.main!==1)issues.push('main='+r.main);if(r.lang!=='vi')issues.push('lang');if(!r.skip)issues.push('skip');if(!r.tablist)issues.push('tablist');
  if(issues.length){bad++;console.log(k,issues.join(' | '))}}
 console.log('trang x cỡ:',Object.keys(rep).length,'có vấn đề:',bad);
 await b.close();})();
