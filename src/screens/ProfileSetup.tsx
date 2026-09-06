import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export type StudentProfile = {
  displayName: string;
  email: string;
  major: string;
  classYear: string;
  rideRole: "rider" | "driver" | "both";
};

type ProfileSetupProps = {
  email: string;
  onSave: (profile: Omit<StudentProfile, "email">) => Promise<void>;
  initialProfile?: Omit<StudentProfile, "email">;
  onCancel?: () => void;
  allowRideRoleEdit?: boolean;
};

export default function ProfileSetup({
  email,
  onSave,
  initialProfile,
  onCancel,
  allowRideRoleEdit = true,
}: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? "");
  const [major, setMajor] = useState(initialProfile?.major ?? "");
  const [classYear, setClassYear] = useState(initialProfile?.classYear ?? "");
  const [rideRole, setRideRole] = useState<StudentProfile["rideRole"]>(
    initialProfile?.rideRole ?? "both",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSave = Boolean(displayName.trim() && major.trim() && classYear.trim());

  async function saveProfile() {
    if (!canSave || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSave({
        displayName: displayName.trim(),
        major: major.trim(),
        classYear: classYear.trim(),
        rideRole,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>POLYPASSENGERS PROFILE</Text>
        <Text style={styles.title}>
          {initialProfile ? "Edit your profile" : "Tell your community who you are"}
        </Text>
        <Text style={styles.subtitle}>
          {initialProfile
            ? "Update the profile details other riders see."
            : `This profile belongs to ${email} and is linked to this email account.`}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Taylor"
            style={styles.input}
            autoCapitalize="words"
            textContentType="name"
          />

          <Text style={styles.label}>Major</Text>
          <TextInput
            value={major}
            onChangeText={setMajor}
            placeholder="e.g. Computer Science"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Graduation year</Text>
          <TextInput
            value={classYear}
            onChangeText={setClassYear}
            placeholder="e.g. 2027"
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
          />

          {allowRideRoleEdit && (
            <>
              <Text style={styles.label}>How will you use PolyPassengers?</Text>
              <View style={styles.roleRow}>
                {([
                  ["rider", "Find rides"],
                  ["driver", "Offer rides"],
                  ["both", "Both"],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setRideRole(value)}
                    style={[styles.roleButton, rideRole === value && styles.roleButtonActive]}
                  >
                    <Text style={[styles.roleText, rideRole === value && styles.roleTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={styles.actions}>
            {onCancel && (
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={!canSave || saving}
              onPress={saveProfile}
              style={[styles.button, (!canSave || saving) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving…" : initialProfile ? "Save changes" : "Save profile"}
              </Text>
            </Pressable>
          </View>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F1EB" },
  content: { flexGrow: 1, justifyContent: "center", padding: 22 },
  eyebrow: { color: "#77817A", fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textAlign: "center" },
  title: { color: "#17201E", fontSize: 29, fontWeight: "800", lineHeight: 35, marginTop: 10, textAlign: "center" },
  subtitle: { color: "#59625C", fontSize: 14, lineHeight: 21, marginBottom: 22, marginTop: 10, textAlign: "center" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 23, padding: 20 },
  label: { color: "#26332D", fontSize: 14, fontWeight: "800", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#F7F8F5", borderColor: "#E0E5DF", borderRadius: 14, borderWidth: 1, color: "#26332D", fontSize: 15, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 13 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 22 },
  roleButton: { alignItems: "center", backgroundColor: "#F1F5F1", borderColor: "#E0E5DF", borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 12 },
  roleButtonActive: { backgroundColor: "#E2EEE7", borderColor: "#28584D" },
  roleText: { color: "#59625C", fontSize: 12, fontWeight: "800" },
  roleTextActive: { color: "#28584D" },
  actions: { gap: 10 },
  button: { alignItems: "center", backgroundColor: "#163B35", borderRadius: 18, paddingVertical: 15 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  cancelButton: { alignItems: "center", borderColor: "#D8DED8", borderRadius: 18, borderWidth: 1, paddingVertical: 14 },
  cancelText: { color: "#59625C", fontSize: 14, fontWeight: "800" },
  message: { color: "#9B5D4E", lineHeight: 19, marginTop: 14, textAlign: "center" },
});
