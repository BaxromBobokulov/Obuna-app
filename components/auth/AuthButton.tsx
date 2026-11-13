import { ActivityIndicator, Pressable, Text } from "react-native";
import clsx from "clsx";
import { colors } from "@/constants/theme";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

const AuthButton = ({ label, onPress, loading, disabled, variant = "primary" }: AuthButtonProps) => {
  const isPrimary = variant === "primary";
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={clsx(
        isPrimary ? "auth-button" : "auth-secondary-button",
        isPrimary && inactive && "auth-button-disabled",
        "active:opacity-80",
      )}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#ffffff" : colors.accent} />
      ) : (
        <Text className={isPrimary ? "auth-button-text" : "auth-secondary-button-text"}>{label}</Text>
      )}
    </Pressable>
  );
};

export default AuthButton;
