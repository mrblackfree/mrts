export const WEB_APP_URL = "https://mrt-souvenir.vercel.app";

export const PLUGIN_DEMO_SAVED_SOUVENIRS =
  "owltree-banana-chips,dried-mango,kopiko,ube-polvoron,coconut-chips";

function buildWebAppUrl(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString().replace(/%2C/g, ",");
  return `${WEB_APP_URL}${path}?${query}`;
}

export function buildAutoRecommendUrl() {
  return buildWebAppUrl("/auto-recommend", {
    source: "plugin",
    user: "demo",
    trip: "philippines-bohol",
    country: "philippines",
    city: "bohol",
    stage: "return-eve",
    recipient: "coworkers",
  });
}

export function buildGuideUrl() {
  return buildWebAppUrl("/guide", {
    source: "plugin",
    country: "philippines",
    city: "bohol",
    stage: "return-eve",
  });
}

export function buildPassportUrl() {
  return buildWebAppUrl("/passport/philippines", {
    source: "plugin",
    saved: PLUGIN_DEMO_SAVED_SOUVENIRS,
  });
}

export function buildCompareUrl() {
  return buildWebAppUrl("/compare", {
    source: "plugin",
    country: "philippines",
    city: "bohol",
    recipient: "coworkers",
  });
}

export function getPluginPlaceLabel(params: URLSearchParams) {
  const country = params.get("country");
  const city = params.get("city");

  if (country === "philippines" && city === "bohol") {
    return "필리핀 보홀";
  }

  if (country === "philippines") {
    return "필리핀";
  }

  return "선택한 여행지";
}
