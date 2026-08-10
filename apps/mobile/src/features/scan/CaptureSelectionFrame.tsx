import { useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import type { CaptureFrameHandle, Rect } from "./captureFrameLogic";
import { resizeCaptureFrame } from "./captureFrameLogic";

interface CaptureSelectionFrameProps {
  frame: Rect;
  bounds: Rect;
  onChange: (frame: Rect) => void;
}

export default function CaptureSelectionFrame({ frame, bounds, onChange }: CaptureSelectionFrameProps) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.mask, { left: 0, right: 0, top: 0, height: frame.y }]} />
      <View pointerEvents="none" style={[styles.mask, { left: 0, top: frame.y, width: frame.x, height: frame.height }]} />
      <View
        pointerEvents="none"
        style={[
          styles.mask,
          { left: frame.x + frame.width, right: 0, top: frame.y, height: frame.height },
        ]}
      />
      <View pointerEvents="none" style={[styles.mask, { left: 0, right: 0, top: frame.y + frame.height, bottom: 0 }]} />

      <View
        pointerEvents="none"
        style={[styles.frame, { left: frame.x, top: frame.y, width: frame.width, height: frame.height }]}
      >
        <View style={styles.crosshairHorizontal} />
        <View style={styles.crosshairVertical} />
      </View>

      {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as CaptureFrameHandle[]).map((handle) => (
        <FrameHandle
          key={handle}
          handle={handle}
          frame={frame}
          bounds={bounds}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

function FrameHandle({
  handle,
  frame,
  bounds,
  onChange,
}: CaptureSelectionFrameProps & { handle: CaptureFrameHandle }) {
  const currentFrame = useRef(frame);
  const startFrame = useRef(frame);
  const boundsRef = useRef(bounds);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    currentFrame.current = frame;
  }, [frame]);
  useEffect(() => {
    boundsRef.current = bounds;
    onChangeRef.current = onChange;
  }, [bounds, onChange]);

  // Keep the responder instance stable throughout a drag. Recreating it after every
  // selection state update causes iOS to terminate the gesture before it can resize.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      startFrame.current = currentFrame.current;
    },
    onPanResponderMove: (_, gesture) => {
      const nextFrame = resizeCaptureFrame(startFrame.current, handle, gesture.dx, gesture.dy, boundsRef.current);
      currentFrame.current = nextFrame;
      onChangeRef.current(nextFrame);
    },
  }), [handle]);

  const isLeft = handle === "topLeft" || handle === "bottomLeft";
  const isTop = handle === "topLeft" || handle === "topRight";
  const position = {
    left: isLeft ? frame.x - 32 : frame.x + frame.width - 36,
    top: isTop ? frame.y - 32 : frame.y + frame.height - 36,
  };

  return (
    <View
      accessibilityLabel={`Resize selection from ${handle}`}
      accessibilityRole="adjustable"
      style={[styles.handleTouch, position]}
      {...responder.panHandlers}
    >
      <View
        style={[
          styles.corner,
          isTop ? styles.cornerTop : styles.cornerBottom,
          isLeft ? styles.cornerLeft : styles.cornerRight,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: "absolute",
    backgroundColor: "rgba(28, 23, 19, 0.52)",
  },
  frame: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(248, 242, 233, 0.55)",
  },
  crosshairHorizontal: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 34,
    height: 1,
    marginLeft: -17,
    backgroundColor: "rgba(248, 242, 233, 0.9)",
  },
  crosshairVertical: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 1,
    height: 34,
    marginTop: -17,
    backgroundColor: "rgba(248, 242, 233, 0.9)",
  },
  handleTouch: {
    position: "absolute",
    zIndex: 10,
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    width: 30,
    height: 30,
    borderColor: "#F4EADF",
    borderWidth: 0,
  },
  cornerTop: { borderTopWidth: 5 },
  cornerBottom: { borderBottomWidth: 5 },
  cornerLeft: { borderLeftWidth: 5 },
  cornerRight: { borderRightWidth: 5 },
});
