import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { observer } from "mobx-react-lite";
import { useStyle, useStyleThemeController } from "../../styles";
import { TextInput } from "../../components/input";
import { Button } from "../../components/button";
import delay from "delay";
import { useStore } from "../../stores";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StackActions, useNavigation } from "@react-navigation/native";
import { KeyRingStatus } from "@keplr-wallet/background";
import { KeychainStore } from "../../stores/keychain";
import { IAccountStore } from "@keplr-wallet/stores";
import { autorun } from "mobx";
import { SimpleGradient } from "../../components/svg";

async function waitAccountLoad(
  accountStore: IAccountStore,
  chainId: string
): Promise<void> {
  if (accountStore.getAccount(chainId).bech32Address) {
    return;
  }

  return new Promise((resolve) => {
    const disposer = autorun(() => {
      if (accountStore.getAccount(chainId).bech32Address) {
        resolve();
        if (disposer) {
          disposer();
        }
      }
    });
  });
}

/*
 If the biomeric is on, just try to unlock by biometric automatically once.
 */
enum AutoBiomtricStatus {
  NO_NEED,
  NEED,
  FAILED,
  SUCCESS,
}

const useAutoBiomtric = (keychainStore: KeychainStore, tryEnabled: boolean) => {
  const [status, setStatus] = useState(AutoBiomtricStatus.NO_NEED);
  const tryBiometricAutoOnce = useRef(false);

  useEffect(() => {
    if (keychainStore.isBiometryOn && status === AutoBiomtricStatus.NO_NEED) {
      setStatus(AutoBiomtricStatus.NEED);
    }
  }, [keychainStore.isBiometryOn, status]);

  useEffect(() => {
    if (
      !tryBiometricAutoOnce.current &&
      status === AutoBiomtricStatus.NEED &&
      tryEnabled
    ) {
      tryBiometricAutoOnce.current = true;
      (async () => {
        try {
          await keychainStore.tryUnlockWithBiometry();
          setStatus(AutoBiomtricStatus.SUCCESS);
        } catch (e) {
          console.log(e);
          setStatus(AutoBiomtricStatus.FAILED);
        }
      })();
    }
  }, [keychainStore, status, tryEnabled]);

  return status;
};

/**
 * UnlockScreen is expected to be opened when the keyring store's state is "not loaded (yet)" or "locked" at launch.
 * And, this screen has continuity with the splash screen
 * @constructor
 */
