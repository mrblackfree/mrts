'use client';

import { BadgeCheck, Building2, ExternalLink, Globe, Mail, MapPin, ScanSearch, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AGENCY_LINKS } from '@/data/kr-ph-trade-db';
import { PARTNER_TYPE_LABEL } from '@/lib/i18n';
import { rankPartners } from '@/lib/engine/simulate';
import type { PartnerRole, PartnerType, QueryIntent, TradeProduct } from '@/lib/types';
import { useI18n } from '../I18nProvider';
import { Badge, Button, Card, Chip, ModuleHeader, ScoreRing } from '../ui';
import { Flag } from '../Flag';

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
    <Card id="m-partners" className="rise-in scroll-mt-36">
      <ModuleHeader index={4} title={t('m4Title')} icon={<Users className="size-5" />} right={<Badge tone="brand">{list.length} / {ranked.length}</Badge>} />
      <div className="no-print space-y-2.5 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6 dark:border-white/[0.06] dark:bg-white/[0.015]">
        {roles.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t('filterRole')}</span>
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
          <span className="w-14 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t('filterType')}</span>
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
          <span className="w-14 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t('filterRegion')}</span>
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
              <li
                key={c.id}
                className="print-card group/card flex flex-col rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-hairline transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-elevated dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/15"
              >
                <div className="flex items-start gap-3">
                  <ScoreRing value={c.score} label={t('match')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-5 min-w-5 place-items-center rounded-md bg-slate-100 px-1 text-[10.5px] font-bold tabular-nums text-slate-500 dark:bg-white/[0.07] dark:text-slate-400">{i + 1}</span>
                      <Flag code={c.country} label={c.country === 'KR' ? t('countryKR') : t('countryPH')} />
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
                  {c.linkCheck && (c.linkCheck.state === 'ok' || c.linkCheck.state === 'protected') && (
                    <Badge tone="brand" title={`HTTP ${c.linkCheck.status} · ${c.linkCheck.checkedAt}`}>
                      <Globe className="size-3" />
                      {t('webChecked')} {c.linkCheck.checkedAt.slice(5, 10).replace('-', '.')}
                    </Badge>
                  )}
                  {c.license ? (
                    <Badge tone="violet" title={`${c.license.source} · ${c.license.verifiedBy} · ${c.license.verifiedAt}`}>
                      <BadgeCheck className="size-3" />
                      {t('licenseVerified')}
                    </Badge>
                  ) : (
                    <Badge tone="amber">{t('licenseUnverified')}</Badge>
                  )}
                </div>
                <p className="mt-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">{p(c.products)}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{p(c.comment)}</p>
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                  <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
                    {c.linkType === 'official' ? t('linkOfficial') : t('linkListing')} <ExternalLink className="size-3" />
                  </a>
                  {c.country === 'PH' && !c.license && c.role === 'buyer' && c.type !== 'developer' && (
                    <a href={AGENCY_LINKS.phFdaVerify} target="_blank" rel="noreferrer" className="no-print inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300">
                      {t('checkLicense')} <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                {c.license && <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">{c.license.text}{c.license.validUntil ? ` · ~${c.license.validUntil}` : ''}</p>}
                <div className="no-print mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                  <Button size="md" onClick={() => onOpen(c.id, 'analysis')}>
                    <ScanSearch className="size-3.5" aria-hidden />
                    {t('aiDetail')}
                  </Button>
                  <Button variant="primary" size="md" onClick={() => onOpen(c.id, 'email')}>
                    <Mail className="size-3.5" aria-hidden />
                    {t('makeEmail')}
                  </Button>
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
