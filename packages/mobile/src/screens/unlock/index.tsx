import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Dimensions, Image, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { observer } from "mobx-react-lite";
import { useStyle, useStyleThemeController } from "../../styles";
import * as SplashScreen from "expo-splash-screen";
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

let splashScreenHided = false;
async function hideSplashScreen() {
  if (!splashScreenHided) {
    console.log("Hide Splash screen");
    if (await SplashScreen.hideAsync()) {
      splashScreenHided = true;
    }
  }
}

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

  const [isSplashEnd, setIsSplashEnd] = useState(false);

  const animatedContinuityEffectOpacityValue = useSharedValue(1);

  const animatedContinuityEffectOpacity = useAnimatedStyle(() => {
    return {
      opacity: animatedContinuityEffectOpacityValue.value,
    };
  });

  const startAnimation = useCallback(() => {
    animatedContinuityEffectOpacityValue.value = withTiming(0, {
      duration: 600,
      easing: Easing.ease,
    });
  }, [animatedContinuityEffectOpacityValue.value]);

  const navigateToHomeOnce = useRef(false);
  const navigateToHome = useCallback(async () => {
    if (!navigateToHomeOnce.current) {
      // Wait the account of selected chain is loaded.
      await waitAccountLoad(accountStore, chainStore.current.chainId);
      navigation.dispatch(StackActions.replace("MainTabDrawer"));
    }
    navigateToHomeOnce.current = true;
  }, [accountStore, chainStore, navigation]);

  const autoBiometryStatus = useAutoBiomtric(
    keychainStore,
    keyRingStore.status === KeyRingStatus.LOCKED && isSplashEnd
  );

  useEffect(() => {
    if (isSplashEnd && autoBiometryStatus === AutoBiomtricStatus.SUCCESS) {
      (async () => {
        await hideSplashScreen();
      })();
    }
  }, [autoBiometryStatus, isSplashEnd, navigation]);

  useEffect(() => {
    if (
      isSplashEnd &&
      keyRingStore.status === KeyRingStatus.LOCKED &&
      (autoBiometryStatus === AutoBiomtricStatus.NO_NEED ||
        autoBiometryStatus === AutoBiomtricStatus.FAILED)
    ) {
      setTimeout(() => {
        startAnimation();
      }, 700);
    }
  }, [
    animatedContinuityEffectOpacity,
    autoBiometryStatus,
    isSplashEnd,
    keyRingStore.status,
  ]);

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

      await hideSplashScreen();
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

      await hideSplashScreen();
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
      isSplashEnd &&
      keyRingStore.status === KeyRingStatus.EMPTY
    ) {
      (async () => {
        await hideSplashScreen();
        routeToRegisterOnce.current = true;
        navigation.dispatch(
          StackActions.replace("Register", {
            screen: "Register.Intro",
          })
        );
      })();
    }
  }, [isSplashEnd, keyRingStore.status, navigation]);

  useEffect(() => {
    if (keyRingStore.status === KeyRingStatus.UNLOCKED) {
      (async () => {
        await hideSplashScreen();
        navigateToHome();
      })();
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
      <Animated.View
        style={StyleSheet.flatten([
          style.flatten(["absolute-fill"]),
          animatedContinuityEffectOpacity,
        ])}
        pointerEvents={isSplashEnd ? "none" : "auto"}
      >
        <SplashContinuityEffectView
          onAnimationEnd={() => {
            setIsSplashEnd(true);
          }}
        />
      </Animated.View>
    </React.Fragment>
  );
});

