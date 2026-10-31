import fs from 'fs';
import path from 'path';
import https from 'https';

const DB_PATH = path.resolve('src/data/database.json');
const HOST = 'daodaoreview.com';
const KEY = '5d1a03a3348433d435e89b34514de8f0';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

function postIndexNow(endpointHost, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: endpointHost,
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on('error', (err) => resolve({ statusCode: 0, error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ statusCode: 0, error: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const urls = [
    `https://${HOST}/`,
    `https://${HOST}/sitemap.xml`,
    ...db.filter(s => s && s.slug).map(s => `https://${HOST}/watch/${s.slug}`)
  ];

  console.log(`🚀 Đang gửi ${urls.length} URL lên Bing IndexNow & API IndexNow...`);

  // IndexNow cho phép tối đa 10.000 URL mỗi batch
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.slice(0, 9999)
  };

  const bingRes = await postIndexNow('www.bing.com', payload);
  console.log(`📡 Kết quả Bing IndexNow (www.bing.com): HTTP ${bingRes.statusCode}`);

  const apiRes = await postIndexNow('api.indexnow.org', payload);
  console.log(`📡 Kết quả IndexNow Global (api.indexnow.org): HTTP ${apiRes.statusCode}`);
}

main();
