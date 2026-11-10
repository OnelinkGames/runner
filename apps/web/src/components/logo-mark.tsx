export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="DevDesk"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#0A0A0A" />
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="6.75"
        fill="none"
        stroke="#39FF14"
        strokeOpacity=".4"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="10" r="1.7" fill="#39FF14" />
      <circle cx="8.5" cy="16" r="1.7" fill="#39FF14" fillOpacity=".45" />
      <circle cx="8.5" cy="22" r="1.7" fill="#3F3F46" />
      <path d="M14.2 9.6 23.4 16 14.2 22.4V9.6Z" fill="#39FF14" />
    </svg>
  );
}
