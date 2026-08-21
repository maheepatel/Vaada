import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Toaster } from '@/components/Toast';
import { SITE } from '@/lib/site';
import { graph, organisationLd, websiteLd, faqLd } from '@/lib/jsonld';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const display = Instrument_Serif({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  // Without metadataBase every canonical and Open Graph URL resolves relative,
  // which silently produces localhost links in production share cards.
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: a public register of government promises`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'government accountability India',
    'promise tracker India',
    'election promises tracker',
    'government promises deadline',
    'school infrastructure India',
    'citizen accountability platform',
    'public deadlines register',
    'did the government keep its promise',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.name}: a public register of government promises`,
    description: SITE.tagline,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name}: a public register of government promises`,
    description: SITE.tagline,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  category: 'government accountability',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          One graph rather than several scripts. Search engines read it for
          rich results; answer engines read it as the structured backbone
          behind a prose answer, which is what stops a model guessing at what
          this site is.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph(organisationLd(), websiteLd(), faqLd())),
          }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
