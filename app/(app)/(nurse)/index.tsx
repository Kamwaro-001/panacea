import { Redirect } from "expo-router";

export default function NurseHomeScreen() {
  // Redirect to patients page within nurse tabs
  return <Redirect href="/(app)/(nurse)/patients" />;
}
