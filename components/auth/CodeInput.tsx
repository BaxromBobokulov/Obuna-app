import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputInstance } from "react-native";
import clsx from "clsx";
import { CODE_LENGTH } from "@/lib/auth";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered (typed, pasted or autofilled). */
  onComplete?: (value: string) => void;
  error?: string;
  editable?: boolean;
}

/**
 * Six digit boxes backed by one hidden TextInput, so paste and
 * SMS/email one-time-code autofill work on both platforms.
 */
const CodeInput = ({ value, onChange, onComplete, error, editable = true }: CodeInputProps) => {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH) onComplete?.(digits);
  };

  return (
    <View className="auth-field">
      <Pressable
        onPress={() => inputRef.current?.focus()}
        className="auth-code-row"
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index];
          const isActive = focused && index === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <View
              key={index}
              className={clsx(
                "auth-code-cell",
                digit && "auth-code-cell-filled",
                isActive && "auth-code-cell-active",
                error && "auth-input-error",
              )}
            >
              <Text className="auth-code-digit">{digit ?? ""}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        caretHidden
        accessibilityLabel="Verification code"
        accessibilityHint={error}
        className="auth-code-hidden-input"
      />

      {error ? (
        <Text className="auth-error text-center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default CodeInput;
