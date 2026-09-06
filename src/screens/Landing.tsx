import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login failed");
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PolyPassenger</Text>
      <Text style={styles.subtitle}>Sign in with your Cal Poly email to continue.</Text>
      <TextInput style={styles.input} placeholder="you@calpoly.edu" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Pressable style={styles.button} onPress={submit} disabled={loading || !email.trim()}>
        <Text style={styles.buttonText}>{loading ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
      {token && <View style={styles.result}><Text style={styles.resultLabel}>Token</Text><Text selectable>{token}</Text></View>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#666", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#DDD", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: "#17201E", padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#FFF", fontWeight: "700" },
  result: { marginTop: 16, padding: 12, backgroundColor: "#F3F3F3", borderRadius: 8 },
  resultLabel: { fontWeight: "700", marginBottom: 6 },
  error: { color: "#B00020", marginTop: 12 }
});
