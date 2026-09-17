/**
 * Kiểm tra xem một video (Facebook Reel / Watch) có cho phép nhúng ngoại trang hay không.
 * Trả về true nếu nhúng được, false nếu bị lỗi "Video Unavailable" hoặc bị chặn.
 */
export async function isReelEmbeddable(url: string, timeoutMs: number = 6000): Promise<boolean> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return false;

  // Nếu không phải Facebook (ví dụ YouTube, TikTok), mặc định cho qua
  if (!cleanUrl.includes('facebook.com') && !cleanUrl.includes('fb.watch')) {
    return true;
  }

  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      return false;
    }

    const html = await res.text();

    const errorKeywords = [
      'Video Unavailable',
      'video unavailable',
      'không khả dụng',
      'Không khả dụng',
      'may no longer exist',
      'isn&#039;t available',
      'isn\'t available',
      'chưa sẵn sàng',
      'đã bị gỡ',
      'nội dung này hiện không khả dụng'
    ];

    const hasError = errorKeywords.some(keyword => html.includes(keyword));
    return !hasError;
  } catch {
    // Nếu timeout hoặc rớt mạng nhẹ, tạm cho qua để tránh bỏ sót
    return true;
  }
}
