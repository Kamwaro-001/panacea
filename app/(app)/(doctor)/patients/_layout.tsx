import { Stack } from "expo-router";

export default function DoctorPatientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Patient Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
