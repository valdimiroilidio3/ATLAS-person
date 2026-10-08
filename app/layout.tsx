import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import dynamic from 'next/dynamic';
import './globals.css';
import { AtlasProvider } from '@/lib/atlas/store';
import { MotionConfig } from '@/components/motion-config';
import { TopNav } from '@/components/layout/top-nav';
import { Toaster } from '@/components/ui/toast';

const CommandPalette = dynamic(() => import('@/components/command/command-palette'), {
  ssr: false,
  loading: () => null,
});
const ApprovalCenter = dynamic(() => import('@/components/approvals/approval-center'), {
  ssr: false,
  loading: () => null,
});
const ExecutionFlow = dynamic(() => import('@/components/execution/execution-flow'), {
  ssr: false,
  loading: () => null,
});
const CreateGoalModal = dynamic(() => import('@/components/goals/create-goal-modal'), {
  ssr: false,
  loading: () => null,
});

// Self-hosted fonts (Inter + JetBrains Mono) — no build-time network dependency.
const inter = localFont({
  src: './fonts/Inter[opsz,wght].ttf',
  variable: '--font-sans',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});
const mono = localFont({
  src: './fonts/JetBrainsMono[wght].ttf',
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
});

export const metadata: Metadata = {
  title: 'ATLAS — Personal AI Command Center',
  description: 'Turn goals and intentions into measurable execution.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <MotionConfig>
          <AtlasProvider>
            <div className="relative z-[1] flex min-h-screen flex-col">
              <TopNav />
              <main className="w-full max-w-shell mx-auto px-4 sm:px-6 lg:px-8 pb-24 flex-1">
                {children}
              </main>
              <footer className="border-t border-border/60">
                <div className="max-w-shell mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-xs text-text-3">
                  <span>ATLAS · Personal AI Command Center</span>
                  <span className="font-mono">v0.1.0</span>
                </div>
              </footer>
            </div>
            <Toaster />
            <CommandPalette />
            <ApprovalCenter />
            <ExecutionFlow />
            <CreateGoalModal />
          </AtlasProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
