'use client';

import { Building2, ExternalLink, Mail, MapPin, ScanSearch, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PARTNER_TYPE_LABEL } from '@/lib/i18n';
import { rankPartners } from '@/lib/engine/simulate';
import type { PartnerRole, PartnerType, QueryIntent, TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, Card, Chip, ModuleHeader, ScoreRing } from '../ui';

export default function PartnersModule({ product, intent, onOpen }: { product: TradeProduct; intent: QueryIntent; onOpen: (partnerId: string, tab: 'analysis' | 'email') => void }) {
  const { t, p, lang } = useI18n();
  const ranked = useMemo(() => rankPartners(product, intent), [product, intent]);
  const [role, setRole] = useState<PartnerRole | 'all'>('all');
  const [type, setType] = useState<PartnerType | 'all'>('all');
  const [region, setRegion] = useState<string>('all');

  useEffect(() => {
    setRole('all');
    setType('all');
    setRegion('all');
  }, [product.id]);

  const types = Array.from(new Set(ranked.map((r) => r.type)));
  const regions = Array.from(new Set(ranked.map((r) => r.region)));
  const roles = Array.from(new Set(ranked.map((r) => r.role)));
  const list = ranked.filter((r) => (role === 'all' || r.role === role) && (type === 'all' || r.type === type) && (region === 'all' || r.region === region));

  return (
    <Card id="m-partners" className="rise-in scroll-mt-28">
      <ModuleHeader index={4} title={t('m4Title')} icon={<Users className="size-5" />} right={<Badge tone="brand">{list.length} / {ranked.length}</Badge>} />
      <div className="no-print space-y-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        {roles.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 text-[11px] font-bold uppercase text-slate-400">{t('filterRole')}</span>
            <Chip active={role === 'all'} onClick={() => setRole('all')}>
              {t('all')}
            </Chip>
            {roles.map((r) => (
              <Chip key={r} active={role === r} onClick={() => setRole(r)}>
                {r === 'buyer' ? t('roleBuyer') : t('roleSeller')}
              </Chip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 text-[11px] font-bold uppercase text-slate-400">{t('filterType')}</span>
          <Chip active={type === 'all'} onClick={() => setType('all')}>
            {t('all')}
          </Chip>
          {types.map((ty) => (
            <Chip key={ty} active={type === ty} onClick={() => setType(ty)}>
              {PARTNER_TYPE_LABEL[ty][lang]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 text-[11px] font-bold uppercase text-slate-400">{t('filterRegion')}</span>
          <Chip active={region === 'all'} onClick={() => setRegion('all')}>
            {t('all')}
          </Chip>
          {regions.map((rg) => (
            <Chip key={rg} active={region === rg} onClick={() => setRegion(rg)}>
              {rg}
            </Chip>
          ))}
        </div>
      </div>

      <div className="p-5">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">{t('noPartners')}</p>
        ) : (
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((c, i) => (
              <li key={c.id} className="print-card flex flex-col rounded-2xl border border-slate-200 p-4 transition hover:border-brand-500/60 hover:shadow-md dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <ScoreRing value={c.score} label={t('match')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">#{i + 1}</span>
                      <span aria-hidden>{c.country === 'KR' ? '🇰🇷' : '🇵🇭'}</span>
                      <Badge tone={c.role === 'buyer' ? 'brand' : 'violet'}>{c.role === 'buyer' ? t('roleBuyer') : t('roleSeller')}</Badge>
                      {c.regionMatch && <Badge tone="amber">{t('regionMatch')}</Badge>}
                    </div>
                    <h3 className="mt-1 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{c.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="size-3" />
                      {c.city}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>
                    <Building2 className="size-3" />
                    {PARTNER_TYPE_LABEL[c.type][lang]}
                  </Badge>
                </div>
                <p className="mt-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">{p(c.products)}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{p(c.comment)}</p>
                <a href={c.website} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
                  {c.linkType === 'official' ? t('linkOfficial') : t('linkListing')} <ExternalLink className="size-3" />
                </a>
                <div className="no-print mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(c.id, 'analysis')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-brand-400"
                  >
                    <ScanSearch className="size-3.5" />
                    {t('aiDetail')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpen(c.id, 'email')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2 py-2 text-xs font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Mail className="size-3.5" />
                    {t('makeEmail')}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{t('partnerDisclaimer')}</p>
      </div>
    </Card>
  );
}
