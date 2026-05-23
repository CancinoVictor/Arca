import type { SVGProps } from 'react';

export type IconName =
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'trash'
  | 'download'
  | 'restore'
  | 'check'
  | 'check-circle'
  | 'plus'
  | 'ellipsis'
  | 'sort'
  | 'grid-large'
  | 'grid-medium'
  | 'grid-small'
  | 'photo'
  | 'video'
  | 'play'
  | 'library'
  | 'upload'
  | 'arrow-left'
  | 'share'
  | 'search'
  | 'circle'
  | 'camera'
  | 'photo-library'
  | 'spinner';

type Props = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

/**
 * SF-Symbols-inspired stroke icons. All draws use round joins and 1.9 stroke width
 * to match the visual weight of Apple's default "medium" symbols.
 */
export function Icon({ name, size = 22, ...rest }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };

  switch (name) {
    case 'close':
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...props}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...props}>
          <path d="M5 9l7 7 7-7" />
        </svg>
      );
    case 'chevron-up':
      return (
        <svg {...props}>
          <path d="M5 15l7-7 7 7" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M6 7l1 12.5A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.5L18 7" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M12 4v12" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'restore':
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l3 3 5-6" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'ellipsis':
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'sort':
      return (
        <svg {...props}>
          <path d="M7 4v15" />
          <path d="M4 16l3 3 3-3" />
          <path d="M17 20V5" />
          <path d="M14 8l3-3 3 3" />
        </svg>
      );
    case 'grid-large':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="7.5" height="7.5" rx="1.6" />
          <rect x="12.5" y="4" width="7.5" height="7.5" rx="1.6" />
          <rect x="4" y="12.5" width="7.5" height="7.5" rx="1.6" />
          <rect x="12.5" y="12.5" width="7.5" height="7.5" rx="1.6" />
        </svg>
      );
    case 'grid-medium':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="4.5" height="4.5" rx="1" />
          <rect x="9.75" y="4" width="4.5" height="4.5" rx="1" />
          <rect x="15.5" y="4" width="4.5" height="4.5" rx="1" />
          <rect x="4" y="9.75" width="4.5" height="4.5" rx="1" />
          <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
          <rect x="15.5" y="9.75" width="4.5" height="4.5" rx="1" />
          <rect x="4" y="15.5" width="4.5" height="4.5" rx="1" />
          <rect x="9.75" y="15.5" width="4.5" height="4.5" rx="1" />
          <rect x="15.5" y="15.5" width="4.5" height="4.5" rx="1" />
        </svg>
      );
    case 'grid-small':
      return (
        <svg {...props}>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={4 + c * 4.2}
                y={4 + r * 4.2}
                width="3.2"
                height="3.2"
                rx="0.6"
              />
            )),
          )}
        </svg>
      );
    case 'photo':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="11" r="1.6" />
          <path d="M21 17l-5-5-7 7" />
        </svg>
      );
    case 'video':
      return (
        <svg {...props}>
          <rect x="3" y="6" width="13" height="12" rx="2.5" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <path d="M7 5l13 7-13 7z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'library':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...props}>
          <path d="M12 4v13" />
          <path d="M7 9l5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg {...props}>
          <path d="M19 12H5" />
          <path d="M12 5l-7 7 7 7" />
        </svg>
      );
    case 'share':
      return (
        <svg {...props}>
          <path d="M12 3v13" />
          <path d="M7 8l5-5 5 5" />
          <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case 'circle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...props}>
          <path d="M4 8a2 2 0 0 1 2-2h2l1.2-2h5.6L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <circle cx="12" cy="13" r="3.4" />
        </svg>
      );
    case 'photo-library':
      return (
        <svg {...props}>
          <rect x="6" y="4" width="14" height="14" rx="2.5" />
          <path d="M4 7v11a2 2 0 0 0 2 2h11" />
          <circle cx="11" cy="10" r="1.6" />
          <path d="M20 15l-4-4-7 7" />
        </svg>
      );
    case 'spinner':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" />
        </svg>
      );
    default:
      return null;
  }
}
