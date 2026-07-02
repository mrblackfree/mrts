function titleFromFile(file: string) {
  return file
    .replace(/\.(png|jpg|jpeg|webp|svg)$/i, "")
    .replace(/^(ph|jp|th|vn|tw|sg|hk)-/i, "")
    .replace(/-/g, " ")
    .slice(0, 34);
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function themeForFile(file: string) {
  const key = file.toLowerCase();

  if (key.includes("mango")) {
    return {
      bg: "#fff7ed",
      halo: "#fed7aa",
      accent: "#f97316",
      dark: "#9a3412",
      label: "DRIED MANGO",
      visual: "mango",
    };
  }

  if (key.includes("ube") || key.includes("polvoron")) {
    return {
      bg: "#faf5ff",
      halo: "#e9d5ff",
      accent: "#8b5cf6",
      dark: "#5b21b6",
      label: "UBE SNACKS",
      visual: "ube",
    };
  }

  if (key.includes("coconut")) {
    return {
      bg: "#ecfeff",
      halo: "#ccfbf1",
      accent: "#14b8a6",
      dark: "#0f766e",
      label: "COCONUT CHIPS",
      visual: "coconut",
    };
  }

  if (key.includes("coffee") || key.includes("kopiko") || key.includes("barako")) {
    return {
      bg: "#fff7ed",
      halo: "#fed7aa",
      accent: "#92400e",
      dark: "#451a03",
      label: "PHILIPPINE COFFEE",
      visual: "coffee",
    };
  }

  if (key.includes("calamansi")) {
    return {
      bg: "#f7fee7",
      halo: "#d9f99d",
      accent: "#84cc16",
      dark: "#3f6212",
      label: "CALAMANSI",
      visual: "calamansi",
    };
  }

  if (key.includes("chocolate") || key.includes("candy")) {
    return {
      bg: "#fff1f2",
      halo: "#fecdd3",
      accent: "#9f1239",
      dark: "#4c0519",
      label: "CHOCOLATE",
      visual: "chocolate",
    };
  }

  if (key.includes("beauty") || key.includes("health")) {
    return {
      bg: "#f5f3ff",
      halo: "#ddd6fe",
      accent: "#7c3aed",
      dark: "#4c1d95",
      label: "BEAUTY",
      visual: "beauty",
    };
  }

  if (key.includes("gift") || key.includes("souvenir")) {
    return {
      bg: "#eff6ff",
      halo: "#bfdbfe",
      accent: "#2563eb",
      dark: "#1e3a8a",
      label: "SOUVENIR",
      visual: "gift",
    };
  }

  return {
    bg: "#fffbeb",
    halo: "#fde68a",
    accent: "#f59e0b",
    dark: "#92400e",
    label: "BANANA CHIPS",
    visual: "banana",
  };
}

function visualMarkup(theme: ReturnType<typeof themeForFile>) {
  const common = `filter="url(#shadow)"`;

  switch (theme.visual) {
    case "mango":
      return `
        <rect x="112" y="38" width="96" height="142" rx="18" fill="#fbbf24" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="122" y="54" width="76" height="84" rx="12" fill="#fff7ed" opacity=".9"/>
        <path d="M128 146c38-34 66-25 74 2-26 19-51 25-74-2z" fill="#f97316"/>
        <ellipse cx="145" cy="112" rx="18" ry="34" fill="#fb923c" transform="rotate(24 145 112)"/>
        <ellipse cx="174" cy="112" rx="18" ry="34" fill="#fdba74" transform="rotate(24 174 112)"/>
      `;
    case "ube":
      return `
        <rect x="92" y="58" width="136" height="96" rx="12" fill="${theme.accent}" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="110" y="76" width="100" height="46" rx="8" fill="#f5f3ff" opacity=".9"/>
        <text x="160" y="107" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="${theme.dark}">UBE</text>
        <rect x="88" y="154" width="42" height="32" rx="7" fill="#a78bfa" transform="rotate(-10 109 170)"/>
        <rect x="146" y="158" width="42" height="32" rx="7" fill="#c4b5fd" transform="rotate(6 167 174)"/>
        <rect x="202" y="150" width="42" height="32" rx="7" fill="#7c3aed" transform="rotate(13 223 166)"/>
      `;
    case "coconut":
      return `
        <rect x="108" y="42" width="104" height="138" rx="14" fill="#f8fafc" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="118" y="62" width="84" height="54" rx="10" fill="#d1fae5"/>
        <text x="160" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="${theme.dark}">COCONUT</text>
        <circle cx="130" cy="154" r="24" fill="#854d0e"/>
        <circle cx="130" cy="154" r="15" fill="#f8fafc"/>
        <circle cx="186" cy="154" r="24" fill="#854d0e"/>
        <circle cx="186" cy="154" r="15" fill="#f8fafc"/>
      `;
    case "coffee":
      return `
        <rect x="96" y="44" width="116" height="138" rx="12" fill="#7c2d12" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="112" y="66" width="84" height="58" rx="8" fill="#fed7aa"/>
        <text x="154" y="99" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="${theme.dark}">COFFEE</text>
        <path d="M186 146h32c2 22-9 35-28 35-17 0-30-12-30-28h28z" fill="#fff7ed" stroke="${theme.dark}" stroke-width="3"/>
        <path d="M218 150c20 0 20 22 0 22" fill="none" stroke="${theme.dark}" stroke-width="6"/>
        <ellipse cx="189" cy="146" rx="28" ry="8" fill="#451a03"/>
      `;
    case "calamansi":
      return `
        <rect x="105" y="44" width="110" height="138" rx="16" fill="#facc15" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="118" y="62" width="84" height="48" rx="8" fill="#f7fee7" opacity=".9"/>
        <text x="160" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="${theme.dark}">CALAMANSI</text>
        <circle cx="130" cy="150" r="25" fill="#84cc16" stroke="${theme.dark}" stroke-width="3"/>
        <circle cx="181" cy="146" r="28" fill="#a3e635" stroke="${theme.dark}" stroke-width="3"/>
        <path d="M181 119v54M154 146h54M162 127l38 38M200 127l-38 38" stroke="#f7fee7" stroke-width="4"/>
      `;
    case "chocolate":
      return `
        <rect x="94" y="72" width="132" height="82" rx="12" fill="#7f1d1d" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <g fill="#451a03" stroke="#fecaca" stroke-width="2">
          <rect x="112" y="88" width="28" height="22" rx="4"/>
          <rect x="146" y="88" width="28" height="22" rx="4"/>
          <rect x="180" y="88" width="28" height="22" rx="4"/>
          <rect x="112" y="116" width="28" height="22" rx="4"/>
          <rect x="146" y="116" width="28" height="22" rx="4"/>
          <rect x="180" y="116" width="28" height="22" rx="4"/>
        </g>
        <path d="M96 164c28-20 55-20 82 0 20 15 38 16 54 3" fill="none" stroke="#fb7185" stroke-width="12" stroke-linecap="round"/>
      `;
    case "beauty":
      return `
        <rect x="90" y="74" width="44" height="104" rx="13" fill="#ddd6fe" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="103" y="50" width="18" height="25" rx="5" fill="${theme.accent}"/>
        <rect x="148" y="54" width="58" height="124" rx="15" fill="#fff" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="166" y="32" width="22" height="24" rx="5" fill="${theme.accent}"/>
        <rect x="220" y="84" width="34" height="94" rx="12" fill="#c4b5fd" stroke="${theme.dark}" stroke-width="3"/>
        <path d="M174 98c20 7 29 21 22 42-21-6-33-19-22-42z" fill="#86efac"/>
      `;
    case "gift":
      return `
        <rect x="76" y="82" width="102" height="82" rx="12" fill="#bfdbfe" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <path d="M86 82c17-41 55-48 62-4" fill="none" stroke="#92400e" stroke-width="12" stroke-linecap="round"/>
        <rect x="186" y="86" width="62" height="76" rx="10" fill="#fde68a" stroke="${theme.dark}" stroke-width="3"/>
        <path d="M218 86v76M186 122h62" stroke="#2563eb" stroke-width="6"/>
        <circle cx="114" cy="160" r="20" fill="#fff" opacity=".8"/>
      `;
    default:
      return `
        <rect x="104" y="38" width="112" height="146" rx="16" fill="#facc15" stroke="${theme.dark}" stroke-width="3" ${common}/>
        <rect x="116" y="58" width="88" height="54" rx="10" fill="#fff7ed" opacity=".9"/>
        <text x="160" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="${theme.dark}">BANANA</text>
        <path d="M101 153c48 31 96 23 130-24-8 50-62 82-116 54-16-8-24-18-14-30z" fill="#fbbf24" stroke="${theme.dark}" stroke-width="3"/>
        <path d="M120 156c34 19 67 14 92-14" fill="none" stroke="#fff7ed" stroke-width="5" stroke-linecap="round"/>
      `;
  }
}

export function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  return params.then(({ file }) => {
    const label = escapeSvgText(titleFromFile(file));
    const theme = themeForFile(file);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="420" height="320" viewBox="0 0 420 320" role="img" aria-label="${label}">
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#0f172a" flood-opacity=".16"/>
          </filter>
          <radialGradient id="glow" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="52%" stop-color="${theme.halo}"/>
            <stop offset="100%" stop-color="${theme.bg}"/>
          </radialGradient>
        </defs>
        <rect width="420" height="320" rx="28" fill="${theme.bg}"/>
        <circle cx="210" cy="128" r="116" fill="url(#glow)" opacity=".95"/>
        <circle cx="336" cy="238" r="54" fill="${theme.halo}" opacity=".36"/>
        <path d="M55 243c34-18 72-22 116-11 46 11 81 8 121-8 30-12 56-12 76 1" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity=".7"/>
        ${visualMarkup(theme)}
        <text x="210" y="274" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="900" fill="${theme.dark}">${theme.label}</text>
        <text x="210" y="295" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#64748b">${label}</text>
      </svg>
    `;

    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  });
}
