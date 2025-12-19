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



