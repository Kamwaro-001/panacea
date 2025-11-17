import { Stack } from "expo-router";

export default function ScanLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          title: "Verify Administration",
          headerBackTitle: "Scan",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="link-patient"
        options={{
          title: "Link to Patient",
          headerBackTitle: "Scan",
          headerTitleAlign: "center",
        }}
      />
    </Stack>
  );
}
