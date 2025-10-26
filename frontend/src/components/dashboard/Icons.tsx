import type { SVGProps } from "react";
import { useId } from "react";

const sharedProps: Pick<
  SVGProps<SVGSVGElement>,
  "xmlns" | "fill" | "viewBox"
> = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
};

export const LogoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...sharedProps} strokeWidth={1.5} stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    />
  </svg>
);

export const SunIcon = (props: SVGProps<SVGSVGElement>) => {
  const gradientId = useId();
  const glowId = useId();
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" {...props}>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e5c16c" />
          <stop offset="100%" stopColor="#d4af37" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="6" fill={`url(#${gradientId})`} />
      <g stroke={`url(#${gradientId})`} strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="4.22" x2="7.07" y2="7.07" />
        <line x1="16.93" y1="16.93" x2="19.78" y2="19.78" />
        <line x1="4.22" y1="19.78" x2="7.07" y2="16.93" />
        <line x1="16.93" y1="7.07" x2="19.78" y2="4.22" />
      </g>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
        opacity="0.3"
      />
    </svg>
  );
};

export const MoonIcon = (props: SVGProps<SVGSVGElement>) => {
  const gradientId = useId();
  const glowId = useId();
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" {...props}>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#e5c16c" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M17 12.5C17 16.09 13.87 19 10 19C8.13 19 6.42 18.36 5.11 17.32C5.04 17.26 5 17.18 5 17.09C5 16.99 5.06 16.91 5.15 16.88C8.09 15.97 10.5 13.36 10.5 10.5C10.5 7.64 8.09 5.03 5.15 4.12C5.06 4.09 5 4.01 5 3.91C5 3.82 5.04 3.74 5.11 3.68C6.42 2.64 8.13 2 10 2C13.87 2 17 4.91 17 8.5C17 10.09 16.41 11.56 15.41 12.68C15.16 12.97 15.16 13.41 15.41 13.7C16.41 14.82 17 16.29 17 17.88V12.5Z"
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
      />
      <ellipse
        cx="10"
        cy="10"
        rx="7"
        ry="7"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
        opacity="0.2"
      />
    </svg>
  );
};

export const ProfileIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...sharedProps} strokeWidth={1.5} stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

export const TrendingUpIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...sharedProps} strokeWidth={1.5} stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    />
  </svg>
);

export const TrendingDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...sharedProps} strokeWidth={1.5} stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
    />
  </svg>
);
