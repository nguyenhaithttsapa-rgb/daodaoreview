export function cleanCaption(raw: string): string {
  if (!raw) return '';
  // Tách các dòng
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Lọc bỏ dòng chứa link Shopee / tiếp thị liên kết / mua ngay
  const cleanLines = lines.filter(l => 
    !l.includes('http') && 
    !l.includes('shopee') && 
    !l.includes('lazada') && 
    !l.includes('Mua ngay') &&
    !l.includes('Khẩu trang') &&
    !l.includes('giỏ hàng') &&
    !l.includes('Thùng') &&
    !l.includes('chiếc')
  );

  let title = cleanLines.length > 0 ? cleanLines[0] : lines[0] || '';
  
  // Xóa hashtag và ký tự đặc biệt
  title = title
    .replace(/#\w+/g, '')
    .replace(/[🔥⚡💥✨🎉🎬❤️👍👇👉\[\]\(\)]/g, '')
    .replace(/(?:tập|tap|part|ep|hồi)\s*\d+/gi, '')
    .replace(/#\d+/g, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\s*:\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title;
}
