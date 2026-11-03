import type { Metadata, Viewport } from 'next';
// Pretendard (SIL OFL 1.1), self-hosted as a dynamic subset: the browser only downloads the glyph ranges it needs.
import './fonts/pretendard/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeScope AI — KR ↔ PH 올인원 AI 무역 인텔리전스',
  description:
    '대한민국 ↔ 필리핀 특화 올인원 AI 무역 인텔리전스 플랫폼 MVP: HS Code 추천, FTA 절세 시뮬레이터, 통관·인증 체크리스트, 시장·물류 인텔리전스, 바이어·공급사 매칭, 콜드메일·PI 자동 생성.',
  applicationName: 'TradeScope AI',
  keywords: ['TradeScope AI', '무역', '필리핀', 'FTA', 'HS Code', 'RCEP', 'AKFTA', '한-필리핀 FTA', 'trade intelligence'],
  openGraph: {
    title: 'TradeScope AI — KR ↔ PH AI Trade Intelligence',
    description: 'Korea ↔ Philippines all-in-one AI trade intelligence MVP',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#060a12' },
  ],
};

// Applies the saved / system theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('ts-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
