import { ImageResponse } from 'next/og';

// Link preview card (Open Graph / Twitter). English only: the built-in renderer font has no Korean glyphs.
export const alt = 'TradeScope AI — Global trade, answered in one question';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(180deg, #e6f2f7 0%, #f5f7fa 55%)',
          color: '#0b1220',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 34, fontWeight: 700 }}>
            T
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            TradeScope <span style={{ color: '#195873', marginLeft: 10 }}>AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Global trade,</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, color: '#195873' }}>answered in one question</div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#3c4859' }}>Duties, permits, partners and shipping — step by step, to the day your cargo arrives.</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 24, color: '#3c4859' }}>
          <div style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: '#ffffff', border: '1px solid #cfd9e1' }}>First corridor · Korea ↔ Philippines</div>
          <div style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: '#ffffff', border: '1px solid #cfd9e1' }}>Local FDA · BAI experts</div>
          <div style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: '#ffffff', border: '1px solid #cfd9e1' }}>Container tracking</div>
        </div>
      </div>
    ),
    size,
  );
}
