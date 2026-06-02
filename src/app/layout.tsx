import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PwaRootClient } from "@/components/PwaRootClient";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Ícones do separador: src/app/icon.png, apple-icon.png e public/favicon.ico (npm run pwa:assets)
export const metadata: Metadata = {
  title: "GliErica",
  description: "Acompanhe o seu bem-estar numa experiência pensada para iPhone.",
  applicationName: "GliErica",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GliErica",
    startupImage: [
      {
        url: "/splash/iphone-14-pro-max.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-14-pro.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-se.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef2f7",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="bg-canvas text-zinc-800">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-pro-max.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-pro.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-se.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans touch-manipulation`}
      >
        <PwaRootClient />
        {children}
      </body>
    </html>
  );
}
