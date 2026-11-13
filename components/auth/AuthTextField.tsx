import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { colors } from "@/constants/theme";
import { useScrollFocusedIntoView } from "./AuthShell";

/** `className` is merged with the default `auth-input-text` classes of the TextInput. */
interface AuthTextFieldProps extends Omit<TextInputProps, "secureTextEntry"> {
  label: string;
  error?: string;
  /** Red border without an inline message — for when the message is rendered elsewhere. */
  invalid?: boolean;
  /** Renders a show/hide toggle and masks the value. */
  secure?: boolean;
  /** Shown under the input when there is no error. */
  helper?: string;
  /** Optional action on the right of the label, e.g. "Forgot password?". */
  labelAction?: { label: string; onPress: () => void };
}

const AuthTextField = forwardRef<TextInputInstance, AuthTextFieldProps>(
  ({ label, error, invalid, secure, helper, labelAction, onFocus, onBlur, editable = true, className, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const scrollFocusedIntoView = useScrollFocusedIntoView();

    return (
      <View className="auth-field">
        <View className="auth-label-row">
          <Text className="auth-label">{label}</Text>
          {labelAction && (
            <Pressable onPress={labelAction.onPress} hitSlop={8} accessibilityRole="button">
              <Text className="auth-label-action">{labelAction.label}</Text>
            </Pressable>
          )}
        </View>

        <View
          className={clsx(
            "auth-input",
            focused && "auth-input-focused",
            (error || invalid) && "auth-input-error",
            !editable && "opacity-60",
          )}
        >
          <TextInput
            ref={ref}
            className={clsx("auth-input-text", className)}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={secure && !revealed}
            editable={editable}
            accessibilityLabel={label}
            accessibilityHint={error}
            onFocus={(event) => {
              setFocused(true);
              // Covers moving between fields while the keyboard is already open.
              scrollFocusedIntoView?.();
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...inputProps}
          />
          {secure && (
            <Pressable
              onPress={() => setRevealed((value) => !value)}
              hitSlop={10}
              className="auth-input-accessory"
              accessibilityRole="button"
              accessibilityLabel={revealed ? "Hide password" : "Show password"}
            >
              <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {error ? (
          <Text className="auth-error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : helper ? (
          <Text className="auth-helper-sm">{helper}</Text>
        ) : null}
      </View>
    );
  },
);

AuthTextField.displayName = "AuthTextField";

export default AuthTextField;
