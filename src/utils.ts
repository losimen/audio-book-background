import { AUDIO_MIME_BY_EXTENSION, DEFAULT_AUDIO_MIME } from './constants';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua);
}

export function isStandaloneDisplayMode(): boolean {
  const nav = navigator as any;
  return Boolean(
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone
  );
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = (navigator as any).storage;
    if (!storage?.persist) return false;
    return Boolean(await storage.persist());
  } catch {
    return false;
  }
}

export async function getStorageEstimate(): Promise<{ quota?: number; usage?: number }> {
  try {
    const storage = (navigator as any).storage;
    if (!storage?.estimate) return {};
    const est = await storage.estimate();
    return {
      quota: typeof est?.quota === 'number' ? est.quota : undefined,
      usage: typeof est?.usage === 'number' ? est.usage : undefined,
    };
  } catch {
    return {};
  }
}

function getLowerFileExtension(fileName: string): string {
  const name = (fileName || '').trim();
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return name.slice(dot + 1).toLowerCase();
}

export function inferAudioMimeType(fileName: string, browserProvidedType?: string): string {
  const t = (browserProvidedType || '').trim();
  if (t) return t;

  const ext = getLowerFileExtension(fileName);
  if (!ext) return DEFAULT_AUDIO_MIME;

  return AUDIO_MIME_BY_EXTENSION[ext] || DEFAULT_AUDIO_MIME;
}



