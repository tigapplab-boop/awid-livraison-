import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Cairo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/bm/lib/cart";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["700"],
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  weight: ["400", "600", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Burger Minute - Commandez en ligne",
  description: "Commandez vos burgers préférés en ligne et faites-vous livrer rapidement",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Burger Minute",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFD700",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} ${cairo.variable} antialiased bg-bm-bg text-stone-900 font-sans`}>
        <CartProvider>
          <main className="min-h-screen">{children}</main>
        </CartProvider>
        <PwaInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
