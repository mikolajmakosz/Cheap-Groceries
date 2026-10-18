import type { Metadata } from "next";
import { Luckiest_Guy, Nunito } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import Tour, { TutorialButton } from "@/components/Tour";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
});

const luckiest = Luckiest_Guy({
  variable: "--font-luckiest",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Cheap Groceries — the cheapest supermarket near IE University",
  description:
    "Build a basket and see what it costs at Mercadona, Dia and more around IE University in Madrid.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${luckiest.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <Tour />
        <TutorialButton />
      </body>
    </html>
  );
}
