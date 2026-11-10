const L=require('./lib');const {fs,shell,ph,meta,btn,locked,stepper,kpi,ic,team,tagAI,tagHM,page,ill,A,AGENTS}=L;
const fld=(id,l,v,o={})=>`<div class="field ${o.err?'err':''}"><label for="${id}">${l}${o.req?' <span class="req">(bắt buộc)</span>':''}</label><input id="${id}" class="input" ${o.req?'aria-required="true"':''} ${o.err?`aria-invalid="true" aria-describedby="${id}-e"`:''} value="${v||''}" placeholder="${o.ph||''}">${o.err?`<div class="hint" id="${id}-e" style="color:var(--danger-700)">${o.err}</div>`:o.hint?`<div class="hint">${o.hint}</div>`:''}</div>`;

// 17 Tạo đề xuất vay (bước 2)
shell({file:'17-tao-de-xuat-vay.html',title:'Tạo đề xuất vay',role:'rm',active:'tao',crumbs:'<a href="02-viec-cua-toi.html">Việc của tôi</a> / Tạo đề xuất vay',
body:ph('Tạo đề xuất vay','Bước 2 trên 5. Bản nháp tự lưu.',btn('Tiếp: Tài chính','gold','right'),{})+
`<ol class="stepper" aria-label="Các bước" style="margin-bottom:var(--s5)"></ol>
<div class="grid" style="grid-template-columns:200px minmax(0,1fr);gap:var(--s6);align-items:start"><nav aria-label="Các bước tạo đề xuất" class="hist">${['1. Khách hàng','2. Khoản vay','3. Tài chính','4. Tài sản bảo đảm','5. Rà soát và gửi'].map((t,i)=>`<a href="#" ${i===1?'aria-current="step"':''}>${t}${i===0?'<small>Xong</small>':i===1?'<small>Đang nhập</small>':''}</a>`).join('')}</nav>
<form class="card" action="#" aria-label="Khoản vay"><div class="card-h"><h2 style="font-size:16px">Khoản vay</h2><span class="r small muted">Khách hàng: TNHH Dệt may Phúc Lâm</span></div><div class="card-b"><div class="grid g2">
${fld('sotien','Số tiền vay (đồng)','15.000.000.000',{req:1,hint:'Nhập số, hệ thống tự thêm dấu chấm.'})}${fld('kyhan','Kỳ hạn (tháng)','12',{req:1})}
<div class="field"><label for="mdich">Mục đích vay</label><select id="mdich" class="select"><option>Bổ sung vốn lưu động</option></select></div>${fld('lai','Lãi suất đề nghị (%/năm)','',{req:1,err:'Nhập lãi suất, ví dụ 9,5.'})}</div>
<aside class="aib" aria-label="Gợi ý"><div class="aib-h">${ic('spark')}Gợi ý${tagAI}</div><div class="aib-b"><p class="small">Với doanh thu thuần 214.750 triệu đồng, hạn mức vốn lưu động tối đa 70% là khoảng 150 tỷ đồng, cao hơn nhiều so với 15 tỷ đề nghị. Bạn quyết định số tiền.</p></div></aside></div></form></div>`});

