const L=require('./lib');const {shell,ph,meta,btn,locked,stepper,kpi,ic,team,tagAI,tagHM,tagMe,page,ill,A}=L;
// ---------- 09 Chat: 3 tệp, mỗi tệp một trạng thái (09 có câu trả lời, 09b đang trả lời, 09c lỗi)
const cite=(n,t)=>`<a class="cite" href="#nguon-${n}" aria-label="Nguồn ${n}: ${t}">[${n}]</a>`;
const botHead=`<div style="margin-bottom:8px">${tagAI}</div>`;
const msgs1=`<div class="msg me">Điều kiện tối đa để vay vốn lưu động cho doanh nghiệp SME là gì?</div>
<div class="msg bot">${botHead}<p>Theo chính sách cho vay, hạn mức vốn lưu động tối đa bằng 70% doanh thu thuần năm gần nhất ${cite(1,'Chính sách cho vay, mục 4.2')} và DSCR tối thiểu 1,20 ${cite(2,'Chính sách cho vay, mục 6.1')}.</p><p class="small muted" style="margin-top:8px">Trợ lý chỉ cung cấp thông tin tham khảo. Quyết định thuộc người có thẩm quyền.</p></div>
<div class="msg me">Áp vào hồ sơ Phúc Lâm thì sao?</div>`;
const ans=`<div class="msg bot">${botHead}<p>Với HSV-2026-00201: theo số trong hồ sơ, doanh thu thuần 2025 là <span class="tnum">214.750</span> triệu đồng nên trần 70% là khoảng <span class="tnum">150.325</span> triệu đồng, đề nghị 15 tỷ đồng nằm trong trần ${cite(1,'Chính sách cho vay, mục 4.2')}. Lưu ý: số này đang chờ xác nhận, tài liệu đọc được <span class="tnum">241.750</span> triệu đồng (trần 169.225 triệu đồng); xác nhận ở mục Đối chiếu tài liệu. DSCR 1,42 đạt ngưỡng 1,20 ${cite(2,'Chính sách cho vay, mục 6.1')}. Điểm còn thiếu là nguồn trả nợ, đúng lý do Cấp phê duyệt đã trả về ngày 09/11/2026.</p><p class="small muted" style="margin-top:8px">Trợ lý chỉ cung cấp thông tin tham khảo. Quyết định thuộc người có thẩm quyền.</p></div>`;
const busy=`<div class="msg bot" aria-busy="true">${botHead}<p class="muted"><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span> Đang tra cứu hồ sơ HSV-2026-00201 và chính sách…</p></div>`;
const errb=`<div class="banner bad" role="alert" style="max-width:72ch">${ic('alert')}<div><b>Câu trả lời bị gián đoạn.</b> Kết nối tới máy chủ bị ngắt, hội thoại không bị mất. <button class="btn sm" style="margin-left:8px">Thử lại</button></div></div>`;
const chat=(file,title,tail)=>shell({file,title,role:'rm',active:'ai',cls:'chatwrap',head:'<style>.chatwrap{padding:0!important;max-width:none!important}.chatmain{display:flex;flex-direction:column;min-height:0;padding:0 var(--s8)}.chatmain .scroll{flex:1;overflow:auto;padding:var(--s5) 0}.chatmain .compose{padding:var(--s3) 0 var(--s4);border-top:1px solid var(--rule)}.hist-col{border-right:1px solid var(--rule);padding:var(--s4) var(--s3)}</style>',body:
`<div class="chatpage"><nav class="hist-col hist" aria-label="Lịch sử hội thoại"><div class="sec-t" style="padding:0 var(--s3)">Hội thoại gần đây</div><a href="09-chat.html" aria-current="true">Điều kiện vay vốn lưu động<small>10/11/2026</small></a><a href="#">DSCR của Phúc Lâm<small>09/11/2026</small></a><a href="#">Hạn mức tối đa theo chính sách<small>06/11/2026</small></a></nav>
<div class="chatmain"><div style="padding:var(--s5) 0 var(--s2);display:flex;align-items:center;gap:var(--s3)"><h1 style="font-size:22px">Trợ lý AI</h1>${tagAI}<span class="small muted">Trả lời từ chính sách và hồ sơ bạn được phép xem. Trợ lý chỉ đề xuất, không quyết định.</span></div>
<div class="scroll" role="log" aria-live="polite" aria-label="Nội dung hội thoại">${msgs1}${tail}</div>
<form class="compose" action="#"><label for="chat-in" class="sr">Câu hỏi cho trợ lý</label><div class="row" style="flex-wrap:nowrap"><input id="chat-in" class="input" placeholder="Nhập câu hỏi về chính sách hoặc hồ sơ của bạn" style="flex:1"><button class="btn pri" type="submit">${ic('send')}Gửi</button></div><p class="small muted" style="margin-top:6px">Nguồn [1], [2] mở đúng đoạn trong chính sách. Enter để gửi.</p></form></div></div>`});
chat('09-chat.html','Trợ lý',ans);
chat('09b-chat-dang-tra-loi.html','Trợ lý, đang trả lời',busy);
chat('09c-chat-loi.html','Trợ lý, lỗi kết nối',errb);

