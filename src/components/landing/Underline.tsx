export function Underline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 40"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 26 C 120 8, 260 34, 380 18 S 560 30, 596 14"
        fill="none"
        stroke="var(--lime)"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
