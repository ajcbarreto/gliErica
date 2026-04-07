import Image from "next/image";

export const BRAND_LOGO_SRC = "/brand/logo.png";

type AppLogoProps = {
  className?: string;
  /** Usar só no topo da shell (LCP). */
  priority?: boolean;
};

/**
 * Logo da marca (ficheiro em `public/brand/logo.png`).
 * Passa `className` com dimensões (ex.: `h-9 w-9`) — o marcador é `position: relative` para o `fill` do Next/Image.
 */
export function AppLogo({ className, priority = false }: AppLogoProps) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-xl ${className ?? ""}`}
    >
      <Image
        src={BRAND_LOGO_SRC}
        alt=""
        fill
        className="object-contain"
        sizes="96px"
        priority={priority}
      />
    </span>
  );
}
