import type { OsId } from './types';

export interface Detected {
  browserId: string | null;
  browserName: string;
  version: string;
  os: OsId | null;
  osName: string;
  mobile: boolean;
  engineGuess: string;
}

interface UAData {
  brands?: { brand: string; version: string }[];
  mobile?: boolean;
  platform?: string;
}

/**
 * Best-effort detection from client hints and the user-agent string.
 * Many forks identify as Chrome; we only claim what the browser exposes.
 */
export function detect(): Detected {
  const ua = navigator.userAgent;
  const uad = (navigator as unknown as { userAgentData?: UAData }).userAgentData;
  const brands = (uad?.brands ?? []).map((b) => b.brand.toLowerCase());

  let os: OsId | null = null;
  let osName = 'Unknown OS';
  const plat = (uad?.platform ?? '').toLowerCase();
  if (/android/i.test(ua) || plat === 'android') [os, osName] = ['android', 'Android'];
  else if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) [os, osName] = ['ios', 'iOS / iPadOS'];
  else if (/cros/i.test(ua) || plat === 'chrome os') [os, osName] = ['chromeos', 'ChromeOS'];
  else if (/windows/i.test(ua) || plat === 'windows') [os, osName] = ['windows', 'Windows'];
  else if (/mac os x|macintosh/i.test(ua) || plat === 'macos') [os, osName] = ['macos', 'macOS'];
  else if (/linux/i.test(ua) || plat === 'linux') [os, osName] = ['linux', 'Linux'];

  const has = (b: string) => brands.some((x) => x.includes(b));
  const m = (re: RegExp) => ua.match(re)?.[1] ?? '';
  let id: string | null = null;
  let name = 'Unknown browser';
  let version = '';
  const isBrave = !!(navigator as unknown as { brave?: unknown }).brave;

  if (isBrave) [id, name, version] = ['brave', 'Brave', m(/Chrome\/([\d.]+)/)];
  else if (/EdgA?\/|Edg\//.test(ua) || has('microsoft edge')) [id, name, version] = ['edge', 'Microsoft Edge', m(/Edg(?:A|iOS)?\/([\d.]+)/)];
  else if (/OPR\/|Opera/.test(ua) || has('opera')) [id, name, version] = ['opera', 'Opera', m(/OPR\/([\d.]+)/)];
  else if (/Vivaldi/.test(ua)) [id, name, version] = ['vivaldi', 'Vivaldi', m(/Vivaldi\/([\d.]+)/)];
  else if (/SamsungBrowser/.test(ua)) [id, name, version] = ['samsung-browser', 'Samsung Browser', m(/SamsungBrowser\/([\d.]+)/)];
  else if (/YaBrowser/.test(ua)) [id, name, version] = ['yandex', 'Yandex Browser', m(/YaBrowser\/([\d.]+)/)];
  else if (/DuckDuckGo/.test(ua)) [id, name, version] = ['duckduckgo', 'DuckDuckGo', m(/DuckDuckGo\/([\d.]+)/)];
  else if (/Floorp/.test(ua)) [id, name, version] = ['floorp', 'Floorp', m(/Floorp\/([\d.]+)/)];
  else if (/Waterfox/.test(ua)) [id, name, version] = ['waterfox', 'Waterfox', m(/Waterfox\/([\d.]+)/)];
  else if (/LibreWolf/.test(ua)) [id, name, version] = ['librewolf', 'LibreWolf', m(/LibreWolf\/([\d.]+)/)];
  else if (/PaleMoon/.test(ua)) [id, name, version] = ['pale-moon', 'Pale Moon', m(/PaleMoon\/([\d.]+)/)];
  else if (/FxiOS/.test(ua)) [id, name, version] = ['firefox', 'Firefox', m(/FxiOS\/([\d.]+)/)];
  else if (/Firefox\//.test(ua)) [id, name, version] = ['firefox', 'Firefox', m(/Firefox\/([\d.]+)/)];
  else if (/CriOS/.test(ua)) [id, name, version] = ['chrome', 'Chrome', m(/CriOS\/([\d.]+)/)];
  else if (has('google chrome') || /Chrome\//.test(ua)) [id, name, version] = [has('google chrome') ? 'chrome' : 'chromium', has('google chrome') ? 'Chrome' : 'Chromium-based browser', m(/Chrome\/([\d.]+)/)];
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) [id, name, version] = ['safari', 'Safari', m(/Version\/([\d.]+)/)];

  const engineGuess =
    os === 'ios' ? 'WebKit' : /Gecko\/\d/.test(ua) && /Firefox|LibreWolf|Waterfox|Floorp/.test(ua) ? 'Gecko' : /Chrome\//.test(ua) ? 'Blink' : /AppleWebKit/.test(ua) ? 'WebKit' : 'Unknown';

  return { browserId: id, browserName: name, version: version.split('.')[0] ?? '', os, osName, mobile: !!uad?.mobile || /Mobi/.test(ua), engineGuess };
}
