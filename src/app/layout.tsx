import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Script from "next/script";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://daodaoreview.com'),
  title: "Dao Dao Review - Thế Giới Review Phim Hoạt Hình 3D & Truyện Tranh Đỉnh Cao",
  description: "Trang tổng hợp video review, tóm tắt hoạt hình 3D tu tiên, huyền huyễn, anime và truyện tranh chất lượng cao hoàn toàn không quảng cáo khó chịu.",
  keywords: ["Dao Dao Review", "daodaoreview", "hoạt hình 3D", "tu tiên", "anime", "truyện tranh", "review phim", "tóm tắt phim", "đấu phá thương khung", "phàm nhân tu tiên"],
  authors: [{ name: "Dao Dao Review" }],
  creator: "Dao Dao Review",
  openGraph: {
    title: "Dao Dao Review - Thế Giới Review Phim Hoạt Hình 3D & Truyện Tranh Đỉnh Cao",
    description: "Trải nghiệm giải trí tinh gọn, đỉnh cao và hoàn toàn miễn phí. Đồ họa chuẩn điện ảnh, tóm tắt tinh gọn không quảng cáo.",
    url: "https://daodaoreview.com",
    siteName: "Dao Dao Review",
    images: [
      {
        url: "https://daodaoreview.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Dao Dao Review - Thế Giới Review Phim Hoạt Hình 3D & Truyện Tranh Đỉnh Cao",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dao Dao Review - Thế Giới Review Phim Hoạt Hình 3D & Truyện Tranh Đỉnh Cao",
    description: "Trải nghiệm giải trí tinh gọn, đỉnh cao và hoàn toàn miễn phí. Không quảng cáo rác.",
    images: ["https://daodaoreview.com/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/avatar.jpg", sizes: "512x512", type: "image/jpeg" }
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    'msvalidate.01': '5D1A03A3348433D435E89B34514DE8F0',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#05010a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
        {/* Google Analytics */}
        <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-HYVH98WXZN" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HYVH98WXZN');
          `}
        </Script>

        {/* Hieu ung May mu / Neon Fog */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-drift"></div>
          <div className="absolute top-[30%] right-[-10%] w-[40%] h-[60%] bg-cyan-600/20 rounded-full blur-[150px] animate-drift-slow"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[140px] animate-drift-slower"></div>
        </div>

        <div className="relative z-0 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-purple-900/50 bg-[#0a0514]/80 backdrop-blur py-8 text-center text-xs text-purple-300/60">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 Dao Dao Review. Trang tổng hợp video nhúng trực tiếp từ các nền tảng mạng xã hội.</p>
              <div className="flex gap-4">
                <span className="hover:text-cyan-400 cursor-pointer transition-colors">Điều khoản</span>
                <span className="hover:text-cyan-400 cursor-pointer transition-colors">Chính sách bản quyền DMCA</span>
                <span className="hover:text-cyan-400 cursor-pointer transition-colors">Liên hệ quảng cáo</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

