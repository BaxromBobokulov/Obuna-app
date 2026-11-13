import { useRef, useState } from "react";
import { Pressable, Text, View, type TextInputInstance } from "react-native";
import { Link } from "expo-router";
import { useSignIn } from "@clerk/expo";
import AuthShell from "@/components/auth/AuthShell";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthButton from "@/components/auth/AuthButton";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import FormNotice from "@/components/auth/FormNotice";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import CodeInput from "@/components/auth/CodeInput";
import ResendCode from "@/components/auth/ResendCode";
import {
  hasErrors,
  maskEmail,
  normalizeEmail,
  toAuthFailure,
  validateCode,
  validateEmail,
  validateExistingPassword,
  validateNewPassword,
  type AuthFailure,
  type AuthFieldErrors,
} from "@/lib/auth";

/**
 * credentials   → email + password
 * second-factor → code from email / SMS / authenticator (new device or 2-step verification)
 * reset-code    → code emailed for "Forgot password?"
 * reset-password→ choose a new password
 */
type Step = "credentials" | "second-factor" | "reset-code" | "reset-password";
type SecondFactor = "email_code" | "phone_code" | "totp";

const EMPTY_FAILURE: AuthFailure = { fields: {} };

const SECOND_FACTOR_COPY: Record<SecondFactor, { title: string; subtitle: (destination: string) => string }> = {
  email_code: {
    title: "Confirm it's you",
    subtitle: (destination) => `For your security, we sent a 6-digit code to ${destination}.`,
  },
  phone_code: {
    title: "Confirm it's you",
    subtitle: (destination) => `We texted a 6-digit code to ${destination}.`,
  },
  totp: {
    title: "Two-step verification",
    subtitle: () => "Open your authenticator app and enter the 6-digit code.",
  },
};

