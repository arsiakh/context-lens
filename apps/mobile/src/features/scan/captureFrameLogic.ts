export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export type CaptureFrameHandle = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

const DEFAULT_MARGIN = 24;
const DEFAULT_TOP_INSET = 112;
const DEFAULT_BOTTOM_INSET = 190;
const DEFAULT_MIN_WIDTH = 150;
const DEFAULT_MIN_HEIGHT = 110;

export function getCaptureFrameBounds(viewport: Size): Rect {
  const width = Math.max(0, viewport.width - DEFAULT_MARGIN * 2);
  const availableHeight = Math.max(0, viewport.height - DEFAULT_TOP_INSET - DEFAULT_BOTTOM_INSET);
  return {
    x: DEFAULT_MARGIN,
    y: DEFAULT_TOP_INSET,
    width,
    height: availableHeight,
  };
}

export function createInitialCaptureFrame(viewport: Size): Rect {
  const bounds = getCaptureFrameBounds(viewport);
  const width = Math.max(DEFAULT_MIN_WIDTH, Math.min(bounds.width, viewport.width - 64));
  const height = Math.max(DEFAULT_MIN_HEIGHT, Math.min(260, bounds.height));
  return {
    x: Math.round(bounds.x + (bounds.width - width) / 2),
    y: Math.round(bounds.y + (bounds.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function resizeCaptureFrame(
  start: Rect,
  handle: CaptureFrameHandle,
  dx: number,
  dy: number,
  bounds: Rect,
  minWidth = DEFAULT_MIN_WIDTH,
  minHeight = DEFAULT_MIN_HEIGHT
): Rect {
  const boundsRight = bounds.x + bounds.width;
  const boundsBottom = bounds.y + bounds.height;
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;

  let left = start.x;
  let right = startRight;
  let top = start.y;
  let bottom = startBottom;

  if (handle === "topLeft" || handle === "bottomLeft") {
    left = clamp(start.x + dx, bounds.x, startRight - minWidth);
  } else {
    right = clamp(startRight + dx, start.x + minWidth, boundsRight);
  }

  if (handle === "topLeft" || handle === "topRight") {
    top = clamp(start.y + dy, bounds.y, startBottom - minHeight);
  } else {
    bottom = clamp(startBottom + dy, start.y + minHeight, boundsBottom);
  }

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

export function mapCaptureFrameToImageCrop(
  frame: Rect,
  preview: Size,
  image: Size,
  paddingRatio = 0.035
): Rect {
  if (preview.width <= 0 || preview.height <= 0 || image.width <= 0 || image.height <= 0) {
    throw new Error("Preview and image dimensions must be positive.");
  }

  // Camera previews use aspect-fill. Translate the visible on-screen rectangle back
  // into original image pixels, including the image area cropped offscreen by aspect-fill.
  const scale = Math.max(preview.width / image.width, preview.height / image.height);
  const displayedWidth = image.width * scale;
  const displayedHeight = image.height * scale;
  const hiddenX = (displayedWidth - preview.width) / 2;
  const hiddenY = (displayedHeight - preview.height) / 2;

  const rawX = (frame.x + hiddenX) / scale;
  const rawY = (frame.y + hiddenY) / scale;
  const rawWidth = frame.width / scale;
  const rawHeight = frame.height / scale;
  const paddingX = rawWidth * paddingRatio;
  const paddingY = rawHeight * paddingRatio;

  const left = clamp(rawX - paddingX, 0, image.width);
  const top = clamp(rawY - paddingY, 0, image.height);
  const right = clamp(rawX + rawWidth + paddingX, left + 1, image.width);
  const bottom = clamp(rawY + rawHeight + paddingY, top + 1, image.height);

  return {
    x: Math.floor(left),
    y: Math.floor(top),
    width: Math.max(1, Math.ceil(right) - Math.floor(left)),
    height: Math.max(1, Math.ceil(bottom) - Math.floor(top)),
  };
}

// The iOS preview layer can return this exact normalized ROI after accounting for
// its live video gravity, orientation, and any camera-specific crop.
export function mapNormalizedRoiToImageCrop(roi: Rect, image: Size): Rect {
  if (image.width <= 0 || image.height <= 0) {
    throw new Error("Image dimensions must be positive.");
  }
  const left = clamp(roi.x, 0, 1) * image.width;
  const top = clamp(roi.y, 0, 1) * image.height;
  const right = clamp(roi.x + roi.width, 0, 1) * image.width;
  const bottom = clamp(roi.y + roi.height, 0, 1) * image.height;
  return {
    x: Math.floor(left),
    y: Math.floor(top),
    width: Math.max(1, Math.ceil(right) - Math.floor(left)),
    height: Math.max(1, Math.ceil(bottom) - Math.floor(top)),
  };
}

export function normalizeRoiWithinVisibleRect(roi: Rect, visible: Rect): Rect {
  if (visible.width <= 0 || visible.height <= 0) {
    throw new Error("Visible preview dimensions must be positive.");
  }
  return {
    x: (roi.x - visible.x) / visible.width,
    y: (roi.y - visible.y) / visible.height,
    width: roi.width / visible.width,
    height: roi.height / visible.height,
  };
}

export function rotateLandscapeMetadataRoiToPortrait(roi: Rect): Rect {
  return {
    x: 1 - (roi.y + roi.height),
    y: roi.x,
    width: roi.height,
    height: roi.width,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
