import type { Metadata, Viewport } from "next";
import { Caveat, Geist_Mono, Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Just2Ofus",
  description: "O hub do casal: momentos, dates, quiz e álbum de vocês dois.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f0e7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${hanken.variable} ${instrument.variable} ${caveat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