export const UnlockScreen: FunctionComponent = observer(() => {
  const { keyRingStore, keychainStore, accountStore, chainStore } = useStore();

  const style = useStyle();

  const navigation = useNavigation();

  // const [isSplashEnd, setIsSplashEnd] = useState(true);

  // const animatedContinuityEffectOpacity = useSharedValue(0);

  const navigateToHomeOnce = useRef(false);
  const navigateToHome = useCallback(async () => {
    if (!navigateToHomeOnce.current) {
      // Wait the account of selected chain is loaded.
      await waitAccountLoad(accountStore, chainStore.current.chainId);
      navigation.dispatch(StackActions.replace("MainTabDrawer"));
    }
    navigateToHomeOnce.current = true;
  }, [accountStore, chainStore, navigation]);

  // const autoBiometryStatus = useAutoBiomtric(
  //   keychainStore,
  //   keyRingStore.status === KeyRingStatus.LOCKED && isSplashEnd
  // );

  // const timingConfig = {
  //   duration: 600,
  //   easing: Easing.ease,
  // };

  // const startAnimation = () => {
  //   animatedContinuityEffectOpacity.value = withTiming(0, timingConfig);
  // };
  // useEffect(() => {
  //   if (
  //     isSplashEnd &&
  //     keyRingStore.status === KeyRingStatus.LOCKED &&
  //     (autoBiometryStatus === AutoBiomtricStatus.NO_NEED ||
  //       autoBiometryStatus === AutoBiomtricStatus.FAILED)
  //   ) {
  //     setTimeout(() => {
  //       startAnimation();
  //     }, 700);
  //   }
  //   // eslint-disable-next-line
  // }, [autoBiometryStatus, isSplashEnd, keyRingStore.status]);

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const tryBiometric = useCallback(async () => {
    try {
      setIsBiometricLoading(true);
      // Because javascript is synchronous language, the loadnig state change would not delivered to the UI thread
      // So to make sure that the loading state changes, just wait very short time.
      await delay(10);
      await keychainStore.tryUnlockWithBiometry();
    } catch (e) {
      console.log(e);
      setIsBiometricLoading(false);
    }
  }, [keychainStore]);

  const tryUnlock = async () => {
    try {
      setIsLoading(true);
      // Decryption needs slightly huge computation.
      // Because javascript is synchronous language, the loadnig state change would not delivered to the UI thread
      // before the actually decryption is complete.
      // So to make sure that the loading state changes, just wait very short time.
      await delay(10);
      await keyRingStore.unlock(password);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
      setIsFailed(true);
    }
  };

  const routeToRegisterOnce = useRef(false);
  useEffect(() => {
    // If the keyring is empty,
    // route to the register screen.
    if (
      !routeToRegisterOnce.current &&
      keyRingStore.status === KeyRingStatus.EMPTY
    ) {
      (async () => {
        routeToRegisterOnce.current = true;
        navigation.dispatch(
          StackActions.replace("Register", {
            screen: "Register.Intro",
          })
        );
      })();
    }
  }, [keyRingStore.status, navigation]);

  useEffect(() => {
    if (keyRingStore.status === KeyRingStatus.UNLOCKED) {
      navigateToHome();
    }
  }, [keyRingStore.status, navigateToHome]);

  return (
    <React.Fragment>
      <UnlockScreenGradientBackground />
      <View style={style.flatten(["flex-1"])}>
        <KeyboardAwareScrollView
          contentContainerStyle={style.flatten(["flex-grow-1"])}
          indicatorStyle={style.theme === "dark" ? "white" : "black"}
        >
          <View style={style.get("flex-5")} />
          <Image
            style={StyleSheet.flatten([style.flatten(["width-full"])])}
            fadeDuration={0}
            resizeMode="contain"
            source={
              style.theme === "dark"
                ? require("../../assets/logo/splash-image-dark-mode.png")
                : require("../../assets/logo/splash-image.png")
            }
          />
          <View style={style.get("flex-3")} />
          <View style={style.flatten(["padding-x-page"])}>
            <TextInput
              containerStyle={style.flatten(["padding-bottom-40"])}
              label="Password"
              returnKeyType="done"
              secureTextEntry={true}
              value={password}
              error={isFailed ? "Invalid password" : undefined}
              onChangeText={setPassword}
              onSubmitEditing={tryUnlock}
            />
            <Button
              text="Unlock"
              size="large"
              loading={isLoading}
              onPress={tryUnlock}
            />
            {keychainStore.isBiometryOn ? (
              <Button
                containerStyle={style.flatten(["margin-top-40"])}
                text="Use Biometric Authentication"
                mode="text"
                loading={isBiometricLoading}
                onPress={tryBiometric}
              />
            ) : null}
          </View>
          <View style={style.get("flex-7")} />
        </KeyboardAwareScrollView>
      </View>
      {/* <Animated.View
        style={StyleSheet.flatten([
          style.flatten(["absolute-fill"]),
          {
            opacity: animatedContinuityEffectOpacity.value,
          },
        ])}
        pointerEvents={isSplashEnd ? "none" : "auto"}
      >
        <SplashContinuityEffectView 
          onAnimationEnd={() => {
            setIsSplashEnd(true);
          }}
        />
      </Animated.View> */}
    </React.Fragment>
  );
});

// const SplashContinuityEffectView: FunctionComponent<{
//   onAnimationEnd: () => void;
// }> = ({ onAnimationEnd }) => {
//   const themeController = useStyleThemeController();
//   const style = useStyle();

//   const windowDimensions = Dimensions.get("window");

//   const isBackgroundLoaded = useSharedValue(true);
//   const logoSize = useSharedValue<
//     | {
//         width: number;
//         height: number;
//       }
//     | undefined
//   >(undefined);

//   const isStarted = useSharedValue(0);
//   const backgroundClippingWidth = useSharedValue(0);
//   const backgroundClippingHeight = useSharedValue(0);
//   const backgroundClippingRadius = useSharedValue(0);
//   const backgroundDone = useSharedValue(0);
//   const backgroundWidth = useSharedValue(0);
//   const backgroundHeight = useSharedValue(0);

//   const backgroundClippingAnimationDuration = 700;
//   const backgroundAnimationDuration = 900;
//   const backgroundAnimationDelay = 300;

//   const expectedLogoSize = logoSize.value
//     ? logoSize.value.height * (windowDimensions.width / logoSize.value.width)
//     : 0;