const useAnimationState = () => {
  const finished = useSharedValue(0);
  const position = useSharedValue(0);
  const time = useSharedValue(0);
  const frameTime = useSharedValue(0);

  const [state] = useState(() => {
    return {
      finished,
      position,
      time,
      frameTime,
    };
  });

  return state;
};
export const SplashContinuityEffectView: FunctionComponent<{
  onAnimationEnd: () => void;
}> = ({ onAnimationEnd }) => {
  const themeController = useStyleThemeController();
  const style = useStyle();

  const onAnimationEndRef = useRef(onAnimationEnd);
  onAnimationEndRef.current = onAnimationEnd;

  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);
  const [logoSize, setLogoSize] = useState<
    | {
        width: number;
        height: number;
      }
    | undefined
  >({
    width: 100,
    height: 100,
  });

  const isStarted = useSharedValue(0);
  const backgroundDone = useSharedValue(0);
  const backgroundClippingDone = useSharedValue(0);
  const backgroundClockValue = useSharedValue(0);
  const backgroundClock = useDerivedValue(() => {
    let isRunning = false;
    const value = backgroundClockValue;

    const start = () => {
      value.value = withTiming(1, {
        duration: backgroundAnimationDuration,
        easing: Easing.out(Easing.quad),
      });
      isRunning = true;
    };

    const stop = () => {
      cancelAnimation(value);
      runOnJS(onAnimationEnd)();
      isRunning = false;
    };

    return { value, start, stop, isRunning };
  });

  const backgroundClippingClockValue = useSharedValue(0);
  const backgroundClippingClock = useDerivedValue(() => {
    let isRunning = false;
    const value = backgroundClippingClockValue;

    const start = () => {
      value.value = withTiming(1, {
        duration: backgroundClippingAnimationDuration,
        easing: Easing.out(Easing.quad),
      });
      isRunning = true;
    };

    const stop = () => {
      cancelAnimation(value);
      isRunning = false;
    };
    return { value, start, stop, isRunning };
  });

  const [animation] = useState(() => {
    return {
      isStarted,
      backgroundDone,
      backgroundClippingDone,
      backgroundClock,
      backgroundClippingClock,
    };
  });

  const backgroundClippingWidth = useAnimationState();
  const backgroundClippingHeight = useAnimationState();
  const backgroundClippingRadius = useAnimationState();

  const backgroundDelay = useAnimationState();
  const backgroundWidth = useAnimationState();
  const backgroundHeight = useAnimationState();

  useEffect(() => {
    // When the splash screen disappears and the transition starts, the color should change according to the theme.
    // In most cases, there is no problem because the theme is loaded very quickly, but it waits for an asynchronous load just in case.
    if (!themeController.isInitializing && isBackgroundLoaded && logoSize) {
      (async () => {
        await hideSplashScreen();

        animation.isStarted.value = 1;
      })();
    }
  }, [
    themeController.isInitializing,
    animation.isStarted,
    isBackgroundLoaded,
    logoSize,
  ]);

  const backgroundClippingAnimationDuration = 700;
  const backgroundAnimationDuration = 900;
  const backgroundAnimationDelay = 300;

  const expectedLogoSize = logoSize
    ? logoSize.height * (Dimensions.get("window").width / logoSize.width)
    : 0;

  const expectedBorderRadius = expectedLogoSize / 4.45;

  useAnimatedReaction(
    () => {
      if (
        animation.isStarted.value > 0 &&
        animation.backgroundClippingDone.value === 0
      ) {
        if (!animation.backgroundClippingClock.value.isRunning) {
          animation.backgroundClippingClock.value.start();
        }

        if (
          backgroundClippingWidth.finished &&
          backgroundClippingHeight.finished &&
          backgroundClippingRadius.finished
        ) {
          animation.backgroundClippingDone.value = 1;
          console.debug("Background clipping animation is done");
          animation.backgroundClippingClock.value.stop();
          cancelAnimation(animation.backgroundClippingClock.value);
        } else {
          animation.backgroundClippingClock.value.start();

          console.debug("Background clipping animation is in progress");
        }
      }
    },
    () => {},
    [
      animation.isStarted.value,
      animation.backgroundClippingDone.value,
      animation.backgroundClippingClock,
      backgroundClippingWidth.finished,
      backgroundClippingHeight.finished,
      backgroundClippingRadius.finished,
    ]
  );

  useAnimatedReaction(
    () => {
      if (
        animation.isStarted.value > 0 &&
        animation.backgroundDone.value === 0
      ) {
        if (!animation.backgroundClock.value.isRunning) {
          animation.backgroundClock.value.start();
        }

        if (backgroundDelay.finished) {
          animation.backgroundClock.value.start();

          if (backgroundWidth.finished && backgroundHeight.finished) {
            animation.backgroundDone.value = 1;
            console.debug("Background animation is done");
            animation.backgroundClock.value.stop();
            // onAnimationEndRef.current();
          }
        } else {
          animation.backgroundClock.value.start();
          // animation.backgroundClock.value.value = withTiming(1, {
          //   duration: backgroundAnimationDelay,
          //   easing: Easing.ease,
          // });

          console.debug("Delay for background animation is reached");
        }
      }
    },
    () => {},
    [
      animation.isStarted.value,
      animation.backgroundDone.value,
      animation.backgroundClock,
      backgroundDelay.finished,
      backgroundWidth.finished,
      backgroundHeight.finished,
    ]
  );

  return (
    <React.Fragment>
      <UnlockScreenGradientBackground />
      <View
        style={style.flatten([
          "absolute-fill",
          "items-center",
          "justify-center",
        ])}
      >
        <Animated.View
          style={StyleSheet.flatten([
            style.flatten([
              "width-full",
              "height-full",
              "overflow-hidden",
              "items-center",
              "justify-center",
            ]),
            {
              width: interpolate(
                backgroundClippingWidth.position.value,
                [0, 1],
                [Dimensions.get("window").width, expectedLogoSize]
              ),
              height: interpolate(
                backgroundClippingHeight.position.value,
                [0, 1],
                [
                  Dimensions.get("window").height +
                    (StatusBar.currentHeight ?? 0),
                  expectedLogoSize,
                ]
              ),
              borderRadius: interpolate(
                backgroundClippingRadius.position.value,
                [0, 1],
                [0, expectedBorderRadius]
              ),
              // width: backgroundClippingWidth.position.interpolate({
              //   inputRange: [0, 1],
              //   outputRange: [Dimensions.get("window").width, expectedLogoSize],
              // }),
              // height: backgroundClippingHeight.position.interpolate({
              //   inputRange: [0, 1],
              //   outputRange: [
              //     Dimensions.get("window").height +
              //       (StatusBar.currentHeight ?? 0),
              //     expectedLogoSize,
              //   ],
              // }),
              // borderRadius: backgroundClippingRadius.position.interpolate({
              //   inputRange: [0, 1],
              //   outputRange: [0, expectedBorderRadius],
              // }),
            },
          ])}
        >
          <Animated.Image
            style={StyleSheet.flatten([
              style.flatten(["width-full", "height-full"]),
              {
                width: interpolate(
                  backgroundWidth.position.value,
                  [0, 1],
                  [Dimensions.get("window").width, expectedLogoSize]
                ),
                height: interpolate(
                  backgroundHeight.position.value,
                  [0, 1],
                  [
                    Dimensions.get("window").height +
                      (StatusBar.currentHeight ?? 0),
                    expectedLogoSize,
                  ]
                ),
              },
            ])}
            source={require("../../assets/logo/splash-screen-only-background.png")}
            resizeMode="stretch"
            fadeDuration={0}
            onLoadEnd={() => {
              setIsBackgroundLoaded(true);
            }}
          />
        </Animated.View>
      </View>
      <View
        style={style.flatten([
          "absolute-fill",
          "items-center",
          "justify-center",
        ])}
      >
        <Image
          style={style.flatten(["width-full", "height-full"])}
          source={require("../../assets/logo/splash-screen-only-k.png")}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={(e) => {
            console.log(e.nativeEvent.source, "1232132");
            setLogoSize(e.nativeEvent.source);
          }}
        />
      </View>
    </React.Fragment>
  );
};

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
