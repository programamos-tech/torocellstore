import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOROCELL STORE - Iniciar Sesión",
  description: "Sistema de gestión de inventario y ventas para TOROCELL STORE",
  icons: {
    icon: '/zonat-logo.png',
    shortcut: '/zonat-logo.png',
    apple: '/zonat-logo.png'
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
