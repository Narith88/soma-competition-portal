import type { Metadata } from 'next';
import { Inter, Noto_Sans_Khmer } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoKhmer = Noto_Sans_Khmer({
  subsets: ['khmer'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-khmer',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SOMA Portal',
  description: 'Online exams and competitions — create, share, and grade in Khmer and English',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoKhmer.variable}`}>
      <body className="font-sans min-h-screen">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
