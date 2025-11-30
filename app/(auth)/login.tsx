import { useAuthStore } from "@/stores/useAuthStore";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Text, View } from "react-native";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Screen } from "../../components/common/Screen";

export default function LoginScreen() {
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");

  // Get state and actions from auth store
  const { login, isLoading, isInitialSyncing } = useAuthStore();

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
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={100}>
        <View className="items-center mb-10">
          <Image
            source={require("@/assets/images/panacea-icon.png")}
            style={{ width: 112, height: 112, marginBottom: 1 }}
            resizeMode="contain"
          />
          <Text className="text-4xl font-inter-bold text-teal-600">
            PANACEA
          </Text>
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
            label={
              isInitialSyncing
                ? "Downloading data..."
                : isLoading
                  ? "Logging in..."
                  : "Login"
            }
            onPress={handleLogin}
            isLoading={isLoading || isInitialSyncing}
          />
        </View>

        {isInitialSyncing && (
          <View className="mt-4 items-center">
            <Text className="text-sm text-gray-600 text-center">
              Please wait while we download your ward data.{"\n"}
              This only happens on first login.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
