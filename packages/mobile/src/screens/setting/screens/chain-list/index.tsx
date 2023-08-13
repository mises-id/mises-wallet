import React, { FunctionComponent, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../../../stores";
import { StyleSheet, Text, View } from "react-native";
import { useStyle } from "../../../../styles";
import { Toggle } from "../../../../components/toggle";
import FastImage from "react-native-fast-image";
import { VectorCharacter } from "../../../../components/vector-character";
import { PanGestureHandler } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { PageWithFixedHeightSortableList } from "../../../../components/page/fixed-height-sortable-list";
import Animated, {
  Easing,
  SharedValue,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const SettingChainListScreen: FunctionComponent = observer(() => {
  const { chainStore } = useStore();

  const style = useStyle();
  return (
    <PageWithFixedHeightSortableList
      backgroundMode="secondary"
      contentContainerStyle={style.get("flex-grow-1")}
      itemHeight={84}
      data={chainStore.chainInfosWithUIConfig.map(
        ({ chainInfo, disabled }, index) => {
          return {
            key: chainInfo.chainId,
            isFirst: index === 0,
            isLast: index === chainStore.chainInfosWithUIConfig.length - 1,
            chainId: chainInfo.chainId,
            chainName: chainInfo.chainName,
            chainSymbolImageUrl: chainInfo.raw.chainSymbolImageUrl,
            disabled,
          };
        }
      )}
      dividerIndex={chainStore.chainInfosWithUIConfig.findIndex(
        ({ disabled }) => disabled
      )}
      delegateOnGestureEventToItemView={true}
      onDragEnd={(keys) => {
        chainStore.setChainInfosInUIOrder(keys);
      }}
      renderItem={(item, anims) => {
        return (
          <SettingChainListScreenElement
            {...item}
            isDragging={anims.isDragging}
            onGestureEvent={anims.onGestureEvent}
          />
        );
      }}
      gapTop={12}
      gapBottom={12}
    />
  );
});

const usePreviousDiff = (initialValue: number) => {
  const previous = useSharedValue(initialValue);

  const set = (value: number) => {
    previous.value = value;
  };

  const diff = (value: number) => {
    return previous.value !== undefined ? value - previous.value : value;
  };

  return {
    set,
    diff,
    previous,
  };
};

export const SettingChainListScreenElement: FunctionComponent<{
  isFirst: boolean;
  isLast: boolean;

  chainId: string;
  chainName: string;
  chainSymbolImageUrl: string | undefined;
  disabled: boolean;

  isDragging: SharedValue<number>;
  onGestureEvent: (...args: any[]) => void;
}> = observer(
  ({
    isLast,
    chainId,
    chainName,
    chainSymbolImageUrl,
    disabled,
    isDragging,
    onGestureEvent,
  }) => {
    const { chainStore } = useStore();

    const style = useStyle();

    const animatedState = {
      clockIsRunning: useSharedValue(0),
      clock: useSharedValue(0),
      finished: useSharedValue(0),
      position: useSharedValue(0),
      time: useSharedValue(0),
      frameTime: useSharedValue(0),
    };
    const isDraggingDiff = usePreviousDiff(0);

    const animIsDragging = useDerivedValue(() => {
      if (isDraggingDiff.previous.value !== 0) {
        animatedState.finished.value = 0;
        animatedState.time.value = 0;
        animatedState.frameTime.value = 0;

        if (!animatedState.clockIsRunning.value) {
          animatedState.clockIsRunning.value = 1;
          animatedState.clock.value = withTiming(
            isDragging.value,
            {
              duration: 140,
              easing: Easing.out(Easing.cubic),
            },
            (isFinished) => {
              if (isFinished) {
                animatedState.clockIsRunning.value = 0;
              }
            }
          );
        }
      }

      isDraggingDiff.previous.value = isDragging.value;

      return animatedState.position.value;
    }, [animatedState, isDragging, isDraggingDiff]);

    return (
      <View
        style={style.flatten(
          ["flex-row", "height-84", "items-center"],
          [
            !isLast && "border-solid",
            !isLast && "border-width-bottom-1",
            !isLast && "border-color-gray-50",
            !isLast && "dark:border-color-platinum-500",
          ]
        )}
      >
        <Animated.View
          style={StyleSheet.flatten([
            style.flatten([
              "absolute-fill",
              "background-color-white",
              "dark:background-color-platinum-600",
            ]),
            {
              backgroundColor: interpolateColor(
                animIsDragging.value,
                [0, 1],
                [
                  style.flatten(["color-white", "dark:color-platinum-600"])
                    .color,
                  style.flatten(["color-gray-50", "dark:color-platinum-400"])
                    .color,
                ]
              ),
            },
          ])}
        />
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureEvent}
        >
          <Animated.View
            style={style.flatten([
              "height-64",
              "margin-left-8",
              "padding-left-10",
              "padding-right-10",
              "justify-center",
              "items-center",
            ])}
          >
            <Svg width="17" height="10" fill="none" viewBox="0 0 17 10">
              <Path
                stroke={
                  style.flatten(["color-gray-100", "dark:color-platinum-100"])
                    .color
                }
                strokeLinecap="round"
                strokeWidth="3"
                d="M2 1.5h13M2 8.5h13"
              />
            </Svg>
          </Animated.View>
        </PanGestureHandler>
        <View
          style={style.flatten(
            [
              "width-40",
              "height-40",
              "border-radius-64",
              "items-center",
              "justify-center",
              "background-color-blue-400",
            ],
            [
              disabled && "background-color-gray-100",
              disabled && "dark:background-color-platinum-500",
            ]
          )}
        >
          {chainSymbolImageUrl ? (
            <FastImage
              style={{
                width: 30,
                height: 30,
              }}
              resizeMode={FastImage.resizeMode.contain}
              source={{
                uri: chainSymbolImageUrl,
              }}
            />
          ) : (
            <VectorCharacter char={chainName[0]} color="white" height={15} />
          )}
        </View>
        <View style={style.flatten(["justify-center", "margin-left-10"])}>
          <Text style={style.flatten(["h6", "color-text-high"])}>
            {chainName}
          </Text>
        </View>
        <View style={style.get("flex-1")} />
        <View style={style.flatten(["margin-right-20"])}>
          <Toggle
            on={!disabled}
            onChange={() => {
              chainStore.toggleChainInfoInUI(chainId);
            }}
          />
        </View>
      </View>
    );
  }
);
