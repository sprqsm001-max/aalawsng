import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AALAWSNG — Law Firm Management System',
  description: 'Integrated law firm management platform for Adeola Kolawole & Associates — matter management, trust accounting, client portal, and more.',
  keywords: ['law firm', 'legal management', 'trust accounting', 'LPAR 1964', 'matter management', 'legal software', 'Nigeria law'],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AALAWSNG',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
