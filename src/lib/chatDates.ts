const timeZone = 'Asia/Kolkata';

export function chatDateKey(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export function chatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function chatMessageTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(value)) + ' IST';
}
