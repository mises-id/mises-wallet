import { BaseKVStore } from "./base";
import { KVStoreProvider } from "./interface";

const getStorage = (keys?: any) => {
  return new Promise<{ [key: string]: any }>((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
};

const setStorage = (items: { [key: string]: any }) => {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set(items);
    resolve();
  });
};
export class ExtensionKVStore extends BaseKVStore {
  protected static KVStoreProvider: KVStoreProvider | undefined;

  constructor(prefix: string) {
    if (!ExtensionKVStore.KVStoreProvider) {
      if (!chrome.storage || !chrome.storage.local) {
        console.log(
          "The 'chrome' exists, but it doesn't seem to be an extension environment. This can happen in Safari browser."
        );
      } else {
        ExtensionKVStore.KVStoreProvider = {
          get: getStorage,
          set: setStorage,
        };
      }
    }

    if (!ExtensionKVStore.KVStoreProvider) {
      throw new Error("Can't initialize kv store for browser extension");
    }

    super(ExtensionKVStore.KVStoreProvider, prefix);
  }
}
