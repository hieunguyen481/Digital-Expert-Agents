const L=require('./lib');const {shell,ph,meta,btn,locked,stepper,kpi,ic,teamLine,tagAI,tagHM,tagMe,page,ROLES,NAVR,BADGE}=L;
const flg={y:'<span class="flag y"><i></i>Vàng</span>',r:'<span class="flag r"><i></i>Đỏ</span>',g:'<span class="flag g"><i></i>Xanh</span>'};
const P1=require('./p1');const {head:h03,stepBack,concl:concl03,kp:kp03,fin,side:side03,box03,TL,done6}=P1;
const row=(n,id,amt,sub,flag,due,act)=>`<tr><td><div class="name">${n}</div><div class="id" style="white-space:nowrap">${id}</div></td><td class="num">${amt}</td><td>${sub}</td><td>${flag}</td><td>${due}</td><td>${act}</td></tr>`;
// ---------- 02b Việc của tôi, vai Cấp phê duyệt (badge pheduyet = 3, rules C)
const body02b=
ph('Hồ sơ chờ phê duyệt','Thứ Ba, 10/11/2026. Có 3 hồ sơ chờ bạn quyết định, 1 hồ sơ hạn hôm nay, 1 hồ sơ trên 100 tỷ đồng chờ phiên Hội đồng.','')+
`<div class="strip" role="group" aria-label="Tóm tắt"><div><span class="v">3</span><span class="l">Chờ phê duyệt</span></div><div><span class="v">1</span><span class="l">Hạn hôm nay<br><span class="badge warn">10/11/2026</span></span></div><div><span class="v">0</span><span class="l">Quá hạn</span></div></div>
<section class="card" aria-labelledby="dsh"><div class="card-h"><h2 id="dsh" style="font-size:16px">Danh sách hồ sơ</h2></div>
<table class="tbl"><thead><tr><th scope="col">Khách hàng và mã hồ sơ</th><th scope="col" class="num">Số tiền (đồng)</th><th scope="col">Nhận từ</th><th scope="col">Cờ</th><th scope="col">Hạn xử lý</th><th scope="col"><span class="sr">Hành động</span></th></tr></thead><tbody>
${row('CTCP Chế biến Gỗ Tây Nguyên','HSV-2026-00189','40.000.000.000','Rủi ro và Tuân thủ, 09/11/2026',flg.y,'<span class="badge warn">Hạn hôm nay</span><div class="small muted">10/11/2026</div>','<a class="btn sm" href="12-ho-so-phe-duyet.html">Mở hồ sơ</a>')}
${row('CTCP Thủy sản Sông Hậu','HSV-2026-00194','24.000.000.000','Rủi ro và Tuân thủ, 09/11/2026',flg.r,'<span class="badge info">Còn 1 ngày làm việc</span><div class="small muted">11/11/2026</div>','<a class="btn sm" href="12-ho-so-phe-duyet.html">Mở hồ sơ</a>')}
${row('TNHH Sản xuất Nhựa An Khang','HSV-2026-00186','18.000.000.000','Rủi ro và Tuân thủ, 09/11/2026',flg.g,'<span class="badge info">Còn 2 ngày làm việc</span><div class="small muted">12/11/2026</div>','<a class="btn sm" href="12-ho-so-phe-duyet.html">Mở hồ sơ</a>')}
${row('CTCP Điện gió Bạc Liêu','HSV-2026-00178','120.000.000.000','Rủi ro và Tuân thủ, 06/11/2026',flg.y,'<span class="badge info">Chờ phiên Hội đồng – có ở đợt 2</span><div class="small muted">Trên 100 tỷ đồng nên do Hội đồng quyết định</div>','<a class="btn sm" href="31-phien-hoi-dong.html">Xem phiên Hội đồng</a>')}
</tbody></table><div class="pager"><span>Hiển thị 1 đến 4 trong 4 hồ sơ</span></div></section>`;
shell({file:'02b-viec-cua-toi-phe-duyet.html',title:'Hồ sơ chờ phê duyệt',role:'app',active:'viec',cls:'narrow',body:body02b});
shell({file:'23-che-do-demo.html',title:'Chế độ demo: đổi tài khoản',role:'app',active:'viec',cls:'narrow',menu:true,body:body02b});


