export type PopoverAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PopoverViewport = {
  width: number;
  height: number;
};

export type PopoverLayout = {
  width: number;
  left: number;
  top: number;
  arrowLeft: number;
  placement: "above" | "below";
};

type PopoverLayoutOptions = {
  margin?: number;
  maxWidth?: number;
  height?: number;
  gap?: number;
  arrowSize?: number;
  cornerClearance?: number;
};

/**
 * Positions a mobile popover around an anchor and points its arrow at the
 * anchor's horizontal center. The card and arrow are clamped inside the
 * viewport so annotations near either screen edge remain usable.
 */
export function getPopoverLayout(
  anchor: PopoverAnchor,
  viewport: PopoverViewport,
  options: PopoverLayoutOptions = {},
): PopoverLayout {
  const margin = options.margin ?? 14;
  const maxWidth = options.maxWidth ?? 390;
  const height = options.height ?? 230;
  const gap = options.gap ?? 12;
  const arrowSize = options.arrowSize ?? 18;
  const cornerClearance = options.cornerClearance ?? 18;
  // A rotated square extends half of its diagonal beyond the card edge.
  // Include that footprint so the visible arrow tip, rather than merely the
  // card edge, keeps `gap` points of clearance from the annotation.
  const arrowTipExtent = arrowSize / Math.SQRT2;
  const connectorOffset = gap + arrowTipExtent;

  const width = Math.max(0, Math.min(maxWidth, viewport.width - margin * 2));
  const maxLeft = Math.max(margin, viewport.width - width - margin);
  const maxTop = Math.max(margin, viewport.height - height - margin);

  const anchorCenterX = anchor.x + anchor.width / 2;
  const anchorTop = anchor.y;
  const anchorBottom = anchor.y + anchor.height;
  const spaceAbove = anchorTop - margin;
  const spaceBelow = viewport.height - margin - anchorBottom;
  const requiredSpace = height + connectorOffset;
  const placement =
    spaceBelow >= requiredSpace || (spaceAbove < requiredSpace && spaceBelow >= spaceAbove)
      ? "below"
      : "above";

  const left = clamp(anchorCenterX - width / 2, margin, maxLeft);
  const desiredTop =
    placement === "below"
      ? anchorBottom + connectorOffset
      : anchorTop - height - connectorOffset;
  const top = clamp(desiredTop, margin, maxTop);

  const minArrowLeft = cornerClearance;
  const maxArrowLeft = Math.max(
    minArrowLeft,
    width - cornerClearance - arrowSize,
  );
  const arrowLeft = clamp(
    anchorCenterX - left - arrowSize / 2,
    minArrowLeft,
    maxArrowLeft,
  );

  return { width, left, top, arrowLeft, placement };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
