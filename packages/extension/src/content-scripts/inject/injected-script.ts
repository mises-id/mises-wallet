import { InjectedKeplr } from "@keplr-wallet/provider";
import { injectKeplrToWindow } from "@keplr-wallet/provider";

import manifest from "../../manifest.json";

const keplr = new InjectedKeplr(manifest.version, "extension");
injectKeplrToWindow(keplr);

// if(window.location.origin )

// (()=>{
//   const step = 5000;
//   const mins = 10;
//   let maxCount = parseInt(`${1000 * 60 * mins / step}`);
//   let timer: NodeJS.Timeout | null = null;

//   const keepAlive = ()=>{
//     if(timer && maxCount === 0){
//       clearTimeout(timer);
//       timer = null;
//       console.log('keepAlive: end', maxCount);
//       return;
//     }

//     timer = setTimeout(() => {
//       console.log('keepAlive', maxCount);
//       keepAlive();
//       maxCount--;
//     }, step);

//     if(window.misesWallet){
//       window.misesWallet.hasWalletAccount()
//     }
//   }
//   keepAlive()
// })()
