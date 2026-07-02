import type { PassportCountry } from "./souvenir-passport";

type StampShape = "circle" | "rectangle" | "oval" | "octagon" | "label";

type PassportStampProps = {
  country: PassportCountry;
  souvenir: string;
  savedAt: string;
  index: number;
  collected: boolean;
};

const SHAPES: StampShape[] = ["circle", "rectangle", "oval", "octagon", "label"];
const ROTATIONS = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2"];

const COUNTRY_TONES: Record<
  PassportCountry,
  {
    ink: string;
    accent: string;
    wash: string;
  }
> = {
  필리핀: {
    ink: "#0369a1",
    accent: "#f59e0b",
    wash: "rgba(14, 165, 233, 0.08)",
  },
  일본: {
    ink: "#b91c1c",
    accent: "#1e3a8a",
    wash: "rgba(185, 28, 28, 0.07)",
  },
  대만: {
    ink: "#15803d",
    accent: "#ea580c",
    wash: "rgba(22, 163, 74, 0.08)",
  },
};

function stampShapeClass(shape: StampShape) {
  if (shape === "circle") {
    return "aspect-square rounded-full";
  }
  if (shape === "oval") {
    return "aspect-[1.45/1] rounded-[999px]";
  }
  if (shape === "label") {
    return "aspect-[1.55/1] rounded-md";
  }
  return "aspect-[1.18/1] rounded-lg";
}

function stampClipPath(shape: StampShape) {
  if (shape !== "octagon") {
    return undefined;
  }

  return "polygon(18% 0, 82% 0, 100% 18%, 100% 82%, 82% 100%, 18% 100%, 0 82%, 0 18%)";
}

export function PassportStamp({
  country,
  souvenir,
  savedAt,
  index,
  collected,
}: PassportStampProps) {
  const shape = SHAPES[index % SHAPES.length];
  const tone = COUNTRY_TONES[country];
  const rotation = ROTATIONS[index % ROTATIONS.length];
  const status = collected ? (index % 2 === 0 ? "COLLECTED" : "SAVED") : "OPEN SLOT";
  const labelSkew = shape === "label" ? "-skew-x-6" : "";

  return (
    <div
      data-testid="passport-stamp"
      data-collected={collected ? "true" : "false"}
      data-shape={shape}
      className={`relative flex min-h-[118px] w-full max-w-[160px] shrink-0 items-center justify-center justify-self-center border-2 border-dashed px-2.5 py-3.5 text-center uppercase transition ${stampShapeClass(
        shape
      )} ${rotation} ${labelSkew} ${collected ? "opacity-95" : "opacity-35 grayscale"}`}
      style={{
        borderColor: tone.ink,
        color: tone.ink,
        clipPath: stampClipPath(shape),
        backgroundColor: collected ? tone.wash : "rgba(248, 250, 252, 0.7)",
        backgroundImage: `radial-gradient(circle at 20% 18%, ${tone.accent}22 0 2px, transparent 2.8px), radial-gradient(circle at 80% 68%, ${tone.ink}18 0 1.5px, transparent 2.5px), radial-gradient(circle at 50% 50%, transparent 0 45%, ${tone.ink}0f 46%, transparent 47%), repeating-linear-gradient(135deg, transparent 0 7px, ${tone.ink}10 7px 8px)`,
        boxShadow: `inset 0 0 0 3px rgba(255,255,255,0.55), inset 0 0 0 7px ${tone.ink}10, 0 10px 22px -18px ${tone.ink}`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-2 rounded-[inherit] border border-dotted opacity-40"
        style={{ borderColor: tone.ink }}
      />
      <svg
        viewBox="0 0 120 70"
        className="pointer-events-none absolute inset-x-4 top-3 h-10 opacity-[0.15]"
        aria-hidden
      >
        <path
          d="M18 48c10-18 23-28 39-28 18 0 28 12 45 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M18 52h84"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="4 8"
        />
      </svg>
      <div className="relative z-[1] grid gap-1">
        <span className="text-[9px] font-black tracking-[0.22em]">
          MRT STAMP
        </span>
        <span className="text-[10px] font-black tracking-[0.18em]">
          {country}
        </span>
        <span
          className="mx-auto h-px w-14"
          style={{ backgroundColor: tone.accent }}
        />
        <strong className="text-[13px] font-black leading-tight tracking-normal text-current">
          {souvenir}
        </strong>
        <span className="text-[10px] font-black tracking-[0.15em]">
          {status}
        </span>
        <span className="text-[10px] font-bold tracking-normal">
          {savedAt}
        </span>
      </div>
    </div>
  );
}
