import type { Metadata } from "next";
import { Montserrat, Raleway, Open_Sans } from "next/font/google";
import "./globals.css";
import FloatingChat from "@/app/components/FloatingChat";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["600"],
});

const openSans = Open_Sans({
  variable: "--font-opensans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Nicolas Jaled Kine - Gestión de Turnos",
  description: "Sistema de gestión de turnos para kinesiología y entrenamiento deportivo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${montserrat.variable} ${raleway.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
        <FloatingChat />
      </body>
    </html>
  );
}
