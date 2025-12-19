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



