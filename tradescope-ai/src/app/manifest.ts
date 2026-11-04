import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TradeScope AI',
    short_name: 'TradeScope',
    description: 'Global trade, answered in one question — duties, permits, partners and shipping, step by step. First corridor: Korea ↔ Philippines.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#0b1220',
    lang: 'ko',
    icons: [{ src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' }],
  };
}
