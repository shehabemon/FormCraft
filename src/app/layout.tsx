import type { Metadata } from 'next';
import { outfit, plusJakartaSans, jetbrainsMono } from '@/lib/fonts';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'FormCraft — Professional Form Builder',
  description: 'Build professional forms with drag-and-drop, AI generation, conditional logic, and export capabilities.',
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
