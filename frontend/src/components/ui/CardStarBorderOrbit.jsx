import React, { useEffect, useRef, useState } from "react";

export function CardStarBorderOrbit({ cardRef }) {
  const pathRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 420, height: 480 });
  const [totalLength, setTotalLength] = useState(1750);

  useEffect(() => {
    if (!cardRef.current) return;
    const update = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const w = Math.round(rect.width);
          const h = Math.round(rect.height);
          setDimensions({ width: w, height: h });
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [cardRef]);

  // Measure exact SVG path length once rendered
  useEffect(() => {
    if (pathRef.current) {
      try {
        const len = pathRef.current.getTotalLength();
        if (len > 0) setTotalLength(Math.round(len));
      } catch {
        // Fallback to default
      }
    }
  }, [dimensions]);

  const { width: w, height: h } = dimensions;
  const r = 30; // Border radius matching rounded-[30px]

  // Exact point along top edge where the falling star hits
  const impactX = Math.round(w * 0.372);

  // Closed perimeter path of the card starting at (impactX, 0)
  const pathD = `
    M ${impactX} 0
    L ${w - r} 0
    A ${r} ${r} 0 0 1 ${w} ${r}
    L ${w} ${h - r}
    A ${r} ${r} 0 0 1 ${w - r} ${h}
    L ${r} ${h}
    A ${r} ${r} 0 0 1 0 ${h - r}
    L 0 ${r}
    A ${r} ${r} 0 0 1 ${r} 0
    L ${impactX} 0
  `.replace(/\s+/g, " ").trim();

  // One-fourth (1/4) of the perimeter length:
  // The cloud wake spans up to 1/4 behind the star, and then dissolves
  const quarterPath = Math.round(totalLength * 0.25);
  const midWake = Math.round(totalLength * 0.14);
  const nearWake = Math.round(totalLength * 0.05);

  return (
    <svg
      className="pointer-events-none absolute -inset-[1px] w-[calc(100%+2px)] h-[calc(100%+2px)] z-30 overflow-visible"
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
    >
      <defs>
        {/* Sky falling star tail gradient (angled at 28 degrees) */}
        <linearGradient id="sky-star-tail" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="80%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        {/* Soft near-head starlight gradient */}
        <linearGradient id="card-trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.35" />
          <stop offset="85%" stopColor="#e2e8f0" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>

        {/* Compact sparkle glow */}
        <radialGradient id="compact-sparkle-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>

        {/* Refined star glow filter */}
        <filter id="star-glow-filter" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Foggy Cloud Blur Filters (creates smooth, natural dissipation like car road dust) */}
        <filter id="fog-cloud-wide" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="fog-cloud-med" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Guide path for the card perimeter */}
      <path ref={pathRef} id="orbit-card-path" d={pathD} fill="none" stroke="none" />

      {/* ─────────────────────────────────────────────────────────────
          1. FALLING STAR IN THE SKY (0.0s – 3.2s / 0% – 29.1%)
          Starts in the night sky and flies into the card top edge.
          ───────────────────────────────────────────────────────────── */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`${impactX - 223}, -119; ${impactX - 223}, -119; ${impactX}, 0; ${impactX}, 0`}
          keyTimes="0; 0.045; 0.291; 1"
          dur="11s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0; 1; 1; 0; 0"
          keyTimes="0; 0.045; 0.09; 0.285; 0.291; 1"
          dur="11s"
          repeatCount="indefinite"
        />

        <line
          x1="-66"
          y1="-35"
          x2="0"
          y2="0"
          stroke="url(#sky-star-tail)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="6" fill="rgba(56, 189, 248, 0.4)" filter="blur(1.5px)" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
        <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          2. IMPACT BURST AT THE CONTACT POINT (at 3.2s / 29.1%)
          Flashes right as the falling star strikes the card.
          ───────────────────────────────────────────────────────────── */}
      <circle cx={impactX} cy={0} r="10" fill="url(#compact-sparkle-glow)">
        <animate
          attributeName="r"
          values="0; 0; 16; 0; 0"
          keyTimes="0; 0.288; 0.298; 0.325; 1"
          dur="11s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0; 1; 0; 0"
          keyTimes="0; 0.288; 0.298; 0.325; 1"
          dur="11s"
          repeatCount="indefinite"
        />
      </circle>

      {/* ─────────────────────────────────────────────────────────────
          3. FOGGY CLOUD MOTION WAKE (Dissolves after 1/4 of the path)
          Trailing cloud spans up to 1/4 (~430px) behind the star.
          As the star advances, the oldest dust > 1/4 away evaporates!
          Soft, muted translucent whitish tone (not harsh white).
          ───────────────────────────────────────────────────────────── */}
      {/* Outer diffuse cloud dust (faintest, widest vapor — dissolves at 1/4 path) */}
      <path
        d={pathD}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${quarterPath} ${totalLength}`}
        filter="url(#fog-cloud-wide)"
      >
        <animate
          attributeName="stroke-dashoffset"
          values={`${quarterPath}; ${quarterPath}; ${quarterPath - totalLength}; ${quarterPath - totalLength}`}
          keyTimes="0; 0.291; 0.891; 1"
          dur="11s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0; 0.15; 0.15; 0; 0"
          keyTimes="0; 0.290; 0.32; 0.885; 0.935; 1"
          dur="11s"
          repeatCount="indefinite"
        />
      </path>

      {/* Mid misty stardust body (~15% of path, soft white haze) */}
      <path
        d={pathD}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${midWake} ${totalLength}`}
        filter="url(#fog-cloud-med)"
      >
        <animate
          attributeName="stroke-dashoffset"
          values={`${midWake}; ${midWake}; ${midWake - totalLength}; ${midWake - totalLength}`}
          keyTimes="0; 0.291; 0.891; 1"
          dur="11s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0; 0.24; 0.24; 0; 0"
          keyTimes="0; 0.290; 0.32; 0.885; 0.935; 1"
          dur="11s"
          repeatCount="indefinite"
        />
      </path>

      {/* Near head stardust streak (~5% of path, gentle translucent starlight) */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#card-trail-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${nearWake} ${totalLength}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          values={`${nearWake}; ${nearWake}; ${nearWake - totalLength}; ${nearWake - totalLength}`}
          keyTimes="0; 0.291; 0.891; 1"
          dur="11s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0; 0.6; 0.6; 0; 0"
          keyTimes="0; 0.290; 0.305; 0.885; 0.925; 1"
          dur="11s"
          repeatCount="indefinite"
        />
      </path>

      {/* ─────────────────────────────────────────────────────────────
          4. MOVING STAR HEAD
          Begins moving ONLY after the falling star hits (at 29.1%).
          ───────────────────────────────────────────────────────────── */}
      <g>
        <animateMotion
          dur="11s"
          repeatCount="indefinite"
          rotate="auto"
          keyPoints="0; 0; 1; 1"
          keyTimes="0; 0.291; 0.891; 1"
          calcMode="linear"
        >
          <mpath href="#orbit-card-path" />
        </animateMotion>

        <animate
          attributeName="opacity"
          values="0; 0; 1; 1; 0; 0"
          keyTimes="0; 0.290; 0.295; 0.885; 0.895; 1"
          dur="11s"
          repeatCount="indefinite"
        />

        {/* Star soft ambient halo */}
        <circle cx="0" cy="0" r="6" fill="rgba(56, 189, 248, 0.35)" />
        <circle cx="0" cy="0" r="3" fill="rgba(255, 255, 255, 0.75)" />

        {/* 4-pointed small thin star */}
        <path
          d="M 0,-6 Q 0,0 6,0 Q 0,0 0,6 Q 0,0 -6,0 Q 0,0 0,-6 Z"
          fill="#ffffff"
          filter="url(#star-glow-filter)"
        />

        {/* Bright center core */}
        <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          5. COMPACT REFINED POP-UP (9.8s – 10.4s / 89.1% – 94.5%)
          Subtle, refined pop-up at the return point (impactX, 0).
          ───────────────────────────────────────────────────────────── */}
      <g transform={`translate(${impactX}, 0)`}>
        {/* Subtle compact ring */}
        <circle cx="0" cy="0" r="0" fill="none" stroke="#38bdf8" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="0; 0; 0; 13; 0"
            keyTimes="0; 0.888; 0.895; 0.935; 1"
            dur="11s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0; 0; 0; 0.65; 0"
            keyTimes="0; 0.888; 0.895; 0.935; 1"
            dur="11s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Compact star sparkle flare */}
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values="0; 0; 0; 1.3; 0; 0"
            keyTimes="0; 0.888; 0.895; 0.915; 0.945; 1"
            dur="11s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0; 0; 0; 1; 0; 0"
            keyTimes="0; 0.888; 0.895; 0.915; 0.945; 1"
            dur="11s"
            repeatCount="indefinite"
          />
          <path
            d="M 0,-7 Q 0,0 7,0 Q 0,0 0,7 Q 0,0 -7,0 Q 0,0 0,-7 Z"
            fill="#ffffff"
            filter="url(#star-glow-filter)"
          />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}
