import { TextInput, View, Text, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <View className="w-full mb-4">
      <Text className="text-sm font-sans-bold text-gray-700 mb-2">{label}</Text>
      <TextInput
        className="w-full h-14 bg-white border border-gray-300 rounded-lg px-4 text-base"
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
}
