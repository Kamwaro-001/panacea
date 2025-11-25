import { Stack } from "expo-router";

export default function PatientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitleAlign: "center",
        // headerBackButtonDisplayMode: "minimal",
        headerBackTitle: "Back",
        headerBackTitleStyle: {
          fontFamily: "Inter_500Medium",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerTitle: "Patient Profile",
        }}
      />
    </Stack>
  );
}
