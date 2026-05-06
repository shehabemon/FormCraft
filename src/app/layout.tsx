import type { Metadata, Viewport } from 'next';
import { outfit, plusJakartaSans, jetbrainsMono } from '@/lib/fonts';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from 'sonner';
import './globals.css';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const TITLE = 'FormCraft — Drag and Drop Form Builder';
const DESCRIPTION =
  'Build professional forms with drag-and-drop fields, AI generation, conditional logic, and export to clean React Hook Form code.';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: '%s — FormCraft',
  },
  description: DESCRIPTION,
  keywords: [
    'form builder',
    'drag and drop form',
    'React Hook Form',
    'AI form generation',
    'conditional logic',
    'form code export',
    'no-code form',
  ],
  authors: [{ name: 'FormCraft', url: BASE_URL }],
  creator: 'FormCraft',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'FormCraft',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/seo-preview-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FormCraft — Drag and Drop Form Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/seo-preview-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAF8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-[#FAFAF8] text-[#2D2B27]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'FormCraft',
              url: BASE_URL,
              description: DESCRIPTION,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              featureList: [
                'Drag-and-drop form builder',
                'AI form generation',
                'Conditional logic',
                'React Hook Form code export',
              ],
            }),
          }}
        />
        <StoreProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: 'font-sans text-[0.875rem]',
                },
              }}
            />
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
