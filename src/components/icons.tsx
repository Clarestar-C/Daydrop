interface IconProps {
  className?: string;
}

function base(props: IconProps) {
  return {
    className: props.className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
}

export function TodayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.8h17M8 2.8V6M16 2.8V6" />
    </svg>
  );
}

export function JournalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h10.5a2.5 2.5 0 0 1 2.5 2.5v13L15 16.4l-4 2.6-4-2.6-2 1.3" />
      <path d="M6 3.5A2.5 2.5 0 0 0 3.5 6v11.7" />
      <path d="M9 8.5h6" />
    </svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2c3.4 4.1 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.6-6.9 6-11z" />
      <path d="M9.2 13.6a2.8 2.8 0 0 0 2.4 2.9" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6.2 9.8V20h11.6V9.8" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20l1-4.5L16.5 4l3.5 3.5L8.5 19 4 20z" />
      <path d="M14.5 6l3.5 3.5" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5c.7 4.8 2.7 6.8 7.5 7.5-4.8.7-6.8 2.7-7.5 7.5-.7-4.8-2.7-6.8-7.5-7.5 4.8-.7 6.8-2.7 7.5-7.5z" />
      <path d="M18.5 3.5v3M17 5h3" />
    </svg>
  );
}

export function FloralIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8C12 7 13.6 5 16 5c0 2.4-1.6 4.4-4 4.8zM12 9.8C12 7 10.4 5 8 5c0 2.4 1.6 4.4 4 4.8zM14.2 12c2.8 0 4.8 1.6 4.8 4-2.4 0-4.4-1.6-4.8-4zM9.8 12c-2.8 0-4.8 1.6-4.8 4 2.4 0 4.4-1.6 4.8-4zM12 14.2c0 2.8-1.6 4.8-4 4.8 0-2.4 1.6-4.4 4-4.8zM12 14.2c0 2.8 1.6 4.8 4 4.8 0-2.4-1.6-4.4-4-4.8z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <path d="M8 5.4v13.2L19 12z" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
      <path d="M4.5 14.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4.5" />
    </svg>
  );
}
