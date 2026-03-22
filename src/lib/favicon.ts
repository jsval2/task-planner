export type FaviconColor = 'green' | 'orange' | 'red' | 'gray';

const COLOR_MAP: Record<FaviconColor, string> = {
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#6b7280',
};

let currentFavicon: FaviconColor | null = null;
const FAVICON_ID = 'dynamic-favicon';

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

  const href = canvas.toDataURL('image/png');

  // Remove any existing favicons so ours takes priority
  document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => {
    if (el.id !== FAVICON_ID) el.remove();
  });

  let link = document.getElementById(FAVICON_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FAVICON_ID;
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function setTabTitle(title: string) {
  document.title = title;
}
