"use client";

import { useParams } from "next/navigation";
import { PassportPageClient } from "../passport-page-client";

export default function CountryPassportPage() {
  const params = useParams<{ country: string }>();

  return <PassportPageClient slug={params.country} />;
}
