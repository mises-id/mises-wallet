/**
 * getKeplrExtensionRouterId returns the `window.keplrExtensionRouterId`.
 * If the `window.keplrExtensionRouterId` is not initialized, it will be initialized and returned.
 */
export function getKeplrExtensionRouterId(): number {
  const globalWindow: any = typeof window !== "undefined" ? window : chrome;
  if (globalWindow.keplrExtensionRouterId == null) {
    globalWindow.keplrExtensionRouterId = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    );
  }
  return globalWindow.keplrExtensionRouterId;
}
