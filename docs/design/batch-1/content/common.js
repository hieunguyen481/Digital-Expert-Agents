/* common.js: dữ liệu và hàm dùng chung cho mọi trang mockup (đợt 1 sửa lỗi mức Cao).
   Mỗi trang nạp: <script src="common.js"></script> TRƯỚC script của trang.
   Không định nghĩa lại các hằng dưới đây trong trang. */
(function (W) {
  'use strict';

  /* ---- Bản đồ trang → file. Trang chưa có file → hiện toast "chưa thiết kế". ---- */
  var PAGE_FILE = {
    1: '02b-ho-so-vay-task.html',     // Chi tiết hồ sơ vay
    2: '03-viec-cua-toi.html',        // Việc của tôi
    3: '04-tao-de-xuat-vay.html',     // Tạo đề xuất vay
    5: '05-doi-chieu-tai-lieu.html'   // Đối chiếu tài liệu
    // 4 Khách hàng SME, 6 Phiên HĐTD, 7 Tra cứu chính sách, 8 Nhật ký kiểm toán,
    // 9 Quản trị, 10 Trợ lý AI toàn màn hình: chưa có file (đợt 2, 3)
  };

  /* ---- Badge "Việc của tôi" trên rail: MỘT nguồn cho mọi trang.
     Trang 03 phải có đúng số dòng "chờ bạn" bằng các số này. ---- */
  var BADGES = { qhkh: 4, httd: 3, tdinh: 3, ruiro: 2, pheduyet: 3 };

  /* ---- Lịch: hôm nay Thứ Năm 05/11/2026. Không có ngày lễ trong 10/2026–12/2026
     (danh sách để trống nhưng hàm vẫn tôn trọng nó). ---- */
  var TODAY = new Date(2026, 10, 5);
  var HOLIDAYS = []; // 'YYYY-MM-DD'

  /* ---- SLA từng bước (ngày làm việc), theo policy §2.3 ---- */
  var SLA = { kiemtra: 2, thamdinh: 5, ruiro: 3, pheduyet: 2, bosung_khach: 5 };

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isWorkday(d) { var w = d.getDay(); return w !== 0 && w !== 6 && HOLIDAYS.indexOf(iso(d)) < 0; }
  /** Hạn = ngày bắt đầu + n ngày làm việc (không tính ngày bắt đầu), 17:00. */
  function addWorkdays(d, n) { var x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (isWorkday(x)) n--; } return x; }
  /** Số ngày làm việc SAU hôm nay đến hết ngày hạn. 0 = hạn hôm nay; âm = quá hạn. */
  function workdaysLeft(due, today) {
    today = today || TODAY; var a = new Date(today), b = new Date(due), n = 0;
    a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    if (b < a) { while (a > b) { a.setDate(a.getDate() - 1); if (isWorkday(a)) n--; } return n; }
    while (a < b) { a.setDate(a.getDate() + 1); if (isWorkday(a)) n++; } return n;
  }
  function dueText(due) {
    var n = workdaysLeft(due);
    return n < 0 ? 'quá hạn ' + (-n) + ' ngày LV' : n === 0 ? 'hạn hôm nay' : 'còn ' + n + ' ngày LV';
  }
  function fmtDate(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }

  /* ---- CIC: hiệu lực 30 ngày tính cả ngày tra cứu → còn hiệu lực đến hết (ngày tra cứu + 29).
     Mốc kiểm tra: ngày TRÌNH PHÊ DUYỆT (Q10). ---- */
  var CIC_VALID_DAYS = 30;
  function cicValidUntil(lookup) { var x = new Date(lookup); x.setDate(x.getDate() + CIC_VALID_DAYS - 1); return x; }

  /* ---- Ngưỡng phê duyệt (tỷ đồng), tính trên TỔNG cấp tín dụng (Q4) ---- */
  var TIERS = [
    { max: 20, label: 'Cấp 1 · Giám đốc chi nhánh' },
    { max: 100, label: 'Cấp 2 · Phê duyệt Hội sở' },
    { max: Infinity, label: 'Cấp 3 · Hội đồng tín dụng' }
  ];
  function tierOf(totalBillion) { for (var i = 0; i < TIERS.length; i++) if (totalBillion <= TIERS[i].max) return i + 1; }

  /* ---- Điều hướng giữa các trang, giữ vai trò.
     params: object → thêm vào hash, ví dụ {doc:'CIC', page:1, field:'nhom', cite:3, from:'hsv'} ---- */
  function hrefFor(page, params, role) {
    var f = PAGE_FILE[page]; if (!f) return null;
    var h = new URLSearchParams(); if (role) h.set('role', role);
    if (params) Object.keys(params).forEach(function (k) { if (params[k] != null && params[k] !== '') h.set(k, params[k]); });
    var s = h.toString(); return f + (s ? '#' + s : '');
  }
  /** Trả true nếu đã điều hướng; false nếu trang chưa có file (trang tự hiện toast). */
  function navigate(page, params, role) { var u = hrefFor(page, params, role); if (!u) return false; W.location.href = u; return true; }

  /* Hiệu lực tài liệu 30 ngày: sao kê, xác nhận dư nợ tính từ ngày ngân hàng cấp (E6). */
  function docValidUntil(issued) { return cicValidUntil(issued); }

  /* Cảnh báo số tiền bất thường, không chặn (F12). */
  var AMOUNT_WARN_BILLION = 500;

  /* Dữ liệu chuẩn của hồ sơ VinaNova: nguồn duy nhất cho các số đếm (F-DOC, F4). */
  var VINANOVA = {
    id: 'HSV-2026-00187',
    docs: { required: 16, extra: 3, customerSubmitted: 1, uploaded: 19 },
    flags: { total: 8, high: 4 },
    /* Trạng thái số liệu dùng chung: khóa = id chỉ số/dòng BCTC của 02b. 02b và 05 đọc từ đây (F3, F4).
       st: 'ok' Đã xác nhận · 'ai' AI đề xuất · 'verify' Cần xác minh. why: lý do hiện ở dòng mở rộng.
       by, at: người và ngày xác nhận. f05: id trường trên trang 05 nhận cùng trạng thái. */
    metricStatus: {
      dscr: { st: 'verify', why: 'Dùng EBITDA 98; nếu dùng 128 (cờ BCTC 2025) thì ≈ 1,76', f05: [] },
      dti: { st: 'verify', why: 'Dùng dư nợ CIC 98 tỷ (tra cứu 27/10/2026), BCĐKT chỉ ghi 56 tỷ', f05: [] },
      ltv: { st: 'verify', why: 'Giá trị đang lấy từ Phiếu TTKH (tài liệu bị cờ), chưa đối chiếu với chứng thư định giá', f05: [] },
      de: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: [] },
      cr: { st: 'verify', why: 'BCTC ghi 2,04, tính lại 2,80: nguồn mâu thuẫn', f05: ['cr25'] },
      qr: { st: 'verify', why: 'BCTC ghi 1,50, tính lại 1,76: nguồn mâu thuẫn', f05: [] },
      icr: { st: 'verify', why: 'BCTC ghi 14,9, tính lại 2,81: nguồn mâu thuẫn', f05: [] },
      dso: { st: 'verify', why: 'Thuyết minh BCTC ghi 48 ngày, tính lại 150 ngày', f05: ['dso25'] },
      rev: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: ['rev25'] },
      ebitda: { st: 'verify', why: 'Cờ Cao: số này lệch giữa các phần của BCTC, xem cờ "BCTC 2025 không nhất quán"', f05: ['ebitda25'] },
      ebitdam: { st: 'verify', why: 'Tính từ EBITDA đang cần xác minh (cờ "BCTC 2025 không nhất quán"); tạm dùng 98 để thận trọng', f05: [] },
      da: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: ['da25'] },
      ebit: { st: 'verify', why: 'Tính từ EBITDA đang cần xác minh (cờ "BCTC 2025 không nhất quán"); tạm dùng 98 để thận trọng', f05: [] },
      int: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: ['int25'] },
      np: { st: 'verify', why: 'Cờ Cao: số này lệch giữa các phần của BCTC, xem cờ "BCTC 2025 không nhất quán"', f05: ['np25'] },
      ta: { st: 'verify', why: 'BCQT 6T/2026 ghi 368 tỷ, lệch 1.015 tỷ so với 31/12/2025', f05: ['ta25'] },
      ca: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: [] },
      ar: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: ['ar25'] },
      inv: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: [] },
      cl: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: [] },
      debt: { st: 'verify', why: 'CIC tra cứu 27/10/2026 ghi 98 tỷ, BCĐKT 31/12/2025 ghi 56 tỷ', f05: ['ltdebt25', 'total'] },
      eq: { st: 'verify', why: '6T/2026 ghi 270 tỷ, trùng "Vốn góp CSH", không phải tổng VCSH', f05: ['eq25'] },
      cfo: { st: 'verify', why: 'Phiếu TT KH ghi 81,0, chênh 12,2 tỷ', f05: ['cfo25', 'cfo_ph'] },
      cfi: { st: 'ok', by: 'Lê Quang Huy', at: '04/11', f05: [] },
      prin: { st: 'ai', f05: ['prin25'] }
    },
    /* Số đếm 02b hiển thị. total = 8 chỉ số + 17 dòng BCTC = ai + verify + confirmed.
       progressDone = confirmed + cờ đã xử lý (0) + reportDone.
       progressTotal = total + blockingFlags + reportTotal.
       blockingFlags = 8 cờ trừ cờ cickh (F8: vẫn mở, không chặn "Trình Rủi ro"). */
    counts: { ai: 1, verify: 15, confirmed: 9, total: 25, progressDone: 13, progressTotal: 39, blockingFlags: 7, reportDone: 4, reportTotal: 7 }
  };

  W.BANK = {
    docValidUntil: docValidUntil, AMOUNT_WARN_BILLION: AMOUNT_WARN_BILLION, VINANOVA: VINANOVA,
    PAGE_FILE: PAGE_FILE, BADGES: BADGES, TODAY: TODAY, HOLIDAYS: HOLIDAYS, SLA: SLA,
    isWorkday: isWorkday, addWorkdays: addWorkdays, workdaysLeft: workdaysLeft, dueText: dueText, fmtDate: fmtDate,
    CIC_VALID_DAYS: CIC_VALID_DAYS, cicValidUntil: cicValidUntil, TIERS: TIERS, tierOf: tierOf,
    hrefFor: hrefFor, navigate: navigate
  };
})(window);
