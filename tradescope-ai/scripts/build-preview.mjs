#!/usr/bin/env node
/**
 * Static preview: the landing page, analysis and 7-step guide as plain files (index.html, app.js, app.css, fonts)
 * that any static host can serve — no Node server. Built with NEXT_PUBLIC_STATIC_PREVIEW=1, so everything that needs
 * the server says so instead of failing (see src/lib/preview.ts): analysis runs in the browser, tracking shows the
 * example timeline, expert requests cannot be sent, nothing is measured, there is no /admin.
 *
 *   npm run build:preview        → preview-dist/
 *
 * All paths in the output are relative, so the folder works from any sub-path. It is not a replacement for the
 * real deployment (Docker / Vercel), only a way to show the product where no server can run.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'preview-dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ---- script ----------------------------------------------------------------------------------------------------
await build({
  entryPoints: [path.join(root, 'scripts/preview-entry.tsx')],
  outfile: path.join(out, 'app.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  legalComments: 'none',
  alias: { '@': path.join(root, 'src') },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_STATIC_PREVIEW': '"1"',
    // build-time links are left unset in the preview; any other env lookup reads as undefined
    'process.env': '{}',
  },
  logLevel: 'warning',
});

// ---- styles: Tailwind over the same sources as the app, plus the self-hosted Pretendard subset -----------------
const globalsPath = path.join(root, 'src/app/globals.css');
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(readFileSync(globalsPath, 'utf8'), { from: globalsPath });
writeFileSync(path.join(out, 'app.css'), css.css);
cpSync(path.join(root, 'src/app/fonts/pretendard'), path.join(out, 'fonts/pretendard'), { recursive: true });

// ---- page ------------------------------------------------------------------------------------------------------
// Theme: a host's explicit choice (data-theme on <html>, as claude.ai sets it) wins, then the saved choice, then the
// system setting; a later host change is followed too.
const themeScript = `(function(){var r=document.documentElement;function apply(){var h=r.getAttribute('data-theme'),t=null;try{t=localStorage.getItem('ts-theme')}catch(e){}var d=h?h==='dark':t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;r.classList.toggle('dark',d)}apply();try{new MutationObserver(apply).observe(r,{attributes:true,attributeFilter:['data-theme']})}catch(e){}})();`;
// a sticky header clears the phone's status bar when the page runs edge to edge
const safeArea = `<style>header.sticky{top:env(safe-area-inset-top,0px)}body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:41;background:var(--ts-band,#f5f7fa)}:root.dark body::before{background:#060a12}</style>`;
const description = '무엇을 어디로 보내는지 적으면 관세·FTA·인허가·거래처·선적까지 7단계로 알려 드립니다. 대한민국 ↔ 필리핀 프로토타입 미리보기.';
const inner = `<title>TradeScope AI</title>
<meta name="description" content="${description}">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<script>${themeScript}</script>
${safeArea}
<link rel="stylesheet" href="fonts/pretendard/pretendardvariable-dynamic-subset.css">
<link rel="stylesheet" href="app.css">
<div id="root" class="min-h-screen font-sans"></div>
<script type="module" src="app.js"></script>
`;
// index.html: a complete page for any static host
writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${inner.replace('<div id="root"', '</head>\n<body>\n<div id="root"')}</body>\n</html>\n`,
);
// page.html: the same content without the document skeleton, for hosts that wrap the page themselves (claude.ai)
writeFileSync(path.join(out, 'page.html'), inner);
cpSync(path.join(root, 'src/app/icon.svg'), path.join(out, 'icon.svg'));
console.log(`preview → ${path.relative(process.cwd(), out)}/`);
