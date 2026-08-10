import { requireOptionalNativeModule } from "expo-modules-core";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraRoiModule {
  convertPreviewRect(viewTag: number, x: number, y: number, width: number, height: number): Promise<NormalizedRect>;
}

const nativeModule = requireOptionalNativeModule<CameraRoiModule>("ContextLensCameraRoi");

export async function convertPreviewRect(
  viewTag: number,
  rect: NormalizedRect
): Promise<NormalizedRect | null> {
  return nativeModule?.convertPreviewRect(viewTag, rect.x, rect.y, rect.width, rect.height) ?? null;
}
