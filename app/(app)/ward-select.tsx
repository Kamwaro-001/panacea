import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/common/Screen";
import { Button } from "../../components/common/Button";
import { useWardStore } from "../../stores/useWardStore";
import { useState } from "react";

// MOCK DATA: Replace with an API call
const MOCK_WARDS = [
  { id: "ward_1", name: "Kenya Ward" },
  { id: "ward_2", name: "ICU" },
  { id: "ward_3", name: "Maternity" },
];

export default function WardSelectScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const { selectWard } = useWardStore();

  const handleConfirm = () => {
    if (selected) {
      selectWard(selected);
      // After selecting, redirect back to the (app) root.
      // The (app)/_layout.tsx will re-run and redirect to the nurse flow.
      router.replace("/(app)");
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-sans-bold text-center mb-8">
          Select Your Ward
        </Text>

        <View className="space-y-3">
          {MOCK_WARDS.map((ward) => (
            <Pressable
              key={ward.id}
              onPress={() => setSelected(ward.id)}
              className={`
                w-full p-6 border rounded-lg
                ${selected === ward.id ? "bg-teal-100 border-teal-600" : "bg-white border-gray-300"}
              `}
            >
              <Text className="text-lg font-sans-bold">{ward.name}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-10">
          <Button
            label="Confirm Ward"
            onPress={handleConfirm}
            disabled={!selected} // Button is disabled until a ward is selected
          />
        </View>
      </View>
    </Screen>
  );
}