// ---------- 10 Nhật ký
const fl=(id,l,ph,tag='input')=>`<div class="field" style="margin:0;flex:1;min-width:140px"><label for="${id}">${l}</label><input id="${id}" class="input" placeholder="${ph}"></div>`;
const log=(t,src,who,act,ref)=>`<tr><td class="tnum" style="white-space:nowrap">${t}</td><td>${src==='ai'?'<span class="tag-ai">'+ic('spark')+'AI đề xuất</span>':'<span class="badge">Người</span>'}</td><td>${who}</td><td>${act}</td><td class="tnum" style="white-space:nowrap">${ref}</td></tr>`;
shell({file:'10-nhat-ky.html',title:'Nhật ký kiểm toán',role:'aud',active:'nk',body:
ph('Nhật ký kiểm toán','Chỉ đọc. Mỗi dòng ghi một hành động của AI hoặc của người, không sửa, không xóa.',btn('Xuất CSV','','down'))+
`<form class="card" style="margin-bottom:var(--s5)" aria-label="Bộ lọc nhật ký"><div class="card-b row" style="align-items:flex-end;flex-wrap:nowrap;gap:var(--s4)">${fl('f-from','Từ ngày','dd/mm/yyyy')}${fl('f-to','Đến ngày','dd/mm/yyyy')}${fl('f-who','Người hoặc agent','Tên người hoặc tên agent')}${fl('f-ref','Mã hồ sơ','HSV-2026-nnnnn')}<button class="btn pri" type="submit" style="margin-bottom:0">Lọc</button></div></form>
<section class="card" aria-labelledby="nkb"><div class="card-h"><h2 id="nkb" style="font-size:16px">Các hành động</h2></div><table class="tbl"><thead><tr><th scope="col">Thời điểm</th><th scope="col">Nguồn</th><th scope="col">Người hoặc agent</th><th scope="col">Hành động</th><th scope="col">Hồ sơ</th></tr></thead><tbody>
${log('10/11/2026 14:32:41','ai','Đội agent (Validation)','Trả kết luận: nên cho vay có điều kiện','HSV-2026-00201')}
${log('10/11/2026 14:32:37','ai','Đội agent (Document)','Đọc báo cáo tài chính 2025, 2 trường lệch','HSV-2026-00201')}
${log('10/11/2026 14:32:26','ai','Đội agent (Planner)','Giao 4 việc cho Credit, Compliance, Operations, Document','HSV-2026-00201')}
${log('09/11/2026 16:05:12','hm','Đỗ Thanh Tùng, Cấp phê duyệt','Trả về QHKH. Lý do: nguồn trả nợ chưa rõ','HSV-2026-00201')}
${log('06/11/2026 11:20:45','hm','Đỗ Thanh Tùng, Cấp phê duyệt','Phê duyệt có điều kiện: hạn mức 8 tỷ đồng, bổ sung định giá tài sản bảo đảm','HSV-2026-00171')}
${log('06/11/2026 10:58:09','ai','Đội agent (Validation)','Đề xuất phê duyệt có điều kiện, hạn mức 8 tỷ đồng','HSV-2026-00171')}
</tbody></table><div class="pager"><span>Hiển thị 1 đến 6 trong 128 dòng</span><nav class="pg" aria-label="Phân trang"><a aria-disabled="true" href="#">Trước</a><a href="#" aria-current="page">1</a><a href="#">2</a><a href="#">3</a><span class="gap">…</span><a href="#">22</a><a href="#">Sau</a></nav></div></section>`});

