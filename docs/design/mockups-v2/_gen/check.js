// Kiểm chéo dữ liệu demo trên HTML đã sinh: ngày làm việc, mã hồ sơ thuộc bảng demo, số liệu khớp.
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..');
const DEMO={'HSV-2026-00201':'Phúc Lâm','HSV-2026-00209':'An Phát','HSV-2026-00203':'Hải Đăng','HSV-2026-00171':'Hải Đăng','HSV-2026-00192':'Đại Nam','HSV-2026-00194':'Sông Hậu','HSV-2026-00189':'Tây Nguyên','HSV-2026-00186':'An Khang','HSV-2026-00196':'Phú Điền','HSV-2026-00176':'Đại Thành','DX-2026-00412':'Mekong','DX-2026-00405':'Hưng Phát','HSV-2026-00158':'Phúc Lâm','HSV-2026-00121':'Phúc Lâm','HSV-2026-00178':'Bạc Liêu','HSV-2026-00198':'Việt Cát','HSV-2026-00204':'Bình An','HSV-2026-00205':'Tiến Phát','HSV-2026-00207':'Hoàng Gia','HSV-2026-99999':''};
let err=0;const bad=m=>{err++;console.log('LỖI',m)};
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html'))){
 const h=fs.readFileSync(path.join(dir,f),'utf8');const txt=h.replace(/<[^>]+>/g,' ');
 for(const m of txt.matchAll(/\b(\d{2})\/(\d{2})\/(2026|2025)\b/g)){const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));const w=d.getUTCDay();if(w===0||w===6)bad(`${f}: ${m[0]} rơi vào cuối tuần`);}
 for(const m of h.matchAll(/\b(HSV|DX)-2026-\d{5}\b/g)){if(!(m[0] in DEMO))bad(`${f}: mã ${m[0]} ngoài bảng demo`);}
 if(/Giám đốc|Cán bộ tín dụng|\bms\b|Hỏi ca|\bca\b chạy/.test(txt))bad(`${f}: thuật ngữ cũ`);
}
// số liệu xuyên trang
const rd=n=>fs.readFileSync(path.join(dir,n),'utf8');
if(!/Tất cả 7/.test(rd('02-viec-cua-toi.html')))bad('02 tổng 7');
if(!/class="cnt"[^>]*>4</.test(rd('02-viec-cua-toi.html')))bad('badge qhkh 4');
if(!/class="cnt"[^>]*>3</.test(rd('02b-viec-cua-toi-phe-duyet.html')))bad('badge pheduyet 3');
if((rd('02b-viec-cua-toi-phe-duyet.html').match(/HSV-2026-\d{5}<\/div><\/td>/g)||[]).length!==4)bad('02b phải 4 dòng (3 chờ quyết định + 1 chờ Hội đồng)');
for(const f of ['03-ho-so-vay.html','07-dau-vet.html'])if(!/15,4 giây/.test(rd(f)))bad(f+' thiếu 15,4 giây');
// việc 3: mỗi lượt chạy có bộ thời gian riêng; trạng thái tài liệu thống nhất giữa 05 và 19; 17b bước 4 còn thiếu
const L=require('./lib');const keys=Object.keys(L.CASES);const sig=new Set(keys.map(k=>JSON.stringify(L.CASES[k])));
if(sig.size!==keys.length)bad('hai lượt chạy trùng toàn bộ thời gian agent');
{const t5=rd('05-doi-chieu.html').replace(/<[^>]+>/g,' '),t19=rd('19-doi-chieu-danh-sach.html').replace(/<[^>]+>/g,' ');
 const s5=/Hợp đồng thuê đất[^A-Za-z]{0,40}Đã xác nhận/.test(t5),s19=/Hợp đồng thuê đất[\s\S]{0,60}(Đã xác nhận|Đã xong, chỉ xem)/.test(t19);
 if(/Hợp đồng thuê đất/.test(t5)&&/Hợp đồng thuê đất/.test(t19)&&/Chờ xác nhận/.test(t5.split('Hợp đồng thuê đất')[1]?.slice(0,60)||'')!==/Chờ xác nhận/.test(t19.split('Hợp đồng thuê đất')[1]?.slice(0,60)||''))bad('05 và 19 khác trạng thái Hợp đồng thuê đất');}
if(!/Còn thiếu/.test(rd('17b-tao-de-xuat-buoc-5.html')))bad('17b bước 4 phải Còn thiếu');
if(!/Chờ phiên Hội đồng – có ở đợt 2/.test(rd('02b-viec-cua-toi-phe-duyet.html')))bad('02b thiếu dòng Hội đồng');
if(!/Ý kiến Quản lý rủi ro và Tuân thủ/.test(rd('12-ho-so-phe-duyet.html'))||!/Bản đã chốt/.test(rd('12-ho-so-phe-duyet.html')))bad('12 thiếu tờ trình đã chốt hoặc ý kiến Rủi ro/Tuân thủ');
if(/btn gold/.test(rd('14-ho-so-tham-dinh.html').replace(/<div class="ph">[\s\S]*?<div class="stepper/,'')))bad('14 có nút đồng trong nội dung (D4)');
console.log(err?`${err} lỗi dữ liệu demo`:'Dữ liệu demo nhất quán (ngày làm việc, mã hồ sơ, badge, 15,4 giây)');process.exit(err?1:0);
