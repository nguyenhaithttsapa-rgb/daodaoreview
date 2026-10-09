import https from 'https';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const CHANNEL_ID = '61593712735662';
const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');
const HISTORY_PATH = path.resolve('src/data/channel_crawl_history.json');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');

function fetchBuffer(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'vi,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve);
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(12000, () => { req.destroy(); resolve(null); });
    } catch {
      resolve(null);
    }
  });
}

function fetchHtml(url, ua = 'facebookexternalhit/1.1') {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': ua,
          'Accept-Language': 'vi,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchHtml(res.headers.location, ua).then(resolve);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(12000, () => { req.destroy(); resolve(''); });
    } catch {
      resolve('');
    }
  });
}

async function checkEmbeddableAccurate(videoUrl) {
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=0&autoplay=0`;
  const html = await fetchHtml(embedUrl, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  const isBlocked = html.includes('Video này không nhúng được do có thể chứa') || 
                    html.includes('This video cannot be embedded because it may contain content');

  if (isBlocked) {
    return { ok: false, reason: 'Video này không nhúng được do có thể chứa nội dung thuộc sở hữu của người khác' };
  }

  if (html.length < 30000) {
    return { ok: false, reason: 'Page too short' };
  }

  return { ok: true, htmlLength: html.length };
}

function parseDurationSeconds(durStr) {
  if (!durStr) return 0;
  const parts = durStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/#[\w\d_]+/g, '')
    .replace(/(https?:\/\/[^\s]+)/g, '')
    .replace(/(0\d{9,10})/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateSlug(title, id) {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  const shortId = cleanId.slice(-4) || 'video';
  const cleanTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70)
    .replace(/^-|-$/g, '');
  return `${cleanTitle}-${shortId}`;
}

async function main() {
  console.log(`======================================================`);
  console.log(`🔥 THỰC THI "RULES CÀO REELS FACEBOOK" CHO KÊNH MỚI:`);
  console.log(`🔗 Channel ID: ${CHANNEL_ID}`);
  console.log(`🎯 Quét cạn kiệt Reels Tab, Videos Tab và Watch Archive`);
  console.log(`======================================================\n`);

  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const existingIds = new Set(db.map(m => m.id.replace('series-long-', '')));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  // Resource interception (chặn image, media, font)
  await context.route('**/*', (route) => {
    const rt = route.request().resourceType();
    if (['image', 'media', 'font'].includes(rt)) return route.abort();
    return route.continue();
  });

  const page = await context.newPage();

  const scanSources = [
    `https://www.facebook.com/profile.php?id=${CHANNEL_ID}&sk=reels_tab`,
    `https://www.facebook.com/profile.php?id=${CHANNEL_ID}&sk=videos`,
    `https://www.facebook.com/watch/${CHANNEL_ID}/`,
    `https://www.facebook.com/profile.php?id=${CHANNEL_ID}`
  ];

  const allFoundVideos = new Map();
  let detectedChannelName = `Kênh Facebook ${CHANNEL_ID}`;

  for (const targetUrl of scanSources) {
    console.log(`\n🌐 Đang mở nguồn: ${targetUrl}`);
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3000);

      // Extract Channel Name
      const pageTitle = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1 && h1.innerText && h1.innerText.length > 2) return h1.innerText.trim();
        const titleEl = document.querySelector('title');
        if (titleEl && titleEl.innerText) {
          const t = titleEl.innerText.replace(/\s*\|\s*Facebook.*$/i, '').trim();
          if (t && !t.includes('Facebook')) return t;
        }
        return '';
      });

      if (pageTitle && !pageTitle.includes('Facebook') && detectedChannelName.startsWith('Kênh Facebook')) {
        detectedChannelName = pageTitle;
        console.log(`🏷️ Tên kênh nhận diện được: "${detectedChannelName}"`);
      }

      let noNewCount = 0;
      let prevCount = 0;
      let scrollRound = 0;
      const MAX_SCROLLS = 35; // Cào cạn kiệt đến đáy

      while (scrollRound < MAX_SCROLLS && noNewCount < 6) {
        scrollRound++;

        // Triệt tiêu modal dialog & mở khóa scroll
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });

        // Native wheel scroll
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3800);
        await page.waitForTimeout(1500);

        // Extract videos
        const currentVideos = await page.evaluate(() => {
          const results = [];
          const anchors = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"], a[href*="/reel/"]'));

          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            let vid = '';
            const m1 = href.match(/[?&]v=(\d+)/);
            const m2 = href.match(/\/videos\/(?:[^\/]+\/)?(\d+)/);
            const m3 = href.match(/\/reel\/(\d+)/);
            if (m1) vid = m1[1];
            else if (m2) vid = m2[1];
            else if (m3) vid = m3[1];
            if (!vid) continue;

            let card = a;
            for (let i = 0; i < 5; i++) {
              if (!card.parentElement) break;
              card = card.parentElement;
              if (card.innerText && card.innerText.length > 20) break;
            }
            const text = card ? card.innerText : a.innerText;
            let dur = '';
            const dm = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
            if (dm) dur = dm[1];

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l) && !l.includes('Thích') && !l.includes('Bình luận')) || a.innerText || `Video ${vid}`;

            results.push({
              id: vid,
              url: `https://www.facebook.com/watch/?v=${vid}`,
              title,
              duration: dur
            });
          }
          return results;
        });

        for (const v of currentVideos) {
          if (!allFoundVideos.has(v.id)) {
            allFoundVideos.set(v.id, {
              ...v,
              durationSec: parseDurationSeconds(v.duration)
            });
          }
        }

        if (allFoundVideos.size > prevCount) {
          noNewCount = 0;
          prevCount = allFoundVideos.size;
          console.log(`   [Nhịp ${scrollRound}] Phát hiện thêm video mới -> Tích lũy: ${allFoundVideos.size} video`);
        } else {
          noNewCount++;
          console.log(`   [Nhịp ${scrollRound}] Chưa thấy thêm video mới (${noNewCount}/6)...`);
        }
      }

      if (noNewCount >= 6) {
        console.log(`   🏁 ĐÃ CHẠM ĐÁY KHO LƯU TRỮ CỦA NGUỒN NÀY!`);
      }
    } catch (err) {
      console.log(`   ⚠️ Lỗi nguồn: ${err.message}`);
    }
  }

  // Quét dự phòng Watch Search nếu có tên kênh
  if (detectedChannelName && !detectedChannelName.startsWith('Kênh Facebook')) {
    const watchSearchUrl = `https://www.facebook.com/watch/search/?q=${encodeURIComponent(detectedChannelName + ' trọn bộ full')}`;
    console.log(`\n🔎 [WATCH SEARCH BỔ SUNG]: ${watchSearchUrl}`);
    try {
      await page.goto(watchSearchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2500);

      for (let s = 1; s <= 12; s++) {
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3600);
        await page.waitForTimeout(1400);

        const searchVids = await page.evaluate(() => {
          const results = [];
          const anchors = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"], a[href*="/reel/"]'));
          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            let vid = '';
            const m1 = href.match(/[?&]v=(\d+)/);
            const m2 = href.match(/\/videos\/(?:[^\/]+\/)?(\d+)/);
            const m3 = href.match(/\/reel\/(\d+)/);
            if (m1) vid = m1[1];
            else if (m2) vid = m2[1];
            else if (m3) vid = m3[1];
            if (!vid) continue;
            let card = a;
            for (let i = 0; i < 5; i++) {
              if (!card.parentElement) break;
              card = card.parentElement;
              if (card.innerText && card.innerText.length > 25) break;
            }
            const text = card ? card.innerText : a.innerText;
            let dur = '';
            const dm = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
            if (dm) dur = dm[1];
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l) && !l.includes('Thích') && !l.includes('Bình luận')) || a.innerText || `Video ${vid}`;
            results.push({ id: vid, url: `https://www.facebook.com/watch/?v=${vid}`, title, duration: dur });
          }
          return results;
        });

        for (const v of searchVids) {
          if (!allFoundVideos.has(v.id)) {
            allFoundVideos.set(v.id, { ...v, durationSec: parseDurationSeconds(v.duration) });
          }
        }
      }
    } catch (err) {
      console.log(`   ⚠️ Lỗi Watch Search: ${err.message}`);
    }
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`🏆 TỔNG SỐ VIDEO THU THẬP TỪ KÊNH ${detectedChannelName}: ${allFoundVideos.size} VIDEO`);
  console.log(`======================================================\n`);

  let addedCount = 0;
  let skippedCount = 0;
  let alreadyExistCount = 0;
  let shortCount = 0;

  for (const [vidId, vid] of allFoundVideos.entries()) {
    if (existingIds.has(vidId)) {
      alreadyExistCount++;
      continue;
    }

    // Tiêu chuẩn 1: Thời lượng >= 30 phút (>= 1800s)
    if (vid.durationSec > 0 && vid.durationSec < 1800) {
      shortCount++;
      console.log(`⛔ [LOẠI BỎ DO THỜI LƯỢNG < 30 PHÚT] (${vid.duration}): "${vid.title.slice(0, 50)}..."`);
      continue;
    }

    // Tiêu chuẩn 2: Không phải ca nhạc / OST / rác
    const lowerTitle = vid.title.toLowerCase();
    if (lowerTitle.includes('nhạc hoa') || lowerTitle.includes('karaoke') || lowerTitle.includes('mv vietsub') || lowerTitle.includes('ost') || lowerTitle.includes('cafe sáng') || lowerTitle.includes('dealshaker')) {
      console.log(`⛔ [LOẠI BỎ DO NHẠC/RÁC]: "${vid.title.slice(0, 50)}..."`);
      continue;
    }

    console.log(`\n🔍 Đang thẩm định: "${vid.title.slice(0, 60)}" (${vid.duration || 'Kiểm tra sâu'})...`);

    // Tiêu chuẩn 3: Kiểm tra quyền nhúng chuẩn xác 100%
    const embedStatus = await checkEmbeddableAccurate(vid.url);
    if (!embedStatus.ok) {
      console.log(`   ❌ Bị chặn nhúng bản quyền: ${embedStatus.reason}`);
      skippedCount++;
      continue;
    }
    console.log(`   ✅ Quyền nhúng: HỢP LỆ (Cho phép phát trên web)`);

    // Tiêu chuẩn 4: Tải ảnh bìa gốc qua facebookexternalhit/1.1
    let thumbBuffer = null;
    const htmlVid = await fetchHtml(vid.url);
    const ogImg = htmlVid.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"'](.*?)[\"']/i);
    if (ogImg && ogImg[1]) {
      const imgUrl = ogImg[1].replace(/&amp;/g, '&');
      thumbBuffer = await fetchBuffer(imgUrl);
    }

    if (!thumbBuffer || thumbBuffer.length < 5000) {
      console.log(`   ⚠️ Không tải được ảnh bìa gốc -> Bỏ qua.`);
      continue;
    }

    // Lưu ảnh bìa vĩnh viễn vào public/thumbnails
    const thumbFilename = `${vidId}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    fs.writeFileSync(thumbPath, thumbBuffer);
    console.log(`   🖼️ Đã lưu ảnh bìa gốc: public/thumbnails/${thumbFilename}`);

    // Tiêu chuẩn 5: Làm sạch tiêu đề và định dạng chuẩn
    let cleanTitle = sanitizeText(vid.title);
    cleanTitle = cleanTitle.replace(/\(Nội dung giải trí.*?\)/gi, '');
    cleanTitle = cleanTitle.replace(/\(Nội.*?\)/gi, '');
    cleanTitle = cleanTitle.replace(/\[16\+\]/gi, '').replace(/\[13\+\]/gi, '');
    cleanTitle = cleanTitle.replace(/Giới thiệu:.*$/gi, '');
    cleanTitle = cleanTitle.replace(/\(Full Trọn Bộ\)/gi, '').trim();
    cleanTitle = cleanTitle.split('\n')[0].trim();
    if (cleanTitle.length > 90) cleanTitle = cleanTitle.slice(0, 90).trim();
    cleanTitle = `${cleanTitle} (Full Trọn Bộ)`;

    const cleanSlug = generateSlug(cleanTitle, vidId);

    const newSeries = {
      id: `series-long-${vidId}`,
      slug: cleanSlug,
      title: cleanTitle,
      description: `Trọn bộ phim hoạt hình 3D tu tiên, huyền huyễn review tóm tắt đặc sắc: ${cleanTitle}. Thời lượng: ${vid.duration || 'Trọn bộ'}. Kênh: ${detectedChannelName}.`,
      thumbnail: `/thumbnails/${thumbFilename}`,
      coverImage: `/thumbnails/${thumbFilename}`,
      channelName: detectedChannelName,
      genres: ['Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt', 'Tu Tiên - Huyền Huyễn'],
      categories: ['Hoạt Hình 3D', 'Phim Dài Full', 'Tu Tiên - Huyền Huyễn'],
      totalEpisodes: 1,
      featured: true,
      updatedAt: new Date().toISOString().split('T')[0],
      episodes: [
        {
          id: `ep-long-${vidId}`,
          seriesId: `series-long-${vidId}`,
          partNumber: 1,
          title: cleanTitle,
          originalUrl: vid.url,
          embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(vid.url)}&show_text=0&autoplay=0`,
          platform: 'facebook',
          aspectRatio: '16:9',
          duration: vid.duration || '02:00:00',
          thumbnail: `/thumbnails/${thumbFilename}`,
          viewsCount: Math.floor(Math.random() * 50000) + 25000,
          publishedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };

    db.unshift(newSeries);
    existingIds.add(vidId);
    addedCount++;
    console.log(`   🎉 [NẠP MỚI THÀNH CÔNG #${addedCount}] (${vid.duration}) - "${cleanTitle}"`);
  }

  if (addedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`\n💾 ĐÃ CẬP NHẬT THÀNH CÔNG ${addedCount} PHIM DÀI MỚI VÀO database.json!`);
  }

  // Cập nhật lịch sử cào
  let history = {};
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')); } catch {}
  }
  history[CHANNEL_ID] = Array.from(allFoundVideos.keys());
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

  // Thêm kênh vào all_channel_batches.json (Lô kế tiếp Lô 65)
  let batches = [];
  if (fs.existsSync(BATCHES_PATH)) {
    try { batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf-8')); } catch {}
  }

  const alreadyInBatches = batches.some(b => JSON.stringify(b).includes(CHANNEL_ID));
  if (!alreadyInBatches) {
    const nextBatchNum = batches.length + 1;
    const newBatch = {
      batchNumber: nextBatchNum,
      batchTitle: `LÔ ${nextBatchNum} (n+1 MỚI): ${detectedChannelName}`,
      category: 'Hoạt Hình 3D & Tu Tiên Full',
      status: `ĐÃ CÀO CẠN KIỆT (Đã nạp ${addedCount} phim dài chuẩn)`,
      channels: [
        {
          name: detectedChannelName,
          url: `https://www.facebook.com/profile.php?id=${CHANNEL_ID}&sk=videos`,
          category: 'Donghua 3D & Phim Dài'
        }
      ]
    };
    batches.push(newBatch);
    fs.writeFileSync(BATCHES_PATH, JSON.stringify(batches, null, 2), 'utf-8');
    console.log(`📄 Đã bổ sung Lô ${nextBatchNum} (${detectedChannelName}) vào all_channel_batches.json.`);
  }

  console.log(`\n======================================================`);
  console.log(`📋 KẾT QUẢ CÀO KÊNH ${detectedChannelName} (ID: ${CHANNEL_ID}):`);
  console.log(`- Tổng video tìm thấy: ${allFoundVideos.size}`);
  console.log(`- Video ngắn < 30 phút đã loại bỏ: ${shortCount}`);
  console.log(`- Video bị chặn nhúng hoặc lỗi: ${skippedCount}`);
  console.log(`- Video đã có từ trước: ${alreadyExistCount}`);
  console.log(`- Phim dài nạp MỚI THÀNH CÔNG: ${addedCount}`);
  console.log(`- Tổng phim dài hiện có trong CSDL website: ${db.length}`);
}

main().catch(console.error);