// ---------- 11 Trạng thái trang (rỗng, rỗng sau lọc, 404, lỗi, hết phiên, đang tải, thông báo). 403 là trang riêng 11b
const st=(i,h,p,b)=>`<div class="card"><div class="empty">${ill(i)}<h2>${h}</h2><p>${p}</p>${b}</div></div>`;
shell({file:'11-trang-thai.html',title:'Các trạng thái trang',role:'rm',active:'viec',body:
ph('Các trạng thái trang','Rỗng, rỗng sau lọc, không tìm thấy, lỗi, hết phiên, đang tải, thông báo. Trang 403 ở tệp riêng 11b.','')+
`<div class="grid g2">
${st('search','Chưa có hồ sơ nào','Khi bạn tạo đề xuất vay, hồ sơ sẽ xuất hiện ở đây để theo dõi.',btn('Tạo đề xuất vay','pri','plus'))}
${st('search','Không có dòng nhật ký khớp bộ lọc','Mã hồ sơ HSV-2026-99999 không có dòng nào. Bỏ lọc để xem toàn bộ 128 dòng.',btn('Bỏ lọc'))}
${st('search','Không tìm thấy trang (404)','Đường dẫn có thể đã đổi hoặc hồ sơ đã bị xóa. Kiểm tra lại mã hồ sơ.',btn('Về Việc của tôi','pri','inbox'))}
${st('bad','Không tải được danh sách hồ sơ','Kết nối tới máy chủ bị gián đoạn. Dữ liệu của bạn không bị mất.',btn('Tải lại','pri','undo'))}
${st('clock','Phiên làm việc đã hết hạn','Vì an toàn, hệ thống đóng phiên sau thời gian không thao tác. Đăng nhập lại để tiếp tục.',btn('Đăng nhập lại','pri','user'))}</div>
<section class="card" style="margin-top:var(--s6)" aria-label="Đang tải" aria-busy="true"><div class="card-h"><h2 style="font-size:16px">Đang tải</h2><span class="small muted">Đang tải danh sách hồ sơ…</span></div><div class="card-b" style="display:grid;gap:10px"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:85%"></div><div class="skel" style="width:70%"></div></div></section>
<section class="card" style="margin-top:var(--s6)" aria-label="Thông báo"><div class="card-h"><h2 style="font-size:16px">Thông báo</h2><span class="small muted">Vị trí thật: góc phải dưới, tự tắt sau 5 giây; lỗi giữ đến khi tắt</span></div><div class="card-b row"><div class="toast st" role="status">${ic('check')}<span>Đã lưu bản nháp lúc 14:40. Tự tắt sau 5 giây.</span><button type="button" class="btn sm" aria-label="Đóng thông báo">${ic('x')}</button></div></div></section>`});
// ---------- 11b Không có quyền (403) theo rules D3: biểu tượng khiên, h1 trung tính, đúng 1 nút
shell({file:'11b-khong-co-quyen.html',title:'Không có quyền truy cập',role:'rm',active:'viec',cls:'narrow',body:
`<div class="card" style="margin-top:var(--s8)"><div class="empty">${ill('shield')}<h1 style="font-size:24px">Không có quyền truy cập</h1><p>Trang này không dành cho vai của bạn. Nếu bạn cần truy cập, nhờ trưởng bộ phận gửi yêu cầu cấp quyền cho Quản trị hệ thống.</p>${btn('Về Việc của tôi','pri','inbox','02-viec-cua-toi.html')}</div></div>`});
