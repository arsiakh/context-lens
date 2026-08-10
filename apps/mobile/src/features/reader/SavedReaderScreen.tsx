import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import ReaderScreen from "./ReaderScreen";

export default function SavedReaderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "SavedReader">>();
  return <ReaderScreen savedNote={route.params.savedNote} />;
}