// ---------- 24 Thanh bên theo vai (khớp RAIL_ITEMS trong code; badge theo rules.md mục C)
const ids={rm:'qhkh',htd:'htd',td:'td',risk:'risk',app:'hd',aud:'aud'};
const secs=Object.keys(NAVR).map(k=>{const items=NAVR[k];const n=items.length;return `<section class="card" id="${k==='app'?'pd':ids[k]}" aria-labelledby="h-${k}"><div class="card-h"><h2 id="h-${k}" style="font-size:16px">${ROLES[k].t}</h2><span class="r small muted">Ví dụ: ${ROLES[k].n}</span></div>
<table class="tbl"><thead><tr><th scope="col">Thứ tự</th><th scope="col">Mục điều hướng</th><th scope="col">Đi tới</th><th scope="col" class="num">Badge</th></tr></thead><tbody>${items.map((x,i)=>`<tr><td class="tnum">${i+1}</td><td class="name">${x.l}</td><td class="small muted">${x.h.replace(/#.*/,'')}</td><td class="num">${i===0&&BADGE[k]?BADGE[k]:'<span class="muted">Không</span>'}</td></tr>`).join('')}<tr><td class="tnum">${n+1}</td><td class="name">Trợ lý AI</td><td class="small muted">09-chat.html</td><td class="num"><span class="muted">Không</span></td></tr></tbody></table></section>`}).join('');
shell({file:'24-thanh-ben-theo-vai.html',title:'Thanh bên theo vai',role:'rm',active:'viec',cls:'narrow',body:
ph('Thanh bên theo vai','Mỗi vai có danh sách mục riêng, khớp thanh điều hướng trong ứng dụng. Badge ở mục đầu là số hồ sơ chờ chính vai đó. Vai Quản trị hệ thống chỉ có trang Quản trị nên không minh họa ở đây.','')+
`<div class="stack">${secs}<section class="card" id="hd"><div class="card-h"><h2 style="font-size:16px">Phiên Hội đồng tín dụng</h2></div><div class="card-b"><p class="small muted">Mục này có ở Cấp phê duyệt (xem và ghi quyết định) và Kiểm toán nội bộ (chỉ đọc). Mockup riêng cho phiên Hội đồng chưa có, xem ghi chú ở tài liệu thiết kế.</p></div></section></div>`});

// ---------- 25 / 25b Hồ sơ với panel Trợ lý AI mở và đóng. Khi panel mở và rộng dưới 1360px, mục lục ẩn (rules D5)
const toc=`<nav class="toc" aria-label="Mục lục hồ sơ">${[['Kết luận đội agent','#kl',1],['Chỉ số tài chính','#chi-so'],['Dòng thời gian','#tg']].map(([t,h,c])=>`<a href="${h}" ${c?'aria-current="true"':''}>${t}</a>`).join('')}</nav>`;
const panel=`<aside class="aipanel" aria-label="Trợ lý AI"><div class="aib-h">${ic('spark')}Trợ lý AI${tagAI}<span style="margin-left:auto"><a class="btn sm" href="25b-panel-ai-dong.html" aria-label="Đóng panel Trợ lý AI">${ic('x')}Đóng</a></span></div><div class="scroll"><p class="small muted">Trả lời từ chính sách và hồ sơ HSV-2026-00201. Trợ lý chỉ đề xuất, không quyết định.</p><div class="msg me">Nguồn trả nợ cần nêu những gì?</div><div class="msg bot"><p class="small">Nêu nguồn tiền cụ thể và căn cứ, ví dụ hợp đồng đầu ra và ngày giải ngân dự kiến, rồi đối chiếu báo cáo dòng tiền quý 4 <a class="cite" href="#" aria-label="Nguồn 1: Chính sách cho vay, mục 6.1">[1]</a>.</p></div></div><form class="compose" action="#" style="padding:var(--s3) var(--s4);border-top:1px dashed var(--ai-500)"><label for="pi" class="sr">Câu hỏi cho trợ lý</label><div class="row" style="flex-wrap:nowrap"><input id="pi" class="input" placeholder="Hỏi về hồ sơ này" style="flex:1"><button class="btn pri" type="submit">${ic('send')}Gửi</button></div></form></aside>`;
const tab=`<a class="aitab" href="25-panel-ai-mo.html" aria-label="Mở panel Trợ lý AI">${ic('spark')}Trợ lý AI</a>`;
const dossier=(file,title,open)=>shell({file,title,role:'rm',active:'viec',crumbs:'<a href="02-viec-cua-toi.html">Việc của tôi</a> / HSV-2026-00201',body:
h03(P1.badgeBack,P1.act03)+stepBack()+
`<div class="dossier ${open?'':'closed'}" style="margin-top:var(--s5)">${toc}<div class="stack" style="gap:var(--s5)"><div id="kl">${concl03}</div>${P1.box03}${kp03()}${fin}
<section class="card" id="tg"><div class="card-h"><h2 style="font-size:16px">Dòng thời gian</h2></div><div class="card-b">${TL([['cur ai','10/11/2026 14:32','Đội agent trả kết luận','AI đề xuất, 6 agent'],['','09/11/2026 16:05','Cấp phê duyệt trả về QHKH','Lý do: nguồn trả nợ chưa rõ'],['','28/10/2026 09:00','Nhận hồ sơ','Nguyễn Minh Anh']])}</div></section></div>${open?panel:tab}</div>`});
dossier('25-panel-ai-mo.html','Hồ sơ HSV-2026-00201, panel Trợ lý AI mở',1);
dossier('25b-panel-ai-dong.html','Hồ sơ HSV-2026-00201, panel Trợ lý AI đóng',0);

// ---------- 26 Chi tiết khách hàng (TNHH Dệt may Phúc Lâm, 3 hồ sơ)
shell({file:'26-chi-tiet-khach-hang.html',title:'Khách hàng: TNHH Dệt may Phúc Lâm',role:'rm',active:'kh',crumbs:'<a href="18-khach-hang.html">Khách hàng SME</a> / TNHH Dệt may Phúc Lâm',body:
ph('TNHH Dệt may Phúc Lâm','',btn('Tạo đề xuất vay','pri','plus','17-tao-de-xuat-vay.html'),{h1style:'font-size:30px',meta:meta([['Mã số thuế','0312345678',1],['Ngành','Dệt may'],['Phụ trách','Nguyễn Minh Anh'],['Số hồ sơ','3',1]])})+
`<div class="grid g-main" style="margin-top:var(--s5)"><section class="card" aria-labelledby="hs"><div class="card-h"><h2 id="hs" style="font-size:16px">Hồ sơ vay của khách hàng</h2></div><table class="tbl"><thead><tr><th scope="col">Mã hồ sơ</th><th scope="col" class="num">Số tiền (đồng)</th><th scope="col">Bước hiện tại</th><th scope="col">Cập nhật</th></tr></thead><tbody>
<tr class="sel"><td class="id" style="white-space:nowrap"><a href="03-ho-so-vay.html">HSV-2026-00201</a></td><td class="num">15.000.000.000</td><td>Soạn đề xuất <span class="badge bad">Trả về QHKH</span></td><td class="tnum">09/11/2026</td></tr>
<tr><td class="id" style="white-space:nowrap">HSV-2026-00158</td><td class="num">20.000.000.000</td><td>Hoàn tất <span class="badge ok">Đã giải ngân</span></td><td class="tnum">12/03/2026</td></tr>
<tr><td class="id" style="white-space:nowrap">HSV-2026-00121</td><td class="num">8.000.000.000</td><td>Hoàn tất <span class="badge">Đã tất toán</span></td><td class="tnum">15/09/2025</td></tr></tbody></table></section>
<aside class="card" aria-labelledby="tt"><div class="card-h"><h2 id="tt" style="font-size:16px">Thông tin doanh nghiệp</h2></div><div class="card-b">${meta([['Tên','TNHH Dệt may Phúc Lâm'],['Mã số thuế','0312345678',1],['Vốn điều lệ (theo hồ sơ)','50.000 triệu đồng',1],['Phụ trách','Nguyễn Minh Anh']])}</div></aside></div>`});
