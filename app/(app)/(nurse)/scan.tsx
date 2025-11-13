// only the text scan patient for now
import { Text } from "react-native";
import { Screen } from "@/components/common/Screen";

export default function ScanScreen() {
  return (
    <Screen className="justify-center items-center">
      <Text className="text-2xl font-sans-bold">Scan Patient Screen</Text>
      <Text className="text-lg text-gray-600 mt-4">
        (Camera functionality to be implemented)
      </Text>
    </Screen>
  );
}
