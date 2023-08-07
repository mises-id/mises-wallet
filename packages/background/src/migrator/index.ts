export type keyringParmas = {
  data: {
    [key: string]: any;
  };
  type: "HD Key Tree" | "Simple Key Pair";
};

export class Migrator {
  // run all pending migrations on meta in place
  async migrateData(): Promise<{ vault: string }> {
    if (typeof browser === "undefined")
      return {
        vault: "",
      };
    const { migrated } = await browser.storage.local.get();
    if (migrated && migrated.data) {
      const keyringStore = migrated.data.KeyringController || {
        vault: "",
      };
      return keyringStore;
    }
    return {
      vault: "",
    };
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
    if (!browser) return;
    return browser.storage.local.set({
      migrated: "done",
    });
  }
}
