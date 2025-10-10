import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";  // ← Importer la Navbar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mon Agenda",
  description: "Votre assistant personnel numérique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Navbar />  {/* ← Ajouter la Navbar */}
        {children}
      </body>
    </html>
  );
}