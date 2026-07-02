"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isPassportCountry,
  buildPassportEntryFromSavedQuery,
  PASSPORT_COLLECTIONS,
  readStoredPassportBook,
  SouvenirPassport,
  writeStoredPassportBook,
  type PassportBook,
  type PassportCountry,
  type PassportEntry,
} from "../souvenir-passport";
import {
  buildCountrySelection,
  COUNTRY_FROM_SLUG,
  COUNTRY_SLUGS,
  DEFAULT_ROUTE_SELECTION,
  readRouteSelection,
  type SouvenirRouteSelection,
} from "../souvenir-session";
import { CountryFlag, ServiceShell, SidebarIcon } from "../service-ui";

const PASSPORT_COUNTRIES = Object.keys(PASSPORT_COLLECTIONS) as PassportCountry[];

function resolveCountry(slug?: string): PassportCountry {
  const country = slug ? COUNTRY_FROM_SLUG[slug] : undefined;
  return country && isPassportCountry(country) ? country : "필리핀";
}

export function PassportPageClient({ slug }: { slug?: string }) {
  const [passportBook, setPassportBook] = useState<PassportBook>({});
  const [activeCountry, setActiveCountry] = useState<PassportCountry>(
    resolveCountry(slug)
  );
  const [selection, setSelection] =
    useState<SouvenirRouteSelection>(DEFAULT_ROUTE_SELECTION);
  const [latestEntry, setLatestEntry] = useState<PassportEntry | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextCountry = resolveCountry(slug);
      const storedBook = readStoredPassportBook();
      const params = new URLSearchParams(window.location.search);
      const queryEntry = buildPassportEntryFromSavedQuery(
        nextCountry,
        params.get("saved")
      );
      const nextBook = queryEntry
        ? { ...storedBook, [nextCountry]: queryEntry }
        : storedBook;

      if (queryEntry) {
        writeStoredPassportBook(nextBook);
      }

      const nextSelection = readRouteSelection();
      setSelection(
        nextSelection.country === nextCountry
          ? nextSelection
          : buildCountrySelection(nextCountry)
      );
      setPassportBook(nextBook);
      setActiveCountry(nextCountry);
      setLatestEntry(queryEntry ?? nextBook[nextCountry] ?? null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [slug]);

  function handleCountryChange(country: PassportCountry) {
    setActiveCountry(country);
    setLatestEntry(passportBook[country] ?? null);
  }

  return (
    <ServiceShell active="passport" selection={selection}>
      <div className="space-y-5">
        <section className="flex flex-col gap-4 rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-44px_rgba(30,64,175,0.45)] xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-[58px_1fr] items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <SidebarIcon name="passport" className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-black text-blue-600">Souvenir Passport</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                여행의 마지막 선택을 기록하는 기념품 여권
              </h1>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-slate-700">
              다른 국가 패스포트 보기
            </p>
            <div className="flex flex-wrap gap-3">
              {PASSPORT_COUNTRIES.map((country) => (
                <Link
                  key={country}
                  href={`/passport/${COUNTRY_SLUGS[country]}`}
                  onClick={() => handleCountryChange(country)}
                  className={`inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md border px-4 text-sm font-black transition active:translate-y-[1px] ${
                    activeCountry === country
                      ? "border-blue-600 bg-blue-600 text-white shadow-[0_16px_28px_-22px_rgba(0,104,255,0.85)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <CountryFlag country={country} className="shrink-0" />
                  {country}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SouvenirPassport
          book={passportBook}
          activeCountry={activeCountry}
          latestEntry={latestEntry}
        />
      </div>
    </ServiceShell>
  );
}
