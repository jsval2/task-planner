export type FaviconColor = 'green' | 'orange' | 'red' | 'gray';

const COLOR_MAP: Record<FaviconColor, string> = {
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#6b7280',
};

let currentFavicon: FaviconColor | null = null;

export function setFavicon(color: FaviconColor) {
  if (color === currentFavicon) return;
  currentFavicon = color;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_MAP[color];
  ctx.fill();

  const link =
    (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
    document.createElement('link');
  link.type = 'image/png';
  link.rel = 'icon';
  link.href = canvas.toDataURL('image/png');
  document.head.appendChild(link);
}

export function setTabTitle(title: string) {
  document.title = title;
}
