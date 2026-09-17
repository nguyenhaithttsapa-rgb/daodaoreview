import fs from 'fs/promises';
import { chromium } from 'playwright';

const FAKE_TITLES = [
  'Màn Lật Kèo Không Ngờ', 'Thân Phận Thật Sự Của Chàng Lái Xe', 'Công Chúa Tiên Giới',
  'Ánh Mắt U Uất', 'Nữ Tổng Tài Quyền Lực', 'Bí Mật Của Nữ Hầu', 'Cuộc Trả Thù Ngọt Ngào',
  'Tình Yêu Hay Cạm Bẫy', 'Quyền Lực Bóng Tối', 'Hợp Đồng Hôn Nhân', 'Sự Lựa Chọn Của Trái Tim',
  'Bóng Hồng Sát Thủ'
];

function generateTitle(text) {
    if (!text) return 'Video Không Tên';
    let clean = text.replace(/[\n\r]+/g, ' ').trim();
    let words = clean.split(' ');
    if (words.length <= 15) return clean;
    return words.slice(0, 15).join(' ') + '...';
}

async function main() {
    const dbPath = 'src/data/database.json';
    const dbRaw = await fs.readFile(dbPath, 'utf-8');
    let db = JSON.parse(dbRaw);

    const toFix = db.filter(v => FAKE_TITLES.some(ft => v.title.includes(ft)));
    console.log(`Found ${toFix.length} videos to fix.`);

    if (toFix.length === 0) return;

    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let count = 0;
    for (let series of toFix) {
        count++;
        const url = series.originalUrl || (series.episodes && series.episodes[0] && series.episodes[0].originalUrl);
        if (!url) {
            console.log(`[${count}/${toFix.length}] Skipping ${series.title}, no URL.`);
            continue;
        }

        console.log(`[${count}/${toFix.length}] Processing: ${url}`);
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // Wait for facebook page to load caption
            await page.waitForTimeout(3000);
            
            const caption = await page.evaluate(() => {
                const els = document.querySelectorAll('div[data-ad-comet-preview="message"], span[dir="auto"], div[dir="auto"]');
                let longest = '';
                for (let el of els) {
                    // Filter out some common non-caption spans
                    if (el.innerText && el.innerText.length > longest.length && !el.innerText.includes('Follow') && !el.innerText.includes('Like')) {
                        longest = el.innerText;
                    }
                }
                return longest.trim();
            });

            if (caption && caption.length > 10) {
                const newTitle = generateTitle(caption);
                console.log(`   Old Title: ${series.title}`);
                console.log(`   New Title: ${newTitle}`);
                
                series.title = newTitle;
                series.description = caption;
                if (series.episodes && series.episodes.length > 0) {
                    series.episodes[0].title = newTitle;
                }
            } else {
                console.log(`   Could not extract a meaningful caption for ${url}`);
            }
        } catch (err) {
            console.error(`   Error processing ${url}: ${err.message}`);
        }
        
        // Save incrementally just in case
        await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    }

    await browser.close();
    console.log('Done!');
}

main().catch(console.error);
