function Icon({ size = 24, strokeWidth = 2, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export const CupIcon = (props) => (
  <Icon {...props}>
    <path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
    <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M8 3v3M12 3v3" />
  </Icon>
)

export const GlassIcon = (props) => (
  <Icon {...props}>
    <path d="M6 4h12l-1.5 15a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z" />
    <path d="M7 9h10" />
  </Icon>
)

export const PastryIcon = (props) => (
  <Icon {...props}>
    <path d="M3 15c2-7 16-7 18 0" />
    <path d="M3 15h18" />
    <path d="M8 15l1.5-4M12 15V9M16 15l-1.5-4" />
  </Icon>
)

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const MinusIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
)

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12l5 5 9-10" />
  </Icon>
)

export const ClockIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const GlobeIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </Icon>
)

export const MoonIcon = (props) => (
  <Icon {...props}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Icon>
)

export const SunIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const ArrowIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const BackIcon = (props) => (
  <Icon {...props}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
)

export const LogoutIcon = (props) => (
  <Icon {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </Icon>
)

export const ChevronIcon = (props) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)