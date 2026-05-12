export default function BrandMark({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", borderRadius: 12, boxShadow: "0 0 30px rgba(124,92,255,0.4)" }}
      aria-label="StrikePilot"
    >
      <defs>
        <linearGradient id="brand-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4cc9f0" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#brand-bg)" />
      {/* ascending micro-bars */}
      <rect x="13" y="44" width="4" height="8"  rx="1" fill="#06091a" opacity="0.18" />
      <rect x="21" y="38" width="4" height="14" rx="1" fill="#06091a" opacity="0.18" />
      <rect x="29" y="32" width="4" height="20" rx="1" fill="#06091a" opacity="0.18" />
      <rect x="37" y="24" width="4" height="28" rx="1" fill="#06091a" opacity="0.18" />
      <rect x="45" y="18" width="4" height="34" rx="1" fill="#06091a" opacity="0.18" />
      {/* trending up line */}
      <polyline
        points="13,46 23,40 33,30 45,20 51,15"
        stroke="#06091a"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* strike target dot at apex */}
      <circle cx="51" cy="15" r="6.5" fill="#06091a" />
      <circle cx="51" cy="15" r="2.8" fill="#4cc9f0" />
    </svg>
  );
}
