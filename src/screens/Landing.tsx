import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Sign-in is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart Expo.");
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabase;
}

type LandingProps = {
  onAuthenticated: () => void;
};

export default function Landing({ onAuthenticated }: LandingProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code" | "done">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (data.session) setStage("done");
      } catch {
        // A storage failure should not prevent someone from signing in.
      }
    })();
  }, []);

  async function requestCode() {
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStage("code");
      setMessage("Code sent — check your email.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (stage === "done") {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.brandPanel}>
          <Image source={require("../../assets/brand/horizontal-reverse-1600.png")} style={styles.wordmark} resizeMode="contain" />
        </View>
        <View style={styles.successCard}>
          <Image source={require("../../assets/brand/icon-1024.png")} style={styles.successIcon} />
          <Text style={styles.successTitle}>You’re in!</Text>
        <Text style={styles.successCopy}>Your PolyPassengers session is ready on this device.</Text>
          <Pressable onPress={onAuthenticated} style={[styles.button, styles.continueButton]} accessibilityRole="button">
            <Text style={styles.buttonText}>Browse ride offers</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function verifyCode() {
    setMessage(null);
    setLoading(true);
    try {
      const verification = {
        email: email.trim().toLowerCase(),
        token: code.trim(),
      };
      const { data, error } = await getSupabase().auth.verifyOtp({ ...verification, type: "email" });
      if (error) throw error;
      if (!data.session) throw new Error("The code was accepted, but no sign-in session was created.");
      setStage("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
    <View style={styles.container}>
      <View style={styles.brandPanel}>
        <Image source={require("../../assets/brand/horizontal-reverse-1600.png")} style={styles.wordmark} resizeMode="contain" />
        <Text style={styles.brandTagline}>Rides that work around your schedule.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.eyebrow}>STUDENT SIGN-IN</Text>
        <Text style={styles.title}>Welcome aboard</Text>
        <Text style={styles.subtitle}>Use your Cal Poly email to coordinate rides with your campus community.</Text>

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
            <Text style={styles.buttonText}>{loading ? "Sending…" : "Continue with email"}</Text>
          </Pressable>
          </>
        )}

        {stage === "code" && (
          <>
          <Text style={styles.help}>Enter the sign-in code we sent to {email}.</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={8}
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
    </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1, backgroundColor: "#FFF8E8" },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: "#FFF8E8", justifyContent: "center", padding: 24 },
  brandPanel: { backgroundColor: "#123D2A", borderRadius: 28, paddingHorizontal: 28, paddingVertical: 30, marginBottom: 18 },
  wordmark: { width: "100%", height: 48 },
  brandTagline: { color: "#FFF8E8", fontSize: 15, fontWeight: "600", letterSpacing: 0.2, marginTop: 16, textAlign: "center" },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 24, shadowColor: "#17211C", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  eyebrow: { color: "#7C5C12", fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 8, textAlign: "center" },
  title: { color: "#17211C", fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  subtitle: { color: "#526058", fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  help: { color: "#34433A", marginBottom: 14, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#D7DED8",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#FFFDF8",
  },
  button: {
    backgroundColor: "#123D2A",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFF8E8", fontWeight: "800", fontSize: 16 },
  ghostButton: { marginTop: 10, alignItems: "center" },
  ghostText: { color: "#123D2A", fontWeight: "700" },
  message: { marginTop: 16, color: "#34433A", lineHeight: 20, textAlign: "center" },
  successContainer: { justifyContent: "center" },
  successCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 28, padding: 32 },
  successIcon: { height: 72, marginBottom: 20, width: 72 },
  successTitle: { color: "#17211C", fontSize: 28, fontWeight: "800", marginBottom: 8 },
  successCopy: { color: "#526058", fontSize: 16, lineHeight: 24, textAlign: "center" },
  continueButton: { alignSelf: "stretch", marginTop: 24 },
});
