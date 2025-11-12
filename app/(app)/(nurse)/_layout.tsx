import { Stack } from "expo-router";

export default function NurseLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Add 'verify' and 'outcome' screens here later */}
    </Stack>
  );
}
