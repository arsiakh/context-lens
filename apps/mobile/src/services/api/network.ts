import NetInfo from "@react-native-community/netinfo";
import { isOfflineNetInfoState } from "./networkLogic";

export async function isDeviceOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return isOfflineNetInfoState(state);
  } catch {
    return false;
  }
}
