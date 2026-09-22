import React from 'react';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  animated = false,
  showWordmark = true,
  className = '',
}) => {
  // Continuous monoline elevation silhouette:
  // 3 ascending peaks, tallest subtly notched at peak, rounded caps
  // Path designed for 32x32 viewbox with 2.5px stroke
  return (
    <div className={`brand-wrapper ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GradeFinder Logo Mark"
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <path
          d="M 2 24 C 5 24 6 18 8 18 C 10 18 12 21 14 21 C 16 21 18 13 20 13 C 21 13 22 15 23 15 C 24 15 26 7.5 27 7 C 27.5 7.8 28.2 8.5 29 8.5 C 29.8 8.5 30.5 12 31 16"
          stroke="var(--color-primary, #C9642F)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            animated
              ? {
                  strokeDasharray: 80,
                  strokeDashoffset: 0,
                  animation: 'drawLogo 1.8s ease-in-out infinite',
                }
              : undefined
          }
        />
      </svg>

      {showWordmark && (
        <span className="brand-wordmark">
          Grade<span className="wordmark-f">F</span>inder
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
