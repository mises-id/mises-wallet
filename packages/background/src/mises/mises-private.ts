const instance = {
  // set mises browser userinfo
  setToMisesPrivate(params: any): Promise<void> {
    if (typeof browser === "undefined") return Promise.resolve();
    if ((browser as any).misesPrivate) {
      (browser as any).misesPrivate.setMisesId(JSON.stringify(params));
    }
    return Promise.resolve();
  },
  getinstallreferrer(): Promise<string> {
    if (typeof browser === "undefined") return Promise.resolve("");
    return new Promise((resolve) => {
      if (
        (browser as any).misesPrivate &&
        (browser as any).misesPrivate.getInstallReferrer
      ) {
        (browser as any).misesPrivate.getInstallReferrer(resolve);
        return;
      }
      resolve("");
    });
  },
};

// eslint-disable-next-line import/no-default-export
export default instance;
