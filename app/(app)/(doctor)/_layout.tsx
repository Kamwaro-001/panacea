import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function DoctorLayout() {
  const tabColor = "#3B82F6"; // Blue color for doctor
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabColor,
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {/* Index redirects to patients, so hide it from tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* Patients screen - visible in tabs */}
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="hospital-user" size={20} color={color} />
          ),
        }}
      />

      {/* MAR Review tab */}
      <Tabs.Screen
        name="mar-review"
        options={{
          title: "MAR Review",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={24}
              color={color}
            />
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
