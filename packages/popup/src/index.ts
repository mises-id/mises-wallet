export const PopupSize = {
  width: 360,
  height: 580,
};

const lastWindowIds: Record<string, number | undefined> = {};

const lastTabIds: Record<string, number | undefined> = {};

/**
 * Try open window if no previous window exists.
 * If, previous window exists, try to change the location of this window.
 * Finally, try to recover focusing for opened window.
 * @param url
 */
export async function openPopupWindow(
  url: string,
  channel: string = "default",
  options: Partial<Parameters<typeof browser.windows.create>[0]> = {}
): Promise<number> {
  const option = {
    width: PopupSize.width,
    height: PopupSize.height,
    url: url,
    type: "popup" as const,
    ...options,
  };

  if (lastWindowIds[channel] !== undefined) {
    try {
      const window = await browser.windows.get(
        lastWindowIds[channel] as number,
        {
          populate: true,
        }
      );
      if (window?.tabs?.length) {
        const tab = window.tabs[0];
        if (tab?.id) {
          await browser.tabs.update(tab.id, { active: true, url });
        } else {
          throw new Error("Null window or tabs");
        }
      } else {
        throw new Error("Null window or tabs");
      }
    } catch {
      lastWindowIds[channel] = (await browser.windows.create(option)).id;
    }
  } else {
    lastWindowIds[channel] = (await browser.windows.create(option)).id;
  }

  if (lastWindowIds[channel]) {
    try {
      await browser.windows.update(lastWindowIds[channel] as number, {
        focused: true,
      });
    } catch (e: any) {
      console.log(`Failed to update window focus: ${e.message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return lastWindowIds[channel]!;
}

export function closePopupWindow(channel: string) {
  (async () => {
    const windowId = lastWindowIds[channel];

    if (windowId) {
      await browser.windows.remove(windowId);
    }
  })();
}

export async function openPopupTab(
  url: string,
  channel: string = "default"
): Promise<number> {
  const [_openerTab] = await browser.tabs.query({
    active: true,
    highlighted: true,
  });

  const option = {
    url,
    openerTabId: _openerTab && _openerTab.id,
  };
  console.log("_openerTab:", _openerTab.id);
  browser.storage.local.set({
    _openerTab: _openerTab.id,
  });

  if (lastTabIds[channel] !== undefined) {
    try {
      const tab = await browser.tabs.get(lastTabIds[channel] as number);
      if (tab.id) {
        await browser.tabs.update(tab.id, {
          active: true,
          highlighted: true,
          ...option,
        });
      } else {
        throw new Error("Null window or tabs");
      }
    } catch {
      lastTabIds[channel] = (await browser.tabs.create(option)).id;
    }
  } else {
    lastTabIds[channel] = (await browser.tabs.create(option)).id;
  }

  if (lastTabIds[channel]) {
    try {
      await browser.tabs.update(lastTabIds[channel] as number, {
        highlighted: true,
        active: true,
        ...option,
      });
    } catch (e: any) {
      console.log(`Failed to update window focus: ${e.message}`);
    }
  }
  browser.storage.local.set({
    lastTabId: lastTabIds[channel],
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return lastTabIds[channel]!;
}

export async function closePopupTab() {
  const openerTabId = (await browser.storage.local.get("_openerTab"))
    ._openerTab;
  const lastTabId = (await browser.storage.local.get("lastTabId")).lastTabId;

  console.log(openerTabId, "openerTabId");

  if (openerTabId) {
    try {
      await browser.tabs.update(openerTabId, {
        active: true,
        highlighted: true,
      });
    } catch (error) {
      console.log(error, "closePopupTab");
    }

    browser.storage.local.set({
      _openerTab: "",
      lastTabId: "",
    });
  }

  if (lastTabId) {
    browser.tabs.remove(lastTabId);
  }
}

/**
 * window.open() has many options for sizing, but they require different ways to do this per web browser.
 * So, to avoid this problem, just manually set sizing if new window popup is opened.
 */
export function fitPopupWindow() {
  if (isMobileStatus()) {
    return;
  }
  // Get the gap size like title bar or menu bar, etc...
  const gap = {
    width: window.outerWidth - window.innerWidth,
    height: window.outerHeight - window.innerHeight,
  };

  if (browser.windows) {
    browser.windows.getCurrent().then((window) => {
      if (window?.id != null) {
        browser.windows.update(window.id, {
          width: PopupSize.width + gap.width,
          height: PopupSize.height + gap.height,
        });
      }
    });
    return;
  }

  window.resizeTo(PopupSize.width + gap.width, PopupSize.height + gap.height);
}

/**
 * In some case, opened window has scrollbar even if scroll is unnecessary.
 * This can spoil the layout of content slightly.
 * So, if you are sure you don't need scrolling, use this function to remove scrolling.
 */
export function disableScroll() {
  const html = document.getElementsByTagName("html");
  html[0].style.overflow = "hidden";
}

export function enableScroll() {
  const html = document.getElementsByTagName("html");
  html[0].style.overflow = "";
}

export function isMobileStatus() {
  // return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  return true;
}
