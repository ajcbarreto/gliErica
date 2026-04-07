type AppLogoProps = {
  className?: string;
  /** Quando true, o SVG recebe role="img" e um título para leitores de ecrã. */
  labelled?: boolean;
};

/**
 * Marca visual alinhada aos ícones PWA (scripts/generate-pwa-assets.mjs).
 */
export function AppLogo({ className, labelled }: AppLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width={32}
      height={32}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {labelled ? <title>GliErica</title> : null}
      <rect width="32" height="32" fill="#09090b" rx="7" />
      <circle cx="16" cy="16" r="9" fill="var(--accent, #059669)" />
    </svg>
  );
}
