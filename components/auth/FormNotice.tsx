import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { colors } from "@/constants/theme";

interface FormNoticeProps {
  message?: string;
  tone?: "error" | "success";
}

/** Inline banner for errors that aren't tied to a single field. */
const FormNotice = ({ message, tone = "error" }: FormNoticeProps) => {
  if (!message) return null;
  const isError = tone === "error";

  return (
    <View
      className={clsx("auth-notice", isError ? "auth-notice-error" : "auth-notice-success")}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={isError ? "alert-circle" : "checkmark-circle"}
        size={18}
        color={isError ? colors.destructive : colors.success}
      />
      <Text className={clsx("auth-notice-text", isError ? "text-destructive" : "text-success")}>{message}</Text>
    </View>
  );
};

export default FormNotice;
