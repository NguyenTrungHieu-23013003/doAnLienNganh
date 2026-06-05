import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatLocalDate(isoString: string | null | undefined) {
  if (!isoString) return '';
  const date = new Date(isoString);
  
  const tz = typeof window !== 'undefined' 
    ? (localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone)
    : 'UTC';
    
  const isVI = typeof navigator !== 'undefined' && navigator.language.startsWith('vi');

  if (isVI) {
    const day = date.toLocaleDateString('vi-VN', { day: 'numeric', timeZone: tz });
    const month = date.toLocaleDateString('vi-VN', { month: 'numeric', timeZone: tz });
    const year = date.toLocaleDateString('vi-VN', { year: 'numeric', timeZone: tz });
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    return `${day} tháng ${month}, ${year} - ${time}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz
    }) + ' - ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz
    });
  }
}
