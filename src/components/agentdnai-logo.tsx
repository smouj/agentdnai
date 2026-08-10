'use client';

import Image from 'next/image';

type LogoVariant = 'full' | 'symbol' | 'text';
type LogoTheme = 'light' | 'dark' | 'auto';

interface AgentDNAILogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  className?: string;
  height?: number;
}

/**
 * AgentDNAI Official Logo Component
 * 
 * Renders the correct logo variant based on context:
 * - full: Symbol + Text (for hero, landing page)
 * - symbol: Just the DNA/Z icon (for favicon, sidebar collapsed, avatars)
 * - text: Just the "AgentDNAI" text (for wide layouts)
 * 
 * Theme determines which color variant:
 * - light: Dark logo on light background
 * - dark: Light logo on dark background  
 * - auto: Follows system theme (default)
 */
export function AgentDNAILogo({ 
  variant = 'full', 
  theme = 'auto',
  className = '',
  height = 32 
}: AgentDNAILogoProps) {
  // For auto theme, render both and use CSS to show/hide
  if (theme === 'auto') {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <AgentDNAILogoInner variant={variant} theme="dark" height={height} className="hidden dark:inline-flex" />
        <AgentDNAILogoInner variant={variant} theme="light" height={height} className="inline-flex dark:hidden" />
      </span>
    );
  }

  return <AgentDNAILogoInner variant={variant} theme={theme} height={height} className={className} />;
}

function AgentDNAILogoInner({ 
  variant, 
  theme,
  className = '',
  height = 32 
}: {
  variant: LogoVariant;
  theme: 'light' | 'dark';
  className?: string;
  height?: number;
}) {
  const srcMap: Record<LogoVariant, Record<string, string>> = {
    full: { light: '/logo-full-light.png', dark: '/logo-full-dark.png' },
    symbol: { light: '/logo-symbol-light.png', dark: '/logo-symbol-dark.png' },
    text: { light: '/logo-text-light.png', dark: '/logo-text-dark.png' },
  };

  const src = srcMap[variant][theme];
  
  // Calculate width based on aspect ratios
  const aspectMap: Record<LogoVariant, number> = {
    full: 1,        // 1254x1254
    symbol: 1,      // 1254x1254  
    text: 2172/724, // ~3:1
  };
  
  const width = Math.round(height * aspectMap[variant]);

  return (
    <Image
      src={src}
      alt="AgentDNAI"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={variant === 'full'}
    />
  );
}

/**
 * Small inline logo mark using the SVG (no theme needed, works everywhere)
 */
export function AgentDNAILogoMark({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <img 
      src="/logo.svg" 
      alt="AgentDNAI" 
      width={size} 
      height={size}
      className={`object-contain ${className}`} 
    />
  );
}
