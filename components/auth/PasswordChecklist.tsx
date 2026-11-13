import { useEffect, useRef } from "react";
import { Keyboard, Text, View, type ViewInstance } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { colors } from "@/constants/theme";
import { getPasswordChecks } from "@/lib/auth";
import { useRevealInShell } from "./AuthShell";

interface PasswordChecklistProps {
  password: string;
  /** After a failed submit, unmet requirements turn red instead of staying neutral. */
  showUnmet?: boolean;
  /**
   * Why the password was rejected for a reason the checklist can't show —
   * e.g. found in a data breach, or a server-side rule. Rendered in red under the checklist.
   */
  issue?: string;
}

/** Live password requirements plus a message area for any other rejection reason. */
const PasswordChecklist = ({ password, showUnmet, issue }: PasswordChecklistProps) => {
  const issueRef = useRef<ViewInstance>(null);
  const reveal = useRevealInShell();

  // A new rejection appears right under the field — usually behind the open keyboard on a phone.
  // Close the keyboard and scroll the message into view so it can't be missed.
  useEffect(() => {
    if (!issue) return;
    if (__DEV__) console.log("[auth] password issue rendered:", issue);
    Keyboard.dismiss();
    reveal?.(issueRef.current);
  }, [issue, reveal]);

  return (
  <View className="gap-2">
    <View className="auth-checks" accessibilityLabel="Password requirements">
      {getPasswordChecks(password).map((check) => {
        const failed = showUnmet && !check.passed;
        return (
          <View
            key={check.id}
            className={clsx("auth-check", check.passed && "auth-check-passed", failed && "auth-check-failed")}
            accessibilityLabel={`${check.label}: ${check.passed ? "met" : "not met"}`}
          >
            <Ionicons
              name={check.passed ? "checkmark" : failed ? "close" : "ellipse-outline"}
              size={12}
              color={check.passed ? colors.success : failed ? colors.destructive : colors.mutedForeground}
            />
            <Text className={clsx("auth-check-text", check.passed && "text-success", failed && "text-destructive")}>
              {check.label}
            </Text>
          </View>
        );
      })}
    </View>

    {issue ? (
      <View
        ref={issueRef}
        className="auth-password-issue"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name="alert-circle" size={16} color={colors.destructive} />
        <Text className="auth-password-issue-text">{issue}</Text>
      </View>
    ) : null}
  </View>
  );
};

export default PasswordChecklist;
