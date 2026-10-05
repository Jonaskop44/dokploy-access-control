import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApiQueryProvider } from "@/api/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dokploy Access Control",
    template: "%s · Dokploy Access Control",
  },
  description: "Access control for Dokploy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de-AT"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <ApiQueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ApiQueryProvider>
      </body>
    </html>
  );
}
