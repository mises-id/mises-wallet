import encryptor from "browser-passworder";

export type keyringParmas = {
  data: {
    [key: string]: any;
  };
  type: "HD Key Tree" | "Simple Key Pair";
};

export class Migrator {
  // run all pending migrations on meta in place
  async migrateData(): Promise<{ vault: string }> {
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
    const { vault: vaultString } = keyringStore;
    const vault: keyringParmas[] = await encryptor.decrypt(
      password,
      vaultString
    );
    return vault.filter((val) =>
      ["HD Key Tree", "Simple Key Pair"].includes(val.type)
    );
  }

  clearCache() {
    console.log("clear data");
    return browser.storage.local.set({
      migrated: "done",
    });
  }
}
