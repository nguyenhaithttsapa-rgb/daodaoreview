import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/bot-control') ||
    url.pathname.startsWith('/api/batch-import') ||
    url.pathname.startsWith('/api/cleaner-bot') ||
    url.pathname.startsWith('/api/reel-crawler')
  ) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      if (user === 'admin' && pwd === 'daodao888') {
        return NextResponse.next();
      }
    }

    return new NextResponse('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
