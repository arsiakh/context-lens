import { getPopoverLayout } from "./getPopoverLayout";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`PASS ✓ ${name}`);
  } else {
    failed++;
    console.log(`FAIL ✗ ${name}`);
  }
}

function closeTo(actual: number, expected: number, tolerance = 0.001) {
  return Math.abs(actual - expected) <= tolerance;
}

const viewport = { width: 375, height: 812 };
const arrowTipExtent = 18 / Math.SQRT2;
const anchorClearance = 5;

{
  const anchor = { x: 160, y: 100, width: 40, height: 24 };
  const layout = getPopoverLayout(anchor, viewport);
  check("places the card below when enough room remains", layout.placement === "below");
  check(
    "keeps the lower arrow tip clear of the annotation",
    closeTo(layout.top - arrowTipExtent, anchor.y + anchor.height + anchorClearance),
  );
  check("points the arrow at the anchor center", layout.arrowLeft === 157);
}

{
  const anchor = { x: 160, y: 700, width: 40, height: 24 };
  const layout = getPopoverLayout(anchor, viewport);
  check("places the card above near the bottom", layout.placement === "above");
  check(
    "keeps the upper arrow tip clear of the annotation",
    closeTo(layout.top + 230 + arrowTipExtent, anchor.y - anchorClearance),
  );
}

{
  const layout = getPopoverLayout({ x: 0, y: 120, width: 8, height: 20 }, viewport);
  check("keeps a left-edge card within the viewport", layout.left === 14);
  check("clamps the arrow away from the left corner", layout.arrowLeft === 18);
}

{
  const layout = getPopoverLayout({ x: 367, y: 120, width: 8, height: 20 }, viewport);
  check("keeps a right-edge card within the viewport", layout.left === 14);
  check("clamps the arrow away from the right corner", layout.arrowLeft === 311);
}

{
  const layout = getPopoverLayout(
    { x: 170, y: 220, width: 35, height: 20 },
    { width: 375, height: 430 },
  );
  check("uses the roomier side when neither side fully fits", layout.placement === "above");
  check("keeps a constrained card vertically onscreen", layout.top === 14);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
