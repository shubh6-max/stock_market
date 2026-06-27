export default function BrandMark({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", borderRadius: 16 }}
      aria-label="StrikePilot"
    >
      <defs>
        <linearGradient id="brand-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#e8f0fb" />
        </linearGradient>
        <linearGradient id="brand-line" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2f6fed" />
          <stop offset="100%" stopColor="#39a88d" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="14" fill="url(#brand-bg)" />
      <path d="M12 17.5H52" stroke="rgba(99,129,174,0.14)" />
      <path d="M12 31.5H52" stroke="rgba(99,129,174,0.14)" />
      <path d="M12 45.5H52" stroke="rgba(99,129,174,0.14)" />
      <rect x="13" y="41" width="5" height="11" rx="1.5" fill="rgba(47,111,237,0.18)" />
      <rect x="22" y="34" width="5" height="18" rx="1.5" fill="rgba(47,111,237,0.24)" />
      <rect x="31" y="28" width="5" height="24" rx="1.5" fill="rgba(47,111,237,0.3)" />
      <rect x="40" y="20" width="5" height="32" rx="1.5" fill="rgba(47,111,237,0.38)" />
      <polyline
        points="13,46 23,40 33,30 45,20 51,15"
        stroke="url(#brand-line)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="51" cy="15" r="7" fill="rgba(232,160,55,0.16)" />
      <circle cx="51" cy="15" r="4.5" fill="#d6942e" />
      <circle cx="51" cy="15" r="1.5" fill="#18314f" />
    </svg>
  );
}
