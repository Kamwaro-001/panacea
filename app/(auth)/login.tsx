import { useAuthStore } from "@/stores/useAuthStore";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Screen } from "../../components/common/Screen";

export default function LoginScreen() {
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");

  // Get state and actions from auth store
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!staffId || !pin) {
      Alert.alert("Error", "Please enter your Staff ID and PIN.");
      return;
    }

    try {
      // Call the login action from the store (which calls the API)
      await login({ staffId, pin: pin });

      // On success, redirect to the (app) group
      router.replace("/(app)");
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error instanceof Error ? error.message : "Invalid Staff ID or PIN."
      );
    }
  };

  return (
    <Screen className="justify-center p-6" scrollable={true}>
      <View className="items-center mb-10">
        {/* You can add your <Logo /> component here */}
        <Text className="text-4xl font-sans-bold text-teal-600">Panacea</Text>
        <Text className="text-lg text-gray-600">Staff Access</Text>
      </View>

      <Input
        label="Staff ID"
        placeholder="Enter your staff ID"
        value={staffId}
        onChangeText={setStaffId}
        autoCapitalize="none"
      />

      <Input
        label="PIN"
        placeholder="Enter your PIN"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="numeric"
      />

      <View className="mt-6">
        <Button
          label={isLoading ? "Logging in..." : "Login Securely"}
          onPress={handleLogin}
          isLoading={isLoading}
        />
      </View>
    </Screen>
  );
}
