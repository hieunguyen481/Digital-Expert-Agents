/**
 * Bỏ dấu hiệu "dữ liệu minh họa" gắn trong tên của dữ liệu seed khi hiện cho người đọc:
 * "(minh họa)" ở cuối, "(minh họa, ký 03/11)" còn "(ký 03/11)", ", số minh họa" ở cuối.
 * Chỉ đổi chữ hiển thị; khóa và dữ liệu gốc không đổi. Trang đối chiếu đã có câu nói tài liệu mẫu là dữ liệu minh họa.
 */
export const stripSampleMark = (t: string): string =>
  t
    .replace(/\s*\((?:minh họa|mẫu)\)/gi, '')
    .replace(/\((?:minh họa|mẫu),\s*/gi, '(')
    .replace(/[,;]\s*số minh họa\s*$/i, '')
    .trim();
