import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pill Track",
  description: "Calendario privado para registrar medicamentos, efectos e historial."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dff3e4"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
