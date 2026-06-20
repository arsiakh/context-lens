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

const viewport = { width: 375, height: 812 };

{
  const layout = getPopoverLayout({ x: 160, y: 100, width: 40, height: 24 }, viewport);
  check("places the card below when enough room remains", layout.placement === "below");
  check("positions a below card after the anchor", layout.top === 136);
  check("points the arrow at the anchor center", layout.arrowLeft === 157);
}

{
  const layout = getPopoverLayout({ x: 160, y: 700, width: 40, height: 24 }, viewport);
  check("places the card above near the bottom", layout.placement === "above");
  check("positions an above card before the anchor", layout.top === 458);
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