//   const expectedBorderRadius = expectedLogoSize / 4.45;
//   useAnimatedReaction(
//     () => {
//       return isStarted.value;
//     },
//     (value) => {
//       if (value) {
//         backgroundClippingWidth.value = withTiming(1, {
//           duration: backgroundClippingAnimationDuration,
//           easing: Easing.out(Easing.cubic),
//         });
//         backgroundClippingHeight.value = withTiming(1, {
//           duration: backgroundClippingAnimationDuration,
//           easing: Easing.out(Easing.cubic),
//         });
//         backgroundClippingRadius.value = withTiming(1, {
//           duration: backgroundClippingAnimationDuration,
//           easing: Easing.out(Easing.cubic),
//         });

//         if (
//           backgroundClippingWidth.value === 1 &&
//           backgroundClippingHeight.value === 1 &&
//           backgroundClippingRadius.value === 1
//         ) {
//           backgroundDone.value = 1;
//         }
//       }
//     },
//     [isStarted.value]
//   );

//   useAnimatedReaction(
//     () => {
//       return isStarted.value;
//     },
//     (value) => {
//       if (value) {
//         backgroundWidth.value = withDelay(
//           backgroundAnimationDelay,
//           withTiming(1, {
//             duration: backgroundAnimationDuration,
//             easing: Easing.out(Easing.quad),
//           })
//         );
//         backgroundHeight.value = withDelay(
//           backgroundAnimationDelay,
//           withTiming(1, {
//             duration: backgroundAnimationDuration,
//             easing: Easing.out(Easing.quad),
//           })
//         );
//         console.log(backgroundWidth.value, backgroundHeight.value);
//         if (backgroundWidth.value === 1 && backgroundHeight.value === 1) {
//           backgroundDone.value = 1;
//           runOnJS(onAnimationEnd)();
//         }
//       }
//     },
//     [isStarted.value]
//   );

//   const backgroundClippingStyle = useAnimatedStyle(() => {
//     const width = interpolate(
//       backgroundClippingWidth.value,
//       [0, 1],
//       [0, windowDimensions.width],
//       Extrapolate.CLAMP
//     );
//     const height = interpolate(
//       backgroundClippingHeight.value,
//       [0, 1],
//       [0, windowDimensions.height],
//       Extrapolate.CLAMP
//     );
//     const borderRadius = interpolate(
//       backgroundClippingRadius.value,
//       [0, 1],
//       [0, expectedBorderRadius],
//       Extrapolate.CLAMP
//     );

//     return {
//       width,
//       height,
//       borderRadius,
//     };
//   });

//   const backgroundStyle = useAnimatedStyle(() => {
//     const width = interpolate(
//       backgroundWidth.value,
//       [0, 1],
//       [0, windowDimensions.width],
//       Extrapolate.CLAMP
//     );
//     const height = interpolate(
//       backgroundHeight.value,
//       [0, 1],
//       [0, windowDimensions.height],
//       Extrapolate.CLAMP
//     );

//     return {
//       width,
//       height,
//     };
//   });

//   return (
//     <React.Fragment>
//       <UnlockScreenGradientBackground />
//       <View
//         style={style.flatten([
//           "absolute-fill",
//           "items-center",
//           "justify-center",
//         ])}
//       >
//         <Animated.View
//           style={StyleSheet.flatten([
//             style.flatten([
//               "width-full",
//               "height-full",
//               "overflow-hidden",
//               "items-center",
//               "justify-center",
//             ]),
//             backgroundClippingStyle,
//           ])}
//         >
//           <Animated.Image
//             style={StyleSheet.flatten([
//               style.flatten(["width-full", "height-full"]),
//               backgroundStyle,
//             ])}
//             source={require("../../assets/logo/splash-screen-only-background.png")}
//             resizeMode="stretch"
//             fadeDuration={0}
//             onLoadEnd={() => {
//               isBackgroundLoaded.value = true;
//             }}
//           />
//         </Animated.View>
//       </View>
//       <View
//         style={style.flatten([
//           "absolute-fill",
//           "items-center",
//           "justify-center",
//         ])}
//       >
//         <Image
//           style={style.flatten(["width-full", "height-full"])}
//           source={require("../../assets/logo/splash-screen-only-k.png")}
//           resizeMode="contain"
//           fadeDuration={0}
//         />
//       </View>
//     </React.Fragment>
//   );
// };

const UnlockScreenGradientBackground: FunctionComponent = () => {
  const style = useStyle();

  return (
    <View style={style.flatten(["absolute-fill"])}>
      <SimpleGradient
        degree={style.get("unlock-screen-gradient-background").degree}
        stops={style.get("unlock-screen-gradient-background").stops}
        fallbackAndroidImage={
          style.get("unlock-screen-gradient-background").fallbackAndroidImage
        }
      />
    </View>
  );
};
