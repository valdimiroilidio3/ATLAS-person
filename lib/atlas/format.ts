import { getLocale, translate, type Locale } from '@/lib/i18n';
import type { Currency } from './types';

function intlLocale(locale: Locale = getLocale()): string {
  return locale === 'pt' ? 'pt-PT' : 'en';
}

export function formatCurrency(amount: number, currency: Currency = 'EUR', locale: Locale = getLocale()): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(intlLocale(locale))}`;
  }
}

export function formatDate(iso?: string, locale: Locale = getLocale()): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric' });
}

export function formatDateLong(iso?: string, locale: Locale = getLocale()): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(intlLocale(locale), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatWeekday(iso?: string, locale: Locale = getLocale()): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(intlLocale(locale), { weekday: 'long' });
}

export function formatTime(iso: string, locale: Locale = getLocale()): string {
  return new Date(iso).toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string, locale: Locale = getLocale()): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return translate('just now', undefined, locale);
  if (minutes < 60) return translate('{minutes}m ago', { minutes }, locale);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate('{hours}h ago', { hours }, locale);
  const days = Math.floor(hours / 24);
  return translate('{days}d ago', { days }, locale);
}

/** Saudação localizada (Bom dia / Boa tarde / Boa noite). */
export function greeting(date: Date = new Date(), locale: Locale = getLocale()): string {
  const hour = date.getHours();
  if (hour < 12) return translate('Good morning', undefined, locale);
  if (hour < 18) return translate('Good afternoon', undefined, locale);
  return translate('Good evening', undefined, locale);
}

export function daysLeft(iso?: string): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isYesterday(iso: string): boolean {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear()
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