export default function SignIn() {
  const { signIn, fetchStatus } = useSignIn();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  /** Set on first submit, so unmet checklist items turn red only after the user has tried. */
  const [newPasswordAttempted, setNewPasswordAttempted] = useState(false);
  /** The new password last sent to the server. A server rejection is shown only while the field still holds it. */
  const [submittedNewPassword, setSubmittedNewPassword] = useState("");
  const [secondFactor, setSecondFactor] = useState<SecondFactor>("email_code");
  const [factorDestination, setFactorDestination] = useState("");
  const [failure, setFailure] = useState<AuthFailure>(EMPTY_FAILURE);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const passwordRef = useRef<TextInputInstance>(null);

  const busy = submitting || googleBusy || fetchStatus === "fetching";
  const newPasswordIssue = newPassword === submittedNewPassword ? failure.fields.password : undefined;

  const clearFieldError = (field: keyof AuthFieldErrors) =>
    setFailure((current) =>
      current.fields[field] || current.form ? { fields: { ...current.fields, [field]: undefined } } : current,
    );

  /** Runs an async action with shared loading + error reset. */
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setSubmitting(true);
    setFailure(EMPTY_FAILURE);
    try {
      await action();
    } catch (error) {
      setFailure(toAuthFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  /** Activates the session; the root layout's route guard then moves the user into the app. */
  const finishSignIn = async () => {
    const { error } = await signIn.finalize();
    if (error) setFailure(toAuthFailure(error));
  };

  const goTo = (next: Step) => {
    setCode("");
    setFailure(EMPTY_FAILURE);
    setStep(next);
  };

  // ── Second factor ────────────────────────────────────────────────

  const sendSecondFactorCode = async (strategy: SecondFactor): Promise<boolean> => {
    if (strategy === "totp") return true;
    const { error } = strategy === "email_code" ? await signIn.mfa.sendEmailCode() : await signIn.mfa.sendPhoneCode();
    if (error) {
      setFailure(toAuthFailure(error));
      return false;
    }
    return true;
  };

  const startSecondFactor = async () => {
    const factors = signIn.supportedSecondFactors ?? [];
    const preferred = (["totp", "phone_code", "email_code"] as const).find((strategy) =>
      factors.some((factor) => factor.strategy === strategy),
    );
    // New-device checks only offer email codes; 2-step verification prefers the authenticator app.
    const strategy: SecondFactor | undefined =
      signIn.status === "needs_client_trust" && factors.some((f) => f.strategy === "email_code")
        ? "email_code"
        : preferred;

    if (!strategy) {
      setFailure({ fields: {}, form: "This account needs a verification method that isn't supported in the app yet." });
      return;
    }

    const factor = factors.find((f) => f.strategy === strategy) as { safeIdentifier?: string } | undefined;
    setFactorDestination(
      factor?.safeIdentifier ?? (strategy === "email_code" ? maskEmail(normalizeEmail(email)) : "your phone"),
    );
    setSecondFactor(strategy);

    if (await sendSecondFactorCode(strategy)) goTo("second-factor");
  };

  const verifySecondFactor = (value = code) =>
    run(async () => {
      const codeError = validateCode(value);
      if (codeError) {
        setFailure({ fields: { code: codeError } });
        return;
      }

      const { error } =
        secondFactor === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code: value })
          : secondFactor === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code: value })
            : await signIn.mfa.verifyTOTP({ code: value });

      if (error) {
        setFailure(toAuthFailure(error));
        setCode("");
        return;
      }
      if (signIn.status === "complete") await finishSignIn();
      else setFailure({ fields: {}, form: "We couldn't finish signing you in. Please start over." });
    });

  // ── Email + password ─────────────────────────────────────────────

  const handleSignIn = () =>
    run(async () => {
      const fields: AuthFieldErrors = {
        email: validateEmail(email),
        password: validateExistingPassword(password),
      };
      if (hasErrors(fields)) {
        setFailure({ fields });
        return;
      }

      const { error } = await signIn.password({ emailAddress: normalizeEmail(email), password });
      if (error) {
        setFailure(toAuthFailure(error));
        return;
      }

      switch (signIn.status) {
        case "complete":
          await finishSignIn();
          break;
        case "needs_client_trust":
        case "needs_second_factor":
          await startSecondFactor();
          break;
        default:
          setFailure({ fields: {}, form: "We couldn't sign you in with a password. Try resetting it below." });
      }
    });

  // ── Forgot password ──────────────────────────────────────────────

  const sendResetCode = async (): Promise<boolean> => {
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setFailure(toAuthFailure(error));
      return false;
    }
    return true;
  };

  const handleForgotPassword = () =>
    run(async () => {
      const emailError = validateEmail(email);
      if (emailError) {
        setFailure({ fields: { email: "Enter your email above and we'll send you a reset code." } });
        return;
      }

      const { error } = await signIn.create({ identifier: normalizeEmail(email) });
      if (error) {
        setFailure(toAuthFailure(error));
        return;
      }
      if (await sendResetCode()) goTo("reset-code");
    });

  const verifyResetCode = (value = code) =>
    run(async () => {
      const codeError = validateCode(value);
      if (codeError) {
        setFailure({ fields: { code: codeError } });
        return;
      }

      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: value });
      if (error) {
        setFailure(toAuthFailure(error));
        setCode("");
        return;
      }
      setNewPassword("");
      goTo("reset-password");
    });

  const submitNewPassword = () =>
    run(async () => {
      setNewPasswordAttempted(true);
      setSubmittedNewPassword(newPassword);
      // Basic rules are shown by the checklist turning red, so no duplicate text message here.
      if (validateNewPassword(newPassword)) return;

      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (error) {
        setFailure(toAuthFailure(error));
        return;
      }

      if (signIn.status === "complete") await finishSignIn();
      else if (signIn.status === "needs_second_factor") await startSecondFactor();
      else setFailure({ fields: {}, form: "Your password was updated. Please sign in again." });
    });

  const startOver = async () => {
    await signIn.reset();
    setPassword("");
    goTo("credentials");
  };

  // ── Render ───────────────────────────────────────────────────────

  if (step === "second-factor") {
    const copy = SECOND_FACTOR_COPY[secondFactor];
    return (
      <AuthShell title={copy.title} subtitle={copy.subtitle(factorDestination)}>
        <View className="auth-form">
          <FormNotice message={failure.form} />
          <CodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              clearFieldError("code");
            }}
            onComplete={verifySecondFactor}
            error={failure.fields.code}
            editable={!busy}
          />
          <AuthButton label="Continue" onPress={() => verifySecondFactor()} loading={busy} />
          {secondFactor !== "totp" && <ResendCode onResend={() => sendSecondFactorCode(secondFactor)} />}
          <BackLink label="Back to sign in" onPress={startOver} />
        </View>
      </AuthShell>
    );
  }

  if (step === "reset-code") {
    return (
      <AuthShell
        title="Reset your password"
        subtitle={`We sent a 6-digit code to ${maskEmail(normalizeEmail(email))}. Enter it to choose a new password.`}
      >
        <View className="auth-form">
          <FormNotice message={failure.form} />
          <CodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              clearFieldError("code");
            }}
            onComplete={verifyResetCode}
            error={failure.fields.code}
            editable={!busy}
          />
          <AuthButton label="Continue" onPress={() => verifyResetCode()} loading={busy} />
          <ResendCode onResend={sendResetCode} />
          <BackLink label="Back to sign in" onPress={startOver} />
        </View>
      </AuthShell>
    );
  }

  if (step === "reset-password") {
    return (
      <AuthShell title="Choose a new password" subtitle="You'll use it the next time you sign in on any device.">
        <View className="auth-form">
          <FormNotice message={failure.form} />
          <View className="gap-3">
            <AuthTextField
              label="New password"
              className="ml-3 h-14"
              placeholder="Create a new password"
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
              }}
              invalid={!!newPasswordIssue || (newPasswordAttempted && !!validateNewPassword(newPassword))}
              secure
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submitNewPassword}
              editable={!busy}
            />
            <PasswordChecklist
              password={newPassword}
              showUnmet={newPasswordAttempted}
              issue={newPasswordIssue}
            />
          </View>
          <AuthButton label="Update password" onPress={submitNewPassword} loading={busy} />
          <Text className="auth-legal">For your security, you&apos;ll be signed out on your other devices.</Text>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      // subtitle="Sign in to keep every subscription and renewal in one place."
      footer={
        <View className="auth-link-row">
          <Text className="auth-link-copy">New to Sandq?</Text>
          <Link href="/sign-up" replace asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text className="auth-link">Create an account</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View className="auth-form">
        <FormNotice message={failure.form} />

        <GoogleAuthButton
          label="Continue with Google"
          disabled={busy}
          onBusyChange={setGoogleBusy}
          onError={(message) => setFailure({ fields: {}, form: message })}
        />

        <AuthTextField
          label="Email"
          className="ml-3 h-14"
          placeholder="Enter your email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearFieldError("email");
          }}
          error={failure.fields.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
          editable={!busy}
        />

        <AuthTextField
          ref={passwordRef}
          className="ml-3 h-14"
          label="Password"
          labelAction={{ label: "Forgot password?", onPress: handleForgotPassword }}
          placeholder="Enter your password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearFieldError("password");
          }}
          error={failure.fields.password}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          editable={!busy}
        />

        <AuthButton label="Sign in" onPress={handleSignIn} loading={busy} />
      </View>
    </AuthShell>
  );
}

const BackLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" className="items-center">
    <Text className="auth-link">{label}</Text>
  </Pressable>
);
