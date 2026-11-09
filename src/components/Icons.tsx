interface IconProps {
  size?: number;
  className?: string;
}

function iconProps({ size = 20, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
}

export function LogoMark(props: IconProps) {
  const { size = 22, className } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 18.5 9.5 12l4 3L20 6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 6.5h5v5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}

export function Close(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function Info(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function FileText(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

export function Eye(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Wallet(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1" />
      <path d="M4 7.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
      <path d="M21 10h-5a2 2 0 0 0 0 4h5Z" />
    </svg>
  );
}

export function User(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

export function Briefcase(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function Bank(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8" />
      <path d="M9.5 10v8" />
      <path d="M14.5 10v8" />
      <path d="M19 10v8" />
      <path d="M3.5 21h17" />
    </svg>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3 5 6v5.5c0 4.4 2.9 7.7 7 9.5 4.1-1.8 7-5.1 7-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m18.4 5.6-2.8 2.8" />
      <path d="m8.4 15.6-2.8 2.8" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function TrendUp(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function Upload(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function Paperclip(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M20.5 11.5 12 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 18a2 2 0 0 1-3-3l7.5-7.5" />
    </svg>
  );
}

export function LogOut(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function Lock(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}
