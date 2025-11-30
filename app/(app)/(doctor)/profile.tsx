import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDoctorWardStore } from "@/stores/useDoctorWardStore";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";

export default function DoctorProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const selectedWards = useDoctorWardStore((state) => state.selectedWards);

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  const handleChangeWards = () => {
    router.push({
      pathname: "/(app)/ward-select",
      params: { returnTo: "patients" },
    } as any);
  };

  if (!user) {
    return (
      <Screen className="justify-center items-center">
        <Text className="text-lg text-gray-600">Loading profile...</Text>
      </Screen>
    );
  }

  const wardNames = selectedWards.map((w) => w.name).join(", ");

  return (
    <Screen className="justify-center items-center px-6">
      {/* Avatar Icon */}
      <View className="w-24 h-24 rounded-full bg-teal-100 items-center justify-center mb-6">
        <Feather name="user" size={48} color="#14B8A6" />
      </View>

      {/* Profile Details - Centered */}
      <View className="items-center mb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          {user.name}
        </Text>
        <Text className="text-base text-gray-600 mb-1">
          Staff ID: {user.staffId}
        </Text>
        <Text className="text-base text-gray-600 mb-1 capitalize">
          Role: {user.role}
        </Text>
        <Text className="text-base text-gray-600 text-center">
          {selectedWards.length > 0
            ? `Wards: ${wardNames}`
            : "No wards selected"}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="w-full max-w-xs">
        <Button label="Manage Wards" onPress={handleChangeWards} />
        <View className="h-3" />
        <Button label="Log Out" onPress={handleLogout} />
      </View>
    </Screen>
  );
}
