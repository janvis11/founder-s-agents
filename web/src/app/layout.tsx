import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Serif, Source_Serif_4 } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Founder HQ",
  description: "Your office: four teams, one Orchestrator, and nothing leaves without your sign-off.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${instrument.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <Masthead />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
