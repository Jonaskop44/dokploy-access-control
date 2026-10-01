import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Inter is the open-source stand-in for SF Pro (see DESIGN.md). On Apple
// platforms the font stack in globals.css resolves to the real SF Pro first.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dokploy Access Control",
  description: "Access control for Dokploy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de-AT"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
