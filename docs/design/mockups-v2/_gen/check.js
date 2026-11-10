// Kiểm chéo dữ liệu demo trên HTML đã sinh: ngày làm việc, mã hồ sơ thuộc bảng demo, số liệu khớp.
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..');
const DEMO={'HSV-2026-00201':'Phúc Lâm','HSV-2026-00209':'An Phát','HSV-2026-00203':'Hải Đăng','HSV-2026-00171':'Hải Đăng','HSV-2026-00192':'Đại Nam','HSV-2026-00194':'Sông Hậu','HSV-2026-00189':'Tây Nguyên','HSV-2026-00186':'An Khang','HSV-2026-00196':'Phú Điền','HSV-2026-00176':'Đại Thành','DX-2026-00412':'Mekong','DX-2026-00405':'Hưng Phát','HSV-2026-00158':'Phúc Lâm','HSV-2026-00121':'Phúc Lâm','HSV-2026-99999':''};
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
if((rd('02b-viec-cua-toi-phe-duyet.html').match(/HSV-2026-\d{5}<\/div><\/td>/g)||[]).length!==3)bad('02b phải 3 hồ sơ');
for(const f of ['03-ho-so-vay.html','07-dau-vet.html'])if(!/15,4 giây/.test(rd(f)))bad(f+' thiếu 15,4 giây');
console.log(err?`${err} lỗi dữ liệu demo`:'Dữ liệu demo nhất quán (ngày làm việc, mã hồ sơ, badge, 15,4 giây)');process.exit(err?1:0);
