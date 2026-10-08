import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const thumbDir = path.join(process.cwd(), 'public', 'thumbnails');
    const localFile = path.join(thumbDir, `${cleanId}.jpg`);

    if (fs.existsSync(localFile)) {
      const buffer = fs.readFileSync(localFile);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    // Nếu chưa có file cục bộ, thử tải từ Facebook Reel URL
    const reelUrl = `https://www.facebook.com/reel/${cleanId}/`;
    const fbRes = await fetch(reelUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (fbRes.ok) {
      const html = await fbRes.text();
      const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      if (match && match[1]) {
        const imgUrl = match[1].replace(/&amp;/g, '&');
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
          }
          fs.writeFileSync(localFile, buffer);
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          });
        }
      }
    }

    // Chuyển hướng về ảnh nhận diện thương hiệu chính thức nếu không tải được từ FB
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/avatar.jpg`, 302);
  } catch (error) {
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/avatar.jpg`, 302);
  }
}
