export type keyringParmas = {
  data: {
    [key: string]: any;
  };
  type: "HD Key Tree" | "Simple Key Pair";
};

export class Migrator {
  // run all pending migrations on meta in place
  async migrateData(): Promise<{ vault: string }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(({ migrated }) => {
        if (migrated && migrated.data) {
          const keyringStore = migrated.data.KeyringController || {
            vault: "",
          };
          return resolve(keyringStore);
        }
        return resolve({
          vault: "",
        });
      });
    });
  }

  async enCodeValut(keyringStore: { vault: string }, password: string) {
    // eslint-disable-next-line
    const encryptor = require("@metamask/browser-passworder");

    const { vault: vaultString } = keyringStore;
    const vault: keyringParmas[] = (await encryptor.decrypt(
      password,
      vaultString
    )) as keyringParmas[];
    return vault.filter((val) =>
      ["HD Key Tree", "Simple Key Pair"].includes(val.type)
    );
  }

  clearCache() {
    console.log("clear data");
    return new Promise<void>((resolve) => {
      chrome.storage.local.set(
        {
          migrated: "done",
        },
        resolve
      );
    });
  }
}
