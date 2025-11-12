import { View, Text, Pressable } from "react-native";
import { Screen } from "../../../components/common/Screen";
import { Button } from "../../../components/common/Button";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useWardStore } from "../../../stores/useWardStore";
import { router } from "expo-router";

// You'll need an icon library
// Run: npx expo install @expo/vector-icons
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function NurseHomeScreen() {
  const { user, logout } = useAuthStore();
  const { selectedWard } = useWardStore();

  const handleScanPress = () => {
    // TODO: Navigate to the camera/scan screen
    alert("Scanning... (Not yet implemented)");
    // We'll eventually navigate: router.push('/(app)/(nurse)/verify');
  };

  // const handleLogout = ()_layout => {
  const handleLogout = () => {
    // TODO: Implement a proper logout/ward change flow
    logout();
    // This redirect isn't working as expected in Expo Router 3
    // A full app reload might be needed, or clearing stores.
    router.replace("/(auth)/login");
  };

  return (
    <Screen className="justify-between">
      <View>
        <Text className="text-2xl font-sans-bold">Hello, {user?.staffId}</Text>
        <Text className="text-lg text-gray-600">Ward: {selectedWard}</Text>
      </View>

      <View className="items-center">
        <Pressable
          onPress={handleScanPress}
          className="w-60 h-60 bg-teal-600 rounded-full items-center justify-center active:bg-teal-700"
        >
          <MaterialCommunityIcons
            name="barcode-scan"
            size={120}
            color="white"
          />
          <Text className="text-white text-2xl font-sans-bold mt-2">
            Scan Patient
          </Text>
        </Pressable>
      </View>

      <Button label="Logout / Change Ward" onPress={handleLogout} />
    </Screen>
  );
}
