import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const TOKEN_KEY = "frontend_token";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code" | "done">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(TOKEN_KEY);
      if (t) setStage("done");
    })();
  }, []);

  async function requestCode() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not request code");
      setStage("code");
      setMessage("Code sent — check your email. (In dev, code is logged to function output.)");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");
      const token = data.token;
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        setStage("done");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (stage === "done") {
    return (
      <View style={styles.container}>
        <Text style={styles.rocket}>🚀</Text>
        <Text style={styles.title}>You're in — welcome aboard!</Text>
        <Text style={styles.subtitle}>Your token is stored on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rocket}>✨</Text>
      <Text style={styles.title}>PolyPassenger</Text>
      <Text style={styles.subtitle}>Quick sign-in with your Cal Poly email</Text>

      {stage === "email" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="you@calpoly.edu"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Pressable
            style={[styles.button, !email.trim() && styles.buttonDisabled]}
            onPress={requestCode}
            disabled={loading || !email.trim()}
          >
            <Text style={styles.buttonText}>{loading ? "Sending…" : "Send me a code"}</Text>
          </Pressable>
        </>
      )}

      {stage === "code" && (
        <>
          <Text style={styles.help}>We sent a 6-digit code to {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={code}
            onChangeText={setCode}
            keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
          />
          <Pressable
            style={[styles.button, !code.trim() && styles.buttonDisabled]}
            onPress={verifyCode}
            disabled={loading || !code.trim()}
          >
            <Text style={styles.buttonText}>{loading ? "Verifying…" : "Verify code"}</Text>
          </Pressable>
          <Pressable onPress={() => setStage("email")} style={styles.ghostButton}>
            <Text style={styles.ghostText}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, justifyContent: "center", backgroundColor: "#fff" },
  rocket: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { color: "#666", textAlign: "center", marginBottom: 18 },
  help: { color: "#444", marginBottom: 8, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#FBFBFB",
  },
  button: {
    backgroundColor: "#006644",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  ghostButton: { marginTop: 10, alignItems: "center" },
  ghostText: { color: "#006644" },
  message: { marginTop: 12, color: "#333", textAlign: "center" },
});
