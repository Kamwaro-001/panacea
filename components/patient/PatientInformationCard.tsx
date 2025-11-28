import { PatientProfile } from "@/types";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface PatientInformationCardProps {
  patient: PatientProfile;
}

const InfoRow = ({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View
    className={`flex-row justify-between py-1 ${!isLast ? "border-b border-gray-200" : ""}`}
  >
    <Text className="text-gray-600">{label}:</Text>
    <Text className="font-semibold text-gray-900 flex-1 text-right">
      {value}
    </Text>
  </View>
);

export function PatientInformationCard({
  patient,
}: PatientInformationCardProps) {
  const infoItems = [
    patient.ward && { label: "Ward", value: patient.ward.name },
    { label: "Bed Number", value: patient.bedNumber },
    { label: "Diagnosis", value: patient.diagnosis },
    patient.attendingDoctor && {
      label: "Attending Doctor",
      value: patient.attendingDoctor.name,
    },
    patient.attendingConsultant && {
      label: "Consultant",
      value: patient.attendingConsultant.name,
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <View className="bg-white rounded-lg p-6 mb-4 shadow-sm">
      <View className="flex-row items-center mb-4">
        <Feather name="user" size={20} color="#14B8A6" />
        <Text className="text-lg font-bold text-gray-900 ml-2">
          Patient Information
        </Text>
      </View>

      <View className="space-y-3">
        {infoItems.map((item, index) => (
          <InfoRow
            key={item.label}
            label={item.label}
            value={item.value}
            isLast={index === infoItems.length - 1}
          />
        ))}
      </View>
    </View>
  );
}
