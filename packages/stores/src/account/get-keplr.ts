import { Keplr } from "@keplr-wallet/types";

export const getKeplrFromWindow: () => Promise<
  Keplr | undefined
> = async () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (window.mises) {
    return window.mises;
  }

  if (document.readyState === "complete") {
    return window.mises;
  }

  return new Promise((resolve) => {
    const documentStateChange = (event: Event) => {
      if (
        event.target &&
        (event.target as Document).readyState === "complete"
      ) {
        resolve(window.mises);
        document.removeEventListener("readystatechange", documentStateChange);
      }
    };

    document.addEventListener("readystatechange", documentStateChange);
  });
};
