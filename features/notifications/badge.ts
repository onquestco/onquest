// The bell's badge: nothing at 0, the number up to 9, then "9+".

export function badgeText(unread: number): string | null {
  if (!Number.isFinite(unread) || unread < 1) return null;
  return unread > 9 ? '9+' : String(Math.floor(unread));
}

export function bellLabel(unread: number): string {
  const text = badgeText(unread);
  return text ? `Notifications, ${text} unread` : 'Notifications';
}
