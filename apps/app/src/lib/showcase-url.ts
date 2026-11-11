const configuredShowcaseOrigin = import.meta.env.PUBLIC_SHOWCASE_ORIGIN?.trim();

function getValidatedShowcaseOrigin(): string | null {
  if (!configuredShowcaseOrigin) return null;

  try {
    const url = new URL(configuredShowcaseOrigin);
    const hostname = url.hostname.toLowerCase();
    const ipv4Octets = hostname.split('.');
    const isIpv4Loopback =
      ipv4Octets.length === 4 &&
      ipv4Octets[0] === '127' &&
      ipv4Octets.every((octet) => /^\d+$/.test(octet) && Number(octet) <= 255);
    const isLocalDevelopmentHost =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      isIpv4Loopback ||
      hostname === '::1' ||
      hostname === '[::1]';
    const isSecureProtocol =
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && isLocalDevelopmentHost);

    if (
      !isSecureProtocol ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

const showcaseOrigin = getValidatedShowcaseOrigin();

export function getShowcaseUrl(path: '/wiki' | '/_emdash/admin' | '/api/emdash/wiki'): string | null {
  if (!showcaseOrigin) return null;
  return new URL(path, showcaseOrigin).toString();
}
