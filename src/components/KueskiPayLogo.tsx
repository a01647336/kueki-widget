/**
 * KueskiPayLogo — Wordmark SVG del logo de Kueski Pay
 * Renderiza "kueski" + badge "pay" listos para usar en el widget header.
 */

interface KueskiPayLogoProps {
  /** sm = ~80px, md = ~110px, lg = ~140px */
  size?: 'sm' | 'md' | 'lg';
  /** Color del texto y badge (blanco para fondo verde, verde para fondo blanco) */
  variant?: 'white' | 'green';
}

const SCALE = { sm: 0.65, md: 0.88, lg: 1.1 };

export function KueskiPayLogo({ size = 'md', variant = 'white' }: KueskiPayLogoProps) {
  const scale   = SCALE[size];
  const w       = Math.round(128 * scale);
  const h       = Math.round(34 * scale);
  const fg      = variant === 'white' ? '#ffffff' : '#34ED68';
  const badgeBg = variant === 'white' ? 'rgba(255,255,255,0.25)' : 'rgba(52,237,104,0.15)';
  const badgeFg = variant === 'white' ? '#ffffff' : '#34ED68';

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 128 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kueski Pay"
    >
      {/* Wordmark "kueski" */}
      <text
        x="0"
        y="26"
        fontFamily="'Inter', 'Arial', system-ui, sans-serif"
        fontWeight="800"
        fontSize="26"
        letterSpacing="-0.5"
        fill={fg}
      >
        kueski
      </text>

      {/* Badge "pay" */}
      <rect x="93" y="10" width="33" height="17" rx="5" fill={badgeBg} />
      <text
        x="109.5"
        y="22.5"
        fontFamily="'Inter', 'Arial', system-ui, sans-serif"
        fontWeight="700"
        fontSize="11"
        textAnchor="middle"
        fill={badgeFg}
      >
        pay
      </text>
    </svg>
  );
}
