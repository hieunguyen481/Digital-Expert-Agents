// Bộ sinh mockup v2.1: một nguồn dữ liệu mẫu, một danh sách agent, một khung trang dùng chung.
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..');
const P=(d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const IC={
 inbox:P('M3 13l2-8h14l2 8M3 13v6h18v-6M3 13h5l1 2h6l1-2h5'),plus:P('M12 5v14M5 12h14'),
 users:P('M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14c2 .7 3.2 2.5 3.5 6M9 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z'),
 cols:P('M4 4h6v16H4zM14 4h6v16h-6zM6.5 9h1M6.5 13h1M16.5 9h1M16.5 13h1'),chat:P('M4 5h16v11H9l-5 4z'),
 chart:P('M4 20V10M10 20V4M16 20v-7M22 20H2'),book:P('M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11'),
 audit:P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4'),shield:P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'),
 spark:P('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'),
 search:P('M11 5a6 6 0 100 12 6 6 0 000-12zM20 20l-4.5-4.5'),bell:P('M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20h4'),
 lock:P('M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3'),check:P('M5 12.5l4.5 4.5L19 7'),x:P('M6 6l12 12M18 6L6 18'),
 undo:P('M9 7L4 12l5 5M4 12h10a6 6 0 010 12'),alert:P('M12 4l9 16H3zM12 10v4M12 17v.1'),clock:P('M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v4l3 2'),
 chev:P('M6 9l6 6 6-6'),user:P('M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c.7-4 4-6 8-6s7.3 2 8 6'),file:P('M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5'),
 gear:P('M12 9a3 3 0 100 6 3 3 0 000-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1'),
 down:P('M12 4v12M7 11l5 5 5-5M5 20h14'),send:P('M4 12l16-8-6 16-3-7z'),left:P('M15 6l-6 6 6 6'),right:P('M9 6l6 6-6 6'),
};
const ic=(k,cls)=>cls?IC[k].replace('<svg ',`<svg class="${cls}" `):IC[k];
// --- vai trò demo
const ROLES={
 rm:{n:'Nguyễn Minh Anh',t:'Cán bộ tín dụng',i:'NA'},htd:{n:'Lê Thu Hà',t:'Hỗ trợ tín dụng',i:'LH'},td:{n:'Phạm Quốc Bảo',t:'Thẩm định',i:'PB'},
 risk:{n:'Trần Đức Long',t:'Quản lý rủi ro',i:'TL'},comp:{n:'Vũ Hải Yến',t:'Tuân thủ',i:'VY'},app:{n:'Đỗ Thanh Tùng',t:'Cấp phê duyệt',i:'DT'},
 dir:{n:'Hoàng Gia Khánh',t:'Giám đốc',i:'HK'},aud:{n:'Ngô Bích Ngọc',t:'Kiểm toán',i:'NN'},
};
// --- một danh sách agent dùng chung (khớp agent_engine và AgentTeamPanel)
const AGENTS=[
 {k:'planner',n:'Planner',r:'Lập kế hoạch, giao việc',ms:2100,calls:1},
 {k:'credit',n:'Credit',r:'Tài chính: DSCR, DTI, LTV',ms:7700,calls:5},
 {k:'compliance',n:'Compliance',r:'Chính sách và tuân thủ',ms:6300,calls:4},
 {k:'operations',n:'Operations',r:'Hồ sơ, tài sản bảo đảm, vận hành',ms:5100,calls:3},
 {k:'document',n:'Document',r:'Đọc và đối chiếu tài liệu',ms:9500,calls:3},
 {k:'validation',n:'Validation',r:'Kiểm chứng chéo, phản biện',ms:3800,calls:1},
];
const A=Object.fromEntries(AGENTS.map(a=>[a.k,a]));
const fmtS=ms=>(ms/1000).toFixed(1).replace('.',',')+' giây';
const STT={idle:['','Chưa chạy'],run:['ai','Đang chạy'],done:['ok','Xong'],err:['bad','Lỗi'],to:['bad','Quá giờ']};
function fn(k,st,note,h){const a=A[k];const [bc,bt]=STT[st];const cls=st==='to'?'err':st;
 const badge=`<span class="stt badge ${bc}">${bt}</span>`;const tm=st==='done'?`<span class="tm">${fmtS(a.ms)}</span>`:'';
 if(h)return `<div class="fn h ${cls}"><div><b>${a.n}</b><span class="rl">${note||a.r}</span></div><div class="rt">${badge}${tm}</div></div>`;
 return `<div class="fn ${cls}">${badge}<b>${a.n}</b><span class="rl">${note||a.r}</span>${tm}</div>`;}
