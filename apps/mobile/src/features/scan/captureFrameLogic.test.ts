import {
  createInitialCaptureFrame,
  getCaptureFrameBounds,
  mapCaptureFrameToImageCrop,
  mapNormalizedRoiToImageCrop,
  normalizeRoiWithinVisibleRect,
  rotateLandscapeMetadataRoiToPortrait,
  resizeCaptureFrame,
} from "./captureFrameLogic";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ✗ ${name}`, error);
  }
}

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

test("initial frame stays inside usable camera bounds", () => {
  const viewport = { width: 390, height: 844 };
  const bounds = getCaptureFrameBounds(viewport);
  const frame = createInitialCaptureFrame(viewport);
  if (frame.x < bounds.x || frame.y < bounds.y) throw new Error("Frame starts outside bounds");
  if (frame.x + frame.width > bounds.x + bounds.width) throw new Error("Frame exceeds right bound");
  if (frame.y + frame.height > bounds.y + bounds.height) throw new Error("Frame exceeds bottom bound");
});

test("top-left resize clamps to minimum dimensions", () => {
  const bounds = { x: 20, y: 100, width: 350, height: 500 };
  const start = { x: 40, y: 160, width: 260, height: 220 };
  equal(
    resizeCaptureFrame(start, "topLeft", 500, 500, bounds),
    { x: 150, y: 270, width: 150, height: 110 }
  );
});

test("bottom-right resize clamps to camera bounds", () => {
  const bounds = { x: 20, y: 100, width: 350, height: 500 };
  const start = { x: 40, y: 160, width: 200, height: 180 };
  equal(
    resizeCaptureFrame(start, "bottomRight", 500, 500, bounds),
    { x: 40, y: 160, width: 330, height: 440 }
  );
});

test("frame maps directly when preview and image aspect ratios match", () => {
  equal(
    mapCaptureFrameToImageCrop(
      { x: 100, y: 200, width: 200, height: 300 },
      { width: 400, height: 800 },
      { width: 1200, height: 2400 },
      0
    ),
    { x: 300, y: 600, width: 600, height: 900 }
  );
});

test("mapping accounts for horizontal aspect-fill crop", () => {
  equal(
    mapCaptureFrameToImageCrop(
      { x: 0, y: 0, width: 300, height: 600 },
      { width: 300, height: 600 },
      { width: 1200, height: 1800 },
      0
    ),
    { x: 150, y: 0, width: 900, height: 1800 }
  );
});

test("maps the physical iPhone portrait preview ROI without expanding it", () => {
  equal(
    mapCaptureFrameToImageCrop(
      { x: 32, y: 201, width: 329, height: 257 },
      { width: 390, height: 736 },
      { width: 1018, height: 1920 },
      0
    ),
    { x: 83, y: 524, width: 860, height: 671 }
  );
});

test("maps a native normalized ROI to exact image pixels", () => {
  equal(
    mapNormalizedRoiToImageCrop(
      { x: 0.1, y: 0.25, width: 0.5, height: 0.4 },
      { width: 1018, height: 1920 }
    ),
    { x: 101, y: 480, width: 510, height: 768 }
  );
});

test("rebases a sensor ROI into Expo's visible still-image crop", () => {
  equal(
    normalizeRoiWithinVisibleRect(
      { x: 0.1, y: 0.25, width: 0.5, height: 0.3 },
      { x: 0, y: 0.125, width: 1, height: 0.75 }
    ),
    { x: 0.1, y: 1 / 6, width: 0.5, height: 0.39999999999999997 }
  );
});

test("the full visible sensor crop becomes the full saved photo", () => {
  const visible = { x: 0.08, y: 0, width: 0.84, height: 1 };
  equal(normalizeRoiWithinVisibleRect(visible, visible), { x: 0, y: 0, width: 1, height: 1 });
});

test("rotates the physical iPhone metadata ROI into portrait coordinates", () => {
  const portrait = rotateLandscapeMetadataRoiToPortrait({
    x: 0.2703804347826087,
    y: 0.10000000000000009,
    width: 0.3097826086956522,
    height: 0.8179487179487178,
  });
  equal(portrait, {
    x: 0.08205128205128209,
    y: 0.2703804347826087,
    width: 0.8179487179487178,
    height: 0.3097826086956522,
  });
  equal(
    mapNormalizedRoiToImageCrop(portrait, { width: 3054, height: 5760 }),
    { x: 250, y: 1557, width: 2499, height: 1785 }
  );
});

test("padding never exceeds original image bounds", () => {
  equal(
    mapCaptureFrameToImageCrop(
      { x: 0, y: 0, width: 400, height: 800 },
      { width: 400, height: 800 },
      { width: 1200, height: 2400 },
      0.1
    ),
    { x: 0, y: 0, width: 1200, height: 2400 }
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
