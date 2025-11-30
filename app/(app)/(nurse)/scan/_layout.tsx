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
      <Stack.Screen
        name="outcome"
        options={{
          title: "Select Outcome",
          headerBackTitle: "Verify",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="reason"
        options={{
          title: "Reason & Notes",
          headerBackTitle: "Outcome",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="record-final"
        options={{
          title: "Record Administration",
          headerBackTitle: "Reason",
          headerTitleAlign: "center",
        }}
      />
    </Stack>
  );
}
