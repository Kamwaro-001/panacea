import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/useAuthStore";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_300Light,
    Inter_500Medium,
    Inter_700Bold,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize offline-first system
  useEffect(() => {
    async function init() {
      try {
        console.log("🚀 Initializing app...");
        await initialize();
        setIsInitialized(true);
        console.log("✅ App initialized");
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setIsInitialized(true); // Continue anyway
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Initializing...</Text>
      </View>
    );
  }

  if (fontError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ color: "#ef4444" }}>Failed to load fonts</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />

      <Stack screenOptions={{ headerShown: false }}>
        {/* Routes will be automatically discovered */}
      </Stack>
    </SafeAreaProvider>
  );
}
