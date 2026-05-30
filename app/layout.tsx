import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoMadrid",
  description:
    "Interactive geography quiz and atlas for the Community of Madrid. 179 official municipalities.",
  openGraph: {
    title: "GeoMadrid",
    description: "Learn every municipality in the Community of Madrid.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
