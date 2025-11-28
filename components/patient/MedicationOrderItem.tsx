import { MedicationOrder } from "@/types";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface MedicationOrderItemProps {
  order: MedicationOrder;
}

export function MedicationOrderItem({ order }: MedicationOrderItemProps) {
  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "active":
  //       return "text-green-600 bg-green-50";
  //     case "completed":
  //       return "text-blue-600 bg-blue-50";
  //     case "stopped":
  //       return "text-red-600 bg-red-50";
  //     default:
  //       return "text-gray-600 bg-gray-50";
  //   }
  // };

  return (
    <View className="p-3 rounded-lg border border-gray-200">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-sm font-bold text-gray-900 flex-1">
          {order.drug} • {order.dose}
        </Text>
        {/* TODO: confirm whether status will be shown on patient profile page */}
        {/* <View className={`px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
          <Text className="text-xs font-semibold capitalize">
            {order.status}
          </Text>
        </View> */}
      </View>

      <View className="mb-1">
        <Text className="text-xs text-gray-600">
          Route {order.route} • Frequency {order.frequency}
        </Text>
      </View>

      {order.prescriber && (
        <View className="flex-row items-center pt-1 border-t border-gray-100">
          <Feather name="user-check" size={12} color="#6B7280" />
          <Text className="text-xs text-gray-600 ml-1">
            Prescribed by:{" "}
            <Text className="font-medium">{order.prescriber.name}</Text>{" "}
            <Text className="text-gray-500 capitalize">
              ({order.prescriber.role})
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}
