import { Alert, Platform } from "react-native";

/**
 * Cross-platform alert utility that works on web and native platforms
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }[]
) => {
  if (Platform.OS === "web") {
    // Fallback for web - use window.confirm or alert
    const fullMessage = message ? `${title}\n\n${message}` : title;

    if (buttons && buttons.length > 1) {
      // For multi-button alerts, use confirm
      if (window.confirm(fullMessage)) {
        const okButton = buttons.find((btn) => btn.style !== "cancel");
        okButton?.onPress?.();
      } else {
        const cancelButton = buttons.find((btn) => btn.style === "cancel");
        cancelButton?.onPress?.();
      }
    } else {
      // For single button or no buttons, use alert
      window.alert(fullMessage);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // Native platform - use React Native Alert
    Alert.alert(title, message, buttons);
  }
};

/**
 * Simple alert with just OK button
 */
export const showSimpleAlert = (title: string, message?: string) => {
  showAlert(title, message, [{ text: "OK" }]);
};

/**
 * Confirmation alert with OK and Cancel buttons
 */
export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showAlert(title, message, [
    {
      text: "Cancel",
      style: "cancel",
      onPress: onCancel,
    },
    {
      text: "OK",
      onPress: onConfirm,
    },
  ]);
};
