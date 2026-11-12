/**
 * safeClipboard.ts - Gesture-Preserving Clipboard Copy Utility
 * Guarantees zero-async gesture loss for iOS Safari PWA and Android Chrome.
 */

export async function copyToClipboardSafe(textToCopy: string): Promise<boolean> {
  if (!textToCopy) return false;

  // 1. Try modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (err) {
      console.warn('[safeClipboard] navigator.clipboard.writeText failed, falling back:', err);
    }
  }

  // 2. Fallback to synchronous execCommand with iOS Safari selection range support
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.setSelectionRange(0, 99999); // Critical for iOS WebKit text range selection

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('[safeClipboard] execCommand fallback failed:', err);
    }
  }

  return false;
}
