import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  sendMagicLink,
  signInWithPassword,
  signUp,
} from "../../services/supabase/authService";

type Mode = "password" | "magic";
type PasswordView = "signIn" | "signUp";

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("password");
  const [passwordView, setPasswordView] = useState<PasswordView>("signIn");
  const [magicSent, setMagicSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function clearForm() {
    setEmail("");
    setPassword("");
    setError(null);
    setMagicSent(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearForm();
  }

  function switchPasswordView(next: PasswordView) {
    setPasswordView(next);
    setError(null);
  }

  async function handlePasswordSubmit() {
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      if (passwordView === "signUp") {
        await signUp(email, password);
        // After sign-up Supabase auto-confirms in dev mode and fires onAuthStateChange.
      } else {
        await signInWithPassword(email, password);
      }
      // On success, authStore.session becomes non-null → RootNavigator switches stacks.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await sendMagicLink(email);
      setMagicSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Magic link sent confirmation ────────────────────────────────────────────
  if (mode === "magic" && magicSent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a sign-in link to{"\n"}
          <Text style={styles.emailHighlight}>{email.trim()}</Text>
        </Text>
        <Text style={styles.hint}>Tap the link in the email to open the app.</Text>
        <TouchableOpacity onPress={() => { setMagicSent(false); setError(null); }}>
          <Text style={styles.linkText}>Wrong email? Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Context Lens</Text>
      <Text style={styles.subtitle}>Understand every page you read.</Text>

      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleOption, mode === "password" && styles.toggleActive]}
          onPress={() => switchMode("password")}
        >
          <Text style={[styles.toggleText, mode === "password" && styles.toggleTextActive]}>
            Password
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleOption, mode === "magic" && styles.toggleActive]}
          onPress={() => switchMode("magic")}
        >
          <Text style={[styles.toggleText, mode === "magic" && styles.toggleTextActive]}>
            Magic Link
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign in / Sign up sub-toggle (password mode only) */}
      {mode === "password" && (
        <View style={styles.subToggle}>
          <TouchableOpacity onPress={() => switchPasswordView("signIn")}>
            <Text style={[styles.subToggleText, passwordView === "signIn" && styles.subToggleActive]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <Text style={styles.subToggleSep}>·</Text>
          <TouchableOpacity onPress={() => switchPasswordView("signUp")}>
            <Text style={[styles.subToggleText, passwordView === "signUp" && styles.subToggleActive]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Email input */}
      <TextInput
        style={[styles.input, error !== null && styles.inputError]}
        placeholder="Email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
        returnKeyType={mode === "password" ? "next" : "send"}
        onSubmitEditing={mode === "magic" ? handleMagicLink : undefined}
        editable={!isLoading}
      />

      {/* Password input (password mode only) */}
      {mode === "password" && (
        <TextInput
          style={[styles.input, styles.inputSpaced, error !== null && styles.inputError]}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); if (error) setError(null); }}
          returnKeyType="done"
          onSubmitEditing={handlePasswordSubmit}
          editable={!isLoading}
        />
      )}

      {/* Inline error */}
      {error !== null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Primary action button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={mode === "password" ? handlePasswordSubmit : handleMagicLink}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "magic"
              ? "Send sign-in link"
              : passwordView === "signUp"
              ? "Create account"
              : "Sign in"}
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  emailHighlight: {
    fontWeight: "600",
    color: "#333",
  },
  hint: {
    fontSize: 14,
    color: "#888",
    marginTop: 12,
    textAlign: "center",
  },
  linkText: {
    marginTop: 32,
    fontSize: 14,
    color: "#6858e9",
    textDecorationLine: "underline",
  },
  toggle: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginBottom: 20,
    overflow: "hidden",
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  toggleActive: {
    backgroundColor: "#6858e9",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  toggleTextActive: {
    color: "#fff",
  },
  subToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  subToggleText: {
    fontSize: 14,
    color: "#aaa",
  },
  subToggleActive: {
    color: "#6858e9",
    fontWeight: "600",
  },
  subToggleSep: {
    color: "#ccc",
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  inputSpaced: {
    marginTop: 12,
  },
  inputError: {
    borderColor: "#E53935",
  },
  errorBanner: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    borderLeftWidth: 4,
    borderLeftColor: "#E53935",
  },
  errorText: {
    color: "#C62828",
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    width: "100%",
    height: 52,
    backgroundColor: "#6858e9",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
