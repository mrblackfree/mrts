'use client';

import type { ReactNode } from 'react';
import { mailtoLink, type Rfq } from '@/lib/rfq';
import { useI18n } from './I18nProvider';
import { copyText } from './ui';

/**
 * Opens a pre-filled request in the user's mail app. A request too long for a mail link (some desktop clients cut
 * them) opens with the subject and a paste note, and the click puts the full text on the clipboard.
 */
export default function RfqLink({ rfq, className, children }: { rfq: Rfq; className?: string; children: ReactNode }) {
  const { t } = useI18n();
  const { href, tooLong } = mailtoLink(rfq, t('mailtoPaste'));
  return (
    <a
      href={href}
      className={className}
      title={tooLong ? t('mailtoHint') : rfq.subject}
      onClick={() => {
        if (tooLong) void copyText(`${rfq.subject}\n\n${rfq.body}`);
      }}
    >
      {children}
    </a>
  );
}
