import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Screens will be automatically discovered from files in this directory */}
    </Stack>
  );
}
