/* global chrome */
// This file is used only for manifest version 3

// Represents if importAllScripts has been run
// eslint-disable-next-line
let scriptsLoadInitiated = false;

// eslint-disable-next-line import/unambiguous
function tryImport(...fileNames) {
  try {
    // eslint-disable-next-line
    importScripts(...fileNames);
    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}

function importAllScripts() {
  // Bail if we've already imported scripts
  if (scriptsLoadInitiated) {
    return;
  }
  scriptsLoadInitiated = true;
  const files = [];

  // In testMode individual files are imported, this is to help capture load time stats
  const loadFile = (fileName) => {
    files.push(fileName);
  };

  loadFile("./browser-polyfill.js");
  loadFile("./background.bundle.js");

  // Import all required resources
  tryImport(...files);
}

// Ref: https://stackoverflow.com/questions/66406672/chrome-extension-mv3-modularize-service-worker-js-file
// eslint-disable-next-line no-undef
self.addEventListener("install", importAllScripts);

/*
 * A keepalive message listener to prevent Service Worker getting shut down due to inactivity.
 * UI sends the message periodically, in a setInterval.
 * Chrome will revive the service worker if it was shut down, whenever a new message is sent, but only if a listener was defined here.
 *
 * chrome below needs to be replaced by cross-browser object,
 * but there is issue in importing webextension-polyfill into service worker.
 * chrome does seems to work in at-least all chromium based browsers
 */
chrome.runtime.onMessage.addListener(() => {
  importAllScripts();
  return false;
});

/*
 * This content script is injected programmatically because
 * MAIN world injection does not work properly via manifest
 * https://bugs.chromium.org/p/chromium/issues/detail?id=634381
 */
// const registerInPageContentScript = async () => {
//   try {
//     await chrome.scripting.registerContentScripts([
//       {
//         id: "inpage",
//         matches: ["file://*/*", "http://*/*", "https://*/*"],
//         js: ["browser-polyfill.js", "contentScripts.bundle.js"],
//         runAt: "document_start",
//         world: "MAIN",
//         allFrames: true,
//       },
//     ]);
//   } catch (err) {
//     /**
//      * An error occurs when app-init.js is reloaded. Attempts to avoid the duplicate script error:
//      * 1. registeringContentScripts inside runtime.onInstalled - This caused a race condition
//      *    in which the provider might not be loaded in time.
//      * 2. await chrome.scripting.getRegisteredContentScripts() to check for an existing
//      *    inpage script before registering - The provider is not loaded on time.
//      */
//     console.warn(`Dropped attempt to register inpage content script. ${err}`);
//   }
// };

// registerInPageContentScript();
