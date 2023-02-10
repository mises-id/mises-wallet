/**
 * getKeplrExtensionRouterId returns the `window.keplrExtensionRouterId`.
 * If the `window.keplrExtensionRouterId` is not initialized, it will be initialized and returned.
 */
export async function getKeplrExtensionRouterId(): Promise<number> {
  const { keplrExtensionRouterId } = await browser.storage.local.get(
    "keplrExtensionRouterId"
  );
  let keplrExtensionRouterIdRandom = 0;
  if (keplrExtensionRouterId == null) {
    keplrExtensionRouterIdRandom = Math.floor(Math.random() * 1000000);
    browser.storage.local.set({
      keplrExtensionRouterId: keplrExtensionRouterIdRandom,
    });
  }
  return keplrExtensionRouterIdRandom;
}
