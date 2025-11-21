import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../stores/useAuthStore";

export default function AppLayout() {
  const { token } = useAuthStore();

  // 1. If the user is not logged in, redirect away from this
  // entire (app) group to the login screen.
  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  // 2. If they ARE logged in, render the main app Stack
  // which contains all the authenticated screens.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(nurse)" />
      <Stack.Screen name="(doctor)" />
      {/* <Stack.Screen name="(admin)" /> */}

      {/* We make ward-select a modal for a cleaner UI flow */}
      <Stack.Screen name="ward-select" options={{ presentation: "modal" }} />
    </Stack>
  );
}
