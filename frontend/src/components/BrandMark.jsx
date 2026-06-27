export default function BrandMark({ size = 44 }) {
  return (
    <img
      src="/strikepilot-mark.png"
      width={size}
      height={size}
      alt="StrikePilot"
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}
