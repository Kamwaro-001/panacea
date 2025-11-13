import {
  Feather,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function NurseLayout() {
  const tabColor = "#14B8A6";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabColor,
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        // tabBarStyle: { paddingBottom: 5, paddingTop: 5 },
      }}
    >
      {/* Index redirects to patients, so hide it from tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* Patients stack - visible in tabs */}
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="hospital-user" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="barcode-scan"
              size={20}
              color={color}
            />
          ),
        }}
      />
      {/* follow ups tab */}
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: "Follow-Ups",
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: true,
          headerTitle: "My Profile",
          headerTitleAlign: "center",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