const Y=[12.5,37.5,62.5,87.5];
const fanOut=`<svg viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden="true">${Y.map(y=>`<path d="M0 50C16 50 16 ${y} 32 ${y}"/>`).join('')}</svg>`;
const fanIn=`<svg viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden="true">${Y.map(y=>`<path d="M0 ${y}C16 ${y} 16 50 32 50"/>`).join('')}</svg>`;
// states: {planner,credit,compliance,operations,document,validation} mỗi giá trị idle|run|done|err|to ; human: 'wait'|'none'|'decided'
function team(states,opt={}){
 const s=k=>states[k]||'idle';
 const note=opt.notes||{};
 const flow=`<div class="flow ${opt.sm?'sm':''}"><div class="one">${fn('planner',s('planner'),note.planner)}</div><div class="cx">${fanOut}</div>
 <div class="col">${['credit','compliance','operations','document'].map(k=>`<div>${fn(k,s(k),note[k],1)}</div>`).join('')}</div><div class="cx">${fanIn}</div>
 <div class="one">${fn('validation',s('validation'),note.validation)}</div></div>`;
 const hum=opt.human===false?'':`<div class="hdown" aria-hidden="true"></div><div class="hnode ${opt.human==='wait'?'wait':''}"><span class="tag-hm">Người quyết định</span><b>Cấp phê duyệt</b><span class="rl">${opt.humanNote||'AI chỉ đề xuất, không tự phê duyệt'}</span></div>`;
 return `<div class="teamrow" role="group" aria-label="Sơ đồ đội agent: Planner giao việc cho Credit, Compliance, Operations và Document chạy song song, sau đó Validation kiểm chứng, rồi người quyết định"><div style="padding:var(--s1) 0">${flow}</div>${hum}</div>`;
}
const tagAI=`<span class="tag-ai">${ic('spark')}AI đề xuất</span>`;
const tagHM='<span class="tag-hm">Người quyết định</span>';
const NAV=[['Làm việc',[['viec','02-viec-cua-toi.html','inbox','Việc của tôi'],['tao','17-tao-de-xuat-vay.html','plus','Tạo đề xuất vay'],['kh','18-khach-hang.html','users','Khách hàng'],['dc','19-doi-chieu-danh-sach.html','cols','Đối chiếu tài liệu'],['chat','09-chat.html','chat','Trợ lý']]],
 ['Giám sát và tra cứu',[['ds','06-dashboard-tong-quan.html','chart','Đội agent'],['cs','20-tra-cuu-chinh-sach.html','book','Tra cứu chính sách'],['nk','10-nhat-ky.html','audit','Nhật ký kiểm toán']]]];
