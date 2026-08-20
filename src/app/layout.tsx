import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Toaster } from '@/components/Toast';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const display = Instrument_Serif({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: {
    default: 'Vaada: a public register of government promises',
    template: '%s · Vaada',
  },
  description:
    'Every promise a government official made in public, with the deadline they agreed to, the clock running down, and the evidence citizens sent from the ground.',
  keywords: [
    'government accountability',
    'promise tracker',
    'India',
    'school infrastructure',
    'public deadlines',
  ],
  openGraph: {
    title: 'Vaada: a public register of government promises',
    description:
      'Promises made in public, deadlines running down, evidence from the ground.',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
