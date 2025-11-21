import { Redirect } from "expo-router";

export default function DoctorHomeScreen() {
  // Redirect to patients page within doctor tabs
  return <Redirect href={"/(app)/(doctor)/patients" as any} />;
}
