import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_300Light,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Routes will be automatically discovered */}
      </Stack>
    </SafeAreaProvider>
  );
}
