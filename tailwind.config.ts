import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        elevated: 'var(--bg-elevated)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '14px',
        lg: '18px',
        xl: '24px',
      },
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 32px -16px rgba(0,0,0,0.7)',
        'card-hover': 'inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 44px -16px rgba(0,0,0,0.8)',
      },
      maxWidth: {
        shell: '1200px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