// 18 Khách hàng
const kh=[['TNHH Dệt may Phúc Lâm','0312345678','Dệt may','3 hồ sơ','Nguyễn Minh Anh'],['CTCP Thực phẩm An Phát','0108765432','Thực phẩm','1 hồ sơ','Nguyễn Minh Anh'],['TNHH Vận tải Hải Đăng','0201122334','Vận tải','2 hồ sơ','Nguyễn Minh Anh']];
shell({file:'18-khach-hang.html',title:'Khách hàng',role:'rm',active:'kh',body:
ph('Khách hàng','Chỉ hiện khách hàng bạn phụ trách.',btn('Thêm khách hàng','pri','plus'))+
`<form class="card" style="margin-bottom:var(--s5)" aria-label="Tìm khách hàng"><div class="card-b row" style="align-items:flex-end;flex-wrap:nowrap">${fld('kh-q','Tìm theo tên hoặc mã số thuế','',{ph:'Ví dụ: Phúc Lâm hoặc 0312345678'}).replace('class="field "','class="field" style="flex:1;margin:0"')}<button class="btn" type="submit">Tìm</button></div></form>
<section class="card" aria-label="Danh sách khách hàng"><table class="tbl"><thead><tr><th scope="col">Khách hàng</th><th scope="col">Mã số thuế</th><th scope="col">Ngành</th><th scope="col" class="num">Hồ sơ</th><th scope="col">Phụ trách</th></tr></thead><tbody>${kh.map((r,i)=>`<tr class="${i===0?'is-sel':''}"><td class="name"><a href="03-ho-so-vay.html">${r[0]}</a></td><td class="tnum">${r[1]}</td><td>${r[2]}</td><td class="num">${r[3].split(' ')[0]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table><div class="pager"><span>Hiển thị 1 đến 3 trong 3 khách hàng</span></div></section>`});

// 19 Đối chiếu danh sách
shell({file:'19-doi-chieu-danh-sach.html',title:'Đối chiếu tài liệu',role:'rm',active:'dc',body:
ph('Đối chiếu tài liệu','Các tài liệu có trường lệch giữa hồ sơ và nội dung AI đọc.','')+
`<section class="card" aria-label="Danh sách tài liệu cần đối chiếu"><table class="tbl"><thead><tr><th scope="col">Hồ sơ</th><th scope="col">Tài liệu</th><th scope="col">Đọc lúc</th><th scope="col" class="num">Trường lệch</th><th scope="col">Trạng thái</th></tr></thead><tbody>
${[['HSV-2026-00201','Báo cáo tài chính 2025','09/11/2026',2,'warn','Chờ xác nhận'],['HSV-2026-00201','Hợp đồng thuê đất','09/11/2026',0,'info','Đang đọc'],['HSV-2026-00187','Giấy đăng ký kinh doanh','07/11/2026',1,'warn','Chờ xác nhận'],['HSV-2026-00187','Báo cáo tài chính 2024','07/11/2026',0,'ok','Đã xác nhận']].map(r=>`<tr><td class="name"><a href="05-doi-chieu.html">${r[0]}</a></td><td>${r[1]}</td><td class="tnum">${r[2]}</td><td class="num">${r[3]}</td><td><span class="badge ${r[4]}">${r[5]}</span></td></tr>`).join('')}</tbody></table><div class="pager"><span>Hiển thị 1 đến 4 trong 4 tài liệu</span></div></section>`});

// 20 Tra cứu chính sách
shell({file:'20-tra-cuu-chinh-sach.html',title:'Tra cứu chính sách',role:'rm',active:'cs',body:
ph('Tra cứu chính sách','Tìm trong chính sách cho vay hiện hành, bản có hiệu lực từ 01/09/2026.','')+
`<form class="card" style="margin-bottom:var(--s5)" action="#" aria-label="Tìm chính sách"><div class="card-b row" style="align-items:flex-end;flex-wrap:nowrap">${fld('cs-q','Từ khóa','hạn mức vốn lưu động',{}).replace('class="field "','class="field" style="flex:1;margin:0"')}<button class="btn pri" type="submit">${ic('search')}Tìm</button></div></form>
<p class="small muted" style="margin-bottom:var(--s3)">2 kết quả cho "hạn mức vốn lưu động"</p><div class="stack">
${[['4.2','Hạn mức vốn lưu động','Hạn mức vốn lưu động tối đa bằng <mark>70%</mark> doanh thu thuần năm gần nhất của khách hàng.'],['6.1','Điều kiện an toàn tài chính','DSCR tối thiểu 1,20 lần. LTV tối đa 70% giá trị tài sản bảo đảm.']].map(([m,t,d])=>`<article class="card" style="padding:var(--s5)"><div class="row"><span class="badge info">Mục ${m}</span><h2 style="font-size:16px">${t}</h2></div><p style="margin-top:8px;max-width:72ch">${d}</p><a href="#" class="small">Mở đoạn trong chính sách</a></article>`).join('')}</div>
<div class="card" style="margin-top:var(--s6)"><div class="empty">${ill('search')}<h2>Không tìm thấy mục nào</h2><p>Thử từ khóa ngắn hơn, ví dụ "DSCR". Ví dụ trạng thái khi không có kết quả.</p></div></div>`});

// 21 Thành phần
const cell=(l,h)=>`<div class="cellx"><span class="statelbl">${l}</span>${h}</div>`;
const bs=(c,t)=>[['Mặc định',''],['Hover','is-hover'],['Focus','is-focus'],['Active','is-active']].map(([l,s])=>cell(l,`<button class="btn ${c} ${s}">${t}</button>`)).join('')+cell('Disabled',`<button class="btn ${c}" disabled>${t}</button>`)+cell('Đang tải',`<button class="btn ${c} loading" aria-busy="true">${t}</button>`);
const rowS=(l,c)=>`<tr class="${c}"><td class="name">${l}</td><td class="tnum">HSV-2026-00201</td><td><span class="badge warn">Đang xử lý</span></td></tr>`;
const tm=(l,s,o={})=>cell(l,`<div class="card" style="padding:var(--s3)">${team(s,{sm:1,...o})}</div>`);
shell({file:'21-thanh-phan.html',title:'Thành phần',role:'rm',active:'viec',body:
ph('Thành phần','Mọi trạng thái của thành phần dùng chung. Nguồn: tokens.css và app.css.','')+
`<div class="stack" style="gap:var(--s8)">
<section aria-labelledby="c-btn"><h2 id="c-btn" style="font-size:20px;margin-bottom:var(--s3)">Nút</h2><div class="stack">
<div class="sec-t">Nút thường</div><div class="gal">${bs('','Lưu bản nháp')}</div>
<div class="sec-t">Nút chính (navy)</div><div class="gal">${bs('pri','Gửi hồ sơ')}</div>
<div class="sec-t">Nút chốt (đồng), tối đa một nút mỗi màn hình, chỉ ở góc trên bên phải</div><div class="gal">${bs('gold','Chuyển Thẩm định')}</div>
<div class="sec-t">Khóa kèm lý do</div><div class="gal">${cell('Khóa',locked('Chuyển Thẩm định','Còn 2 mục kiểm tra chưa xong.','why-c1'))}</div></div></section>
<section aria-labelledby="c-in"><h2 id="c-in" style="font-size:20px;margin-bottom:var(--s3)">Ô nhập</h2><div class="gal">
${cell('Mặc định','<input class="input" aria-label="Ví dụ mặc định" placeholder="Nhập nội dung">')}${cell('Hover','<input class="input is-hover" aria-label="Ví dụ hover" value="Giá trị">')}${cell('Focus','<input class="input is-focus" aria-label="Ví dụ focus" value="Giá trị">')}${cell('Disabled','<input class="input" aria-label="Ví dụ disabled" disabled value="Không sửa được">')}${cell('Lỗi',`<div class="field err" style="margin:0"><input class="input" aria-label="Ví dụ lỗi" aria-invalid="true" aria-describedby="c-e" value="abc"><div class="hint" id="c-e" style="color:var(--danger-700)">Nhập số, ví dụ 12.</div></div>`)}</div></section>
<section aria-labelledby="c-tab"><h2 id="c-tab" style="font-size:20px;margin-bottom:var(--s3)">Tab</h2><div class="gal" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${[['Mặc định',''],['Hover','is-hover'],['Focus','is-focus']].map(([l,s])=>cell(l,`<div class="tabs" role="tablist" aria-label="Tab ${l}"><a role="tab" aria-selected="true" href="#" id="tb-${l}1">Tổng quan</a><a role="tab" aria-selected="false" tabindex="-1" class="${s}" href="#" id="tb-${l}2">Dấu vết</a></div>`)).join('')}${cell('Active (đang chọn)','<div class="tabs" role="tablist" aria-label="Tab đang chọn"><a role="tab" aria-selected="true" href="#">Tổng quan</a></div>')}${cell('Disabled','<div class="tabs" role="tablist" aria-label="Tab khóa"><a role="tab" aria-selected="false" aria-disabled="true" tabindex="-1" href="#" style="color:var(--ink-3)">So sánh (chưa có dữ liệu)</a></div>')}</div></section>
<section aria-labelledby="c-row"><h2 id="c-row" style="font-size:20px;margin-bottom:var(--s3)">Hàng bảng</h2><table class="tbl card"><thead><tr><th scope="col">Khách hàng</th><th scope="col">Mã hồ sơ</th><th scope="col">Trạng thái</th></tr></thead><tbody>${rowS('Mặc định','')}${rowS('Hover','is-hover')}${rowS('Đang chọn','is-sel')}</tbody></table></section>
<section aria-labelledby="c-dm"><h2 id="c-dm" style="font-size:20px;margin-bottom:var(--s3)">Drawer và Modal</h2><div class="grid g2" style="align-items:start">
${cell('Drawer (ví dụ, 440px, đóng bằng Esc hoặc nút Đóng)',`<div class="drawer inl" role="dialog" aria-labelledby="dr-t"><div class="card-h"><h3 id="dr-t" style="font-size:16px">Chi tiết agent Credit</h3><button class="btn sm r" aria-label="Đóng">${ic('x')}</button></div><div class="card-b"><p class="small muted">Việc giao: tính DSCR và LTV. Thời gian 7,6 giây, 5 lần gọi công cụ.</p></div></div>`)}
${cell('Modal xác nhận',`<div class="modal" role="dialog" aria-labelledby="md-t"><div class="mh"><h3 id="md-t" style="font-size:20px">Gửi hồ sơ sang Hỗ trợ tín dụng?</h3></div><div class="mb"><p>Sau khi gửi, bạn không sửa được đề xuất cho đến khi hồ sơ được trả lại.</p></div><div class="mf"><button class="btn">Quay lại</button><button class="btn pri">Gửi hồ sơ</button></div></div>`)}</div></section>
<section aria-labelledby="c-tm"><h2 id="c-tm" style="font-size:20px;margin-bottom:var(--s3)">Khối đội agent</h2><div class="stack">
${tm('Chưa chạy',{planner:'idle',credit:'idle',compliance:'idle',operations:'idle',document:'idle',validation:'idle'})}
${tm('Đang chạy',{planner:'done',credit:'run',compliance:'run',operations:'done',document:'run',validation:'idle'})}
${tm('Lỗi hoặc quá giờ',{planner:'done',credit:'done',compliance:'done',operations:'done',document:'to',validation:'idle'})}
${tm('Có kết quả',{planner:'done',credit:'done',compliance:'done',operations:'done',document:'done',validation:'done'},{human:'wait'})}</div></section>
</div>`});

// Keycloak
const kc=(f,t,inner,title)=>page(f,`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t} · Sổ Tín Dụng</title><link rel="stylesheet" href="app.css"></head><body><a class="skip" href="#main">Bỏ qua đến nội dung</a><main id="main" tabindex="-1" class="kc"><div class="card"><div class="card-b"><div class="logo"><div class="mark"><span>S</span></div><div><b style="font:600 20px var(--font-display)">Sổ Tín Dụng</b><div class="small muted">Tín dụng doanh nghiệp</div></div></div>${inner}<p class="small muted" style="margin-top:var(--s6)">Trang đăng nhập do hệ thống định danh của ngân hàng cung cấp (Keycloak).</p></div></div></main></body></html>`);
const form=(err)=>`<h1 style="font-size:26px">Đăng nhập</h1><p class="muted" style="margin:var(--s2) 0 var(--s5)">Dùng tài khoản nội bộ.</p>${err?`<div class="banner bad" role="alert" style="margin-bottom:var(--s4)">${ic('alert')}<div><b>Sai tên đăng nhập hoặc mật khẩu.</b> Còn 2 lần thử trước khi tài khoản bị khóa 15 phút.</div></div>`:''}<form action="#">${fld('kc-u','Tên đăng nhập','minhanh',{req:1,err:err?'Kiểm tra lại tên đăng nhập.':''})}${fld('kc-p','Mật khẩu','',{req:1}).replace('class="input"','class="input" type="password"')}<button class="btn pri lg full" type="submit">Đăng nhập</button></form><p class="small" style="margin-top:var(--s4)"><a href="#">Quên mật khẩu</a></p>`;
kc('22-keycloak-dang-nhap.html','Đăng nhập (Keycloak)',form(0));
kc('22b-keycloak-loi.html','Lỗi đăng nhập (Keycloak)',form(1));
kc('22c-het-phien.html','Hết phiên',`<div class="empty" style="padding:0">${ill('clock')}<h1 style="font-size:26px">Phiên làm việc đã hết hạn</h1><p>Vì an toàn, hệ thống đóng phiên sau 30 phút không thao tác. Bản nháp của bạn đã được lưu.</p><a class="btn pri lg" href="22-keycloak-dang-nhap.html">Đăng nhập lại</a></div>`);

// 23 Chế độ demo (menu mở)
shell({file:'23-che-do-demo.html',title:'Chế độ demo: đổi tài khoản',role:'rm',active:'viec',menu:true,body:
ph('Chế độ demo: đổi tài khoản','Dải vàng ở đầu trang luôn hiện trong bản demo. Chọn vai để xem hệ thống dưới quyền người đó.','')+
`<div class="banner info">${ic('file')}<div><b>Cách hoạt động.</b> Đổi vai chỉ đổi người dùng thử, không đổi dữ liệu. Mọi thao tác trong demo ghi vào nhật ký với nhãn "demo". Hệ thống thật không có dải này.</div></div>`});
