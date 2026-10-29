import type { Metadata } from "next";
import { Epilogue, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Epilogue({ variable: "--font-epilogue", subsets: ["latin"], weight: ["500", "700", "800", "900"] });
const italic = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: "italic" });

export const metadata: Metadata = {
  title: { default: "Noctua — the AI that learns to stop thinking", template: "%s · Noctua" },
  description: "The always-on personal agent on NVIDIA Nemotron that learns your repeated tasks, runs them with zero model calls, and can't be talked into a bad deal or giving out your address.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} ${italic.variable} antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
