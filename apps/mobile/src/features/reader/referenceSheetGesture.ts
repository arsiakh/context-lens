export const REFERENCE_SHEET_DISMISS_DISTANCE = 80;
export const REFERENCE_SHEET_DISMISS_VELOCITY = 0.75;

export function shouldDismissReferenceSheet(distanceY: number, velocityY: number): boolean {
  return distanceY > REFERENCE_SHEET_DISMISS_DISTANCE
    || (distanceY > 0 && velocityY > REFERENCE_SHEET_DISMISS_VELOCITY);
}
