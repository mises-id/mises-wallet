import { useSharedValue } from "react-native-reanimated";

export const useClock = () => {
  const value = useSharedValue(0);
  let isRunning = false;

  const start = () => {
    "worklet";
    isRunning = true;
  };

  const stop = () => {
    "worklet";
    isRunning = false;
  };

  return {
    value,
    isRunning,
    start,
    stop,
  };
};
