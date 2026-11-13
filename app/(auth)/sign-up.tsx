import { useRef, useState } from "react";
import { Pressable, Text, View, type TextInputInstance } from "react-native";
import { Link } from "expo-router";
import { useSignUp } from "@clerk/expo";
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
  validateName,
  validateNewPassword,
  type AuthFailure,
  type AuthFieldErrors,
} from "@/lib/auth";

type Step = "details" | "verify";

const EMPTY_FAILURE: AuthFailure = { fields: {} };

export default function SignUp() {
  const { signUp, fetchStatus } = useSignUp();

  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<AuthFailure>(EMPTY_FAILURE);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  /** Set on first submit, so unmet checklist items turn red only after the user has tried. */
  const [passwordAttempted, setPasswordAttempted] = useState(false);
  /** The password last sent to the server. A server rejection is shown only while the field still holds it. */
  const [submittedPassword, setSubmittedPassword] = useState("");

  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const busy = submitting || googleBusy || fetchStatus === "fetching";
  const passwordIssue = password === submittedPassword ? failure.fields.password : undefined;

  const clearFieldError = (field: keyof AuthFieldErrors) =>
    setFailure((current) =>
      current.fields[field] || current.form ? { fields: { ...current.fields, [field]: undefined } } : current,
    );

  /** Session is created here; the root layout's route guard then moves the user into the app. */
  const finishSignUp = async () => {
    const { error } = await signUp.finalize();
    if (error) setFailure(toAuthFailure(error, "sign-up"));
  };

  const sendVerificationEmail = async (): Promise<boolean> => {
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setFailure(toAuthFailure(error, "sign-up"));
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    if (busy) return;

    setPasswordAttempted(true);
    setSubmittedPassword(password);
    // Basic password rules are shown by the checklist itself, so they don't get a text message.
    const fields: AuthFieldErrors = {
      firstName: validateName(firstName),
      email: validateEmail(email),
    };
    if (hasErrors(fields) || validateNewPassword(password)) {
      setFailure({ fields });
      return;
    }

    setSubmitting(true);
    setFailure(EMPTY_FAILURE);
    try {
      const emailAddress = normalizeEmail(email);
      let { error } = await signUp.password({ emailAddress, password, firstName: firstName.trim() });

      // If names aren't enabled for this instance, the API rejects first_name — retry without it.
      if (error) {
        const { fields } = toAuthFailure(error, "sign-up");
        if (fields.firstName && !fields.email && !fields.password) {
          ({ error } = await signUp.password({ emailAddress, password }));
        }
      }

      if (error) {
        setFailure(toAuthFailure(error, "sign-up"));
        return;
      }

      if (signUp.status === "complete") {
        await finishSignUp();
        return;
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        if (await sendVerificationEmail()) {
          setCode("");
          setStep("verify");
        }
        return;
      }

      setFailure({ fields: {}, form: "We need a bit more information to finish creating your account." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (value = code) => {
    if (busy) return;

    const codeError = validateCode(value);
    if (codeError) {
      setFailure({ fields: { code: codeError } });
      return;
    }

    setSubmitting(true);
    setFailure(EMPTY_FAILURE);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: value });
      if (error) {
        setFailure(toAuthFailure(error, "sign-up"));
        setCode("");
        return;
      }

      if (signUp.status === "complete") {
        await finishSignUp();
      } else {
        setFailure({ fields: {}, form: "Your email is verified, but we couldn't finish setup. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = async () => {
    await signUp.reset();
    setCode("");
    setFailure(EMPTY_FAILURE);
    setStep("details");
  };

  if (step === "verify") {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={
          <>
            We sent a 6-digit code to <Text className="font-sans-bold text-primary">{maskEmail(normalizeEmail(email))}</Text>
            . Enter it to activate your account.
          </>
        }
      >
        <View className="auth-form">
          <FormNotice message={failure.form} />
          <CodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              clearFieldError("code");
            }}
            onComplete={handleVerify}
            error={failure.fields.code}
            editable={!busy}
          />
          <AuthButton label="Verify email" onPress={() => handleVerify()} loading={busy} />
          <ResendCode onResend={sendVerificationEmail} />
          <Pressable onPress={handleChangeEmail} hitSlop={8} accessibilityRole="button" className="items-center">
            <Text className="auth-link">Use a different email</Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      // subtitle="Track every subscription, see renewals coming, and stop paying for what you don't use."
      footer={
        <View className="auth-link-row">
          <Text className="auth-link-copy">Already have an account?</Text>
          <Link href="/sign-in" replace asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text className="auth-link">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View className="auth-form">
        <FormNotice message={failure.form} />

        <GoogleAuthButton
          label="Sign up with Google"
          disabled={busy}
          onBusyChange={setGoogleBusy}
          onError={(message) => setFailure({ fields: {}, form: message })}
        />

        <AuthTextField
          className="ml-3 h-14"
          label="First name"
          placeholder="What should we call you?"
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            clearFieldError("firstName");
          }}
          error={failure.fields.firstName}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
          editable={!busy}
        />

        <AuthTextField
          className="ml-3 h-14"
          ref={emailRef}
          label="Email"
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

        <View className="gap-3">
          <AuthTextField
            className="ml-3 h-14"
            ref={passwordRef}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
            }}
            invalid={!!passwordIssue || (passwordAttempted && !!validateNewPassword(password))}
            secure
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleCreateAccount}
            editable={!busy}
          />
          <PasswordChecklist password={password} showUnmet={passwordAttempted} issue={passwordIssue} />
        </View>

        <AuthButton label="Create account" onPress={handleCreateAccount} loading={busy} />
      </View>
    </AuthShell>
  );
}
