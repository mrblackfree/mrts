/**
 * Country flags as SVG images. Emoji flags (regional-indicator pairs) have no glyphs on Windows, where 🇰🇷 renders
 * as the letters "KR", so every flag in the UI goes through this component instead.
 *
 * Artwork: country-flag-icons (MIT, © catamphetamine). Only the flags listed here are bundled (~1 KB each).
 */
import BR from 'country-flag-icons/string/3x2/BR';
import CN from 'country-flag-icons/string/3x2/CN';
import ID from 'country-flag-icons/string/3x2/ID';
import IN from 'country-flag-icons/string/3x2/IN';
import JP from 'country-flag-icons/string/3x2/JP';
import KH from 'country-flag-icons/string/3x2/KH';
import KR from 'country-flag-icons/string/3x2/KR';
import LK from 'country-flag-icons/string/3x2/LK';
import MX from 'country-flag-icons/string/3x2/MX';
import MY from 'country-flag-icons/string/3x2/MY';
import PE from 'country-flag-icons/string/3x2/PE';
import PH from 'country-flag-icons/string/3x2/PH';
import TH from 'country-flag-icons/string/3x2/TH';
import TW from 'country-flag-icons/string/3x2/TW';
import US from 'country-flag-icons/string/3x2/US';
import VN from 'country-flag-icons/string/3x2/VN';
import { cx } from './ui';

const SVG = { BR, CN, ID, IN, JP, KH, KR, LK, MX, MY, PE, PH, TH, TW, US, VN } as const;
export type FlagCode = keyof typeof SVG;

const SRC = Object.fromEntries(Object.entries(SVG).map(([code, svg]) => [code, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`])) as Record<FlagCode, string>;

const isFlagCode = (code: string): code is FlagCode => Object.hasOwn(SRC, code);

/** ISO code of a flag emoji ("🇰🇷" → "KR"), or undefined when the text is not a flag. */
export function codeFromEmoji(emoji: string): string | undefined {
  const points = Array.from(emoji.trim()).map((c) => c.codePointAt(0) ?? 0);
  if (points.length !== 2 || points.some((p) => p < 0x1f1e6 || p > 0x1f1ff)) return undefined;
  return String.fromCharCode(...points.map((p) => p - 0x1f1e6 + 65));
}

/**
 * A flag sized to the surrounding text. Pass `label` when the flag is the only thing naming the country; leave it
 * out (decorative) when the country name is written next to it.
 */
export function Flag({ code, label, className }: { code: string; label?: string; className?: string }) {
  const iso = code.length === 2 ? code.toUpperCase() : codeFromEmoji(code);
  if (!iso || !isFlagCode(iso)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline data URI, nothing to optimise
    <img
      src={SRC[iso]}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={18}
      height={12}
      draggable={false}
      className={cx('inline-block h-[0.8em] w-auto shrink-0 rounded-[2px] align-[-0.08em] shadow-[0_0_0_1px_rgb(15_23_42/0.12)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.16)]', className)}
    />
  );
}
