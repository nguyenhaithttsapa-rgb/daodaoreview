import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Detect MIME type from image magic bytes. */
function detectImageContentType(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

/** Extract og:image or twitter:image URL regardless of attribute order. */
function extractOgImageUrl(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+(?:name|property)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']twitter:image["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  }
  return null;
}

/** Serve /avatar.jpg directly from disk with short TTL to avoid localhost redirects behind proxy. */
function serveFallbackAvatar(): NextResponse {
  const avatarPath = path.join(process.cwd(), 'public', 'avatar.jpg');
  if (fs.existsSync(avatarPath)) {
    const buf = fs.readFileSync(avatarPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
  return new NextResponse('Thumbnail not found', { status: 404 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const rawId = id.replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
    const compactId = rawId.replace(/_/g, '');
    if (!rawId) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const thumbDir = path.join(process.cwd(), 'public', 'thumbnails');
    const idCandidates = compactId && compactId !== rawId ? [rawId, compactId] : [rawId];
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const candidateId of idCandidates) {
      for (const ext of extensions) {
        const localFile = path.join(thumbDir, `${candidateId}${ext}`);
        if (fs.existsSync(localFile)) {
          const buffer = fs.readFileSync(localFile);
          if (buffer.length > 5000) {
            return new NextResponse(buffer, {
              headers: {
                'Content-Type': detectImageContentType(buffer),
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }
      }
    }

    // Nếu chưa có file cục bộ trên đĩa và ID là số Facebook, tự động tải từ Facebook Watch hoặc Reel URL
    if (/^\d{8,25}$/.test(compactId)) {
      const targetSaveFile = path.join(thumbDir, `${compactId}.jpg`);
      const candidateUrls = [
        `https://www.facebook.com/watch/?v=${compactId}`,
        `https://www.facebook.com/reel/${compactId}/`,
      ];

      for (const fbPageUrl of candidateUrls) {
        try {
          const fbRes = await fetch(fbPageUrl, {
            headers: {
              'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            },
            signal: AbortSignal.timeout(6000),
          });

          if (fbRes.ok) {
            const html = await fbRes.text();
            const imgUrl = extractOgImageUrl(html);
            if (imgUrl) {
              const imgRes = await fetch(imgUrl, {
                headers: {
                  'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                },
                signal: AbortSignal.timeout(6000),
              });
              if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                if (buffer.length > 5000) {
                  if (!fs.existsSync(thumbDir)) {
                    fs.mkdirSync(thumbDir, { recursive: true });
                  }
                  fs.writeFileSync(targetSaveFile, buffer);
                  return new NextResponse(buffer, {
                    headers: {
                      'Content-Type': detectImageContentType(buffer),
                      'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                  });
                }
              }
            }
          }
        } catch {
          // Thử URL tiếp theo
        }
      }
    }

    return serveFallbackAvatar();
  } catch {
    return serveFallbackAvatar();
  }
}