const cnt={viec:4};
function demoStrip(role,open){
 const r=ROLES[role]||ROLES.rm;
 const items=Object.entries(ROLES).map(([k,v])=>`<a href="#" role="menuitem" ${k===role?'aria-current="true"':''}><span class="avatar" aria-hidden="true">${v.i}</span><span>${v.n}<small>${v.t}</small></span></a>`).join('');
 return `<div class="demo" role="region" aria-label="Chế độ demo"><b>Chế độ demo</b><span>Dữ liệu mẫu, không ảnh hưởng hồ sơ thật. Quyết định cuối cùng luôn do người có thẩm quyền xác nhận.</span><span class="sw">Đang xem với vai<button class="demo-sw" aria-haspopup="menu" aria-expanded="${open?'true':'false'}">${ic('user')}${r.t}: ${r.n}${ic('chev')}</button></span>${open?`<div class="menu" role="menu" aria-label="Đổi tài khoản demo"><div class="mh">Đổi tài khoản demo. Phiên hiện tại sẽ đóng và bạn đăng nhập lại bằng tài khoản mới.</div>${items}</div>`:''}</div>`;
}
function shell(o){
 const r=ROLES[o.role||'rm'];
 const nav=NAV.map(([g,it])=>`<div class="grp">${g}</div>`+it.map(([k,h,i,l])=>`<a href="${h}" ${o.active===k?'aria-current="page"':''}>${ic(i)}<span>${l}</span>${cnt[k]?`<span class="cnt">${cnt[k]}</span>`:''}</a>`).join('')).join('');
 const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${o.title} · Sổ Tín Dụng</title><link rel="stylesheet" href="app.css">${o.head||''}</head><body>
<a class="skip" href="#main">Bỏ qua điều hướng</a>
${demoStrip(o.role||'rm',o.menu)}
<div class="app"><aside class="side"><div class="brand"><div class="mark"><span>S</span></div><div><div class="name">Sổ Tín Dụng</div><div class="sub">Tín dụng doanh nghiệp</div></div></div><nav class="nav" aria-label="Điều hướng chính">${nav}</nav><div class="foot">Phiên bản demo 2.1</div></aside>
<div class="main"><header class="top"><div class="search" role="search"><label class="sr" for="gs">Tìm hồ sơ, khách hàng, mã số thuế</label>${ic('search')}<input id="gs" class="sr-ph" placeholder="Tìm hồ sơ, khách hàng, mã số thuế" style="border:0;background:none;flex:1;font:inherit;color:var(--ink);outline:none;min-width:0"><kbd>/</kbd></div><div class="user"><button class="bell" aria-label="Thông báo, có 1 mục mới">${ic('bell')}<i></i></button><div class="avatar" aria-hidden="true">${r.i}</div><div class="who"><b>${r.n}</b><span>${r.t}</span></div></div></header>
<main id="main" tabindex="-1" class="page ${o.cls||''}">${o.crumbs?`<nav class="crumbs" aria-label="Vị trí">${o.crumbs}</nav>`:''}
${o.body}</main></div></div>${o.after||''}</body></html>`;
 fs.writeFileSync(path.join(OUT,o.file),html);
}
function ph(title,sub,acts,o={}){return `<div class="ph"><div><h1 ${o.h1style?`style="${o.h1style}"`:''}>${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}${o.meta||''}</div><div class="act">${acts||''}</div></div>`;}
const meta=(arr)=>`<dl class="meta">${arr.map(([k,v,t])=>`<div><dt>${k}</dt><dd ${t?'class="tnum"':''}>${v}</dd></div>`).join('')}</dl>`;
const btn=(t,c='',ico,href)=>`<${href?'a href="'+href+'"':'button type="button"'} class="btn ${c}">${ico?ic(ico):''}${t}</${href?'a':'button'}>`;
const locked=(t,why,id)=>`<div><button type="button" class="btn gold locked" aria-disabled="true" aria-describedby="${id}">${ic('lock')}${t}</button><div class="lockwhy" id="${id}" style="max-width:300px">${ic('lock')}<span>${why}</span></div></div>`;
const stepper=(cur,back)=>{const S=['Soạn đề xuất','Kiểm tra','Thẩm định','Rủi ro','Phê duyệt','Hoàn tất'];let h='';S.forEach((s,i)=>{const st=i<cur?'done':i===cur?(back?'back':'cur'):'';const b=i<cur?ic('check').replace('<svg ','<svg style="width:14px;height:14px" '):(i===cur&&back?'↺':i+1);h+=(i?`<div class="ln ${i<=cur?'done':''}"></div>`:'')+`<div class="st ${st}" ${i===cur?'aria-current="step"':''}><b>${b}</b>${s}${i===cur&&back?' (trả lại)':''}</div>`});return `<div class="stepper" role="group" aria-label="Tiến trình hồ sơ">${h}</div>`;};
const kpi=(l,v,u,h,extra)=>`<div class="kpi ${h?'hero':''}"><div class="l">${l}</div><div class="v">${v}${u?`<small>${u}</small>`:''}</div>${extra||''}</div>`;
const ill=(k)=>{const base='<rect x="26" y="12" width="80" height="72" rx="4" fill="#FBFBF8"/><path d="M26 30h80M44 44h44M44 54h44M44 64h28" stroke-width="1.5" stroke="#AEB3A1"/><path d="M34 12v72" stroke="#B08A3E" stroke-width="2"/>';
 const ex={search:'<circle cx="98" cy="66" r="14" fill="#F0E6CF" stroke="#7A5C22"/><path d="M108 76l10 10" stroke="#7A5C22" stroke-width="3"/>',
 shield:'<path d="M101 50l17 6v13c0 11-7.500 17-17 19-9.500-2-17-8-17-19V56z" fill="#14284B" stroke="#14284B"/><path d="M94 68l5 5 9-10" stroke="#FBFBF8" stroke-width="3"/>',
 bad:'<circle cx="100" cy="68" r="17" fill="#F7DDD9" stroke="#A8281D"/><path d="M100 60v10M100 75v.1" stroke="#A8281D" stroke-width="3"/>',
 clock:'<circle cx="100" cy="68" r="17" fill="#DCE7F6" stroke="#1D4F91"/><path d="M100 58v10l7 4" stroke="#1D4F91" stroke-width="3"/>'}[k];
 return `<svg class="ill" viewBox="0 0 132 96" fill="none" stroke="#14284B" stroke-width="2" stroke-linecap="round" role="img" aria-label="Minh họa">${base}${ex}</svg>`;};
const page=(f,t)=>fs.writeFileSync(path.join(OUT,f),t);
module.exports={fs,OUT,IC,ic,ROLES,AGENTS,A,fmtS,team,fn,tagAI,tagHM,shell,ph,meta,btn,locked,stepper,kpi,ill,page,demoStrip};
