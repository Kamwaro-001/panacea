import { Screen } from "@/components/common/Screen";
import { Text, View } from "react-native";

export default function MARReviewScreen() {
  return (
    <Screen className="justify-center items-center px-6">
      <View className="items-center">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          MAR Review
        </Text>
        <Text className="text-base text-gray-600 text-center">
          Medication Administration Record review feature coming soon...
        </Text>
      </View>
    </Screen>
  );
}
