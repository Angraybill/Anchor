import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { demoOffers } from "../lib/demo-fixtures";

const zoneLabels: Record<string, string> = {
  "north-campus": "North Campus",
  "campus-core": "Campus Core",
  downtown: "Downtown SLO",
  "public-transit-hub": "Transit hub",
  "airport-terminal": "Airport terminal",
};

function departureLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export default function RideDashboard() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={require("../../assets/brand/horizontal-reverse-1600.png")} style={styles.wordmark} resizeMode="contain" />
          <Text style={styles.kicker}>YOUR RIDE BOARD</Text>
          <Text style={styles.title}>Available rides</Text>
          <Text style={styles.subtitle}>Browse rides heading toward your commitment. Pickup details stay private until both people accept.</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Demo ride board</Text>
          <Text style={styles.noticeCopy}>Route estimates and availability are demo data while the live ride service is connected.</Text>
        </View>

        {demoOffers.map((offer) => (
          <View key={offer.id} style={styles.rideCard}>
            <View style={styles.rideTopRow}>
              <Text style={styles.departure}>{departureLabel(offer.departureStart)}</Text>
              <View style={styles.seatPill}>
                <Text style={styles.seatText}>{offer.seatsOpen} seat open</Text>
              </View>
            </View>
            <Text style={styles.route}>{zoneLabels[offer.originZone]} → {zoneLabels[offer.destinationZone]}</Text>
            <Text style={styles.detail}>Up to {offer.maxDetourMinutes} minutes of detour · {offer.preferenceTags.includes("quiet_ride") ? "Quiet ride" : "Flexible ride"}</Text>
            <View style={styles.viewHint}>
              <Text style={styles.viewHintText}>Pickup landmark is shared only after both people accept.</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8E8" },
  content: { padding: 24, paddingBottom: 40 },
  header: { backgroundColor: "#123D2A", borderRadius: 28, padding: 24, marginBottom: 18 },
  wordmark: { width: 170, height: 42, alignSelf: "center", marginBottom: 24 },
  kicker: { color: "#F4B942", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 },
  title: { color: "#FFF8E8", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#E6EFE9", fontSize: 15, lineHeight: 22 },
  notice: { backgroundColor: "#FCE8B5", borderRadius: 18, padding: 16, marginBottom: 18 },
  noticeTitle: { color: "#5F4400", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  noticeCopy: { color: "#5F4400", fontSize: 13, lineHeight: 19 },
  rideCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, marginBottom: 14, shadowColor: "#17211C", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 },
  rideTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  departure: { color: "#123D2A", fontSize: 20, fontWeight: "800" },
  seatPill: { backgroundColor: "#E9F3ED", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  seatText: { color: "#123D2A", fontSize: 12, fontWeight: "800" },
  route: { color: "#17211C", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  detail: { color: "#526058", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  viewHint: { borderColor: "#D7DED8", borderRadius: 12, borderWidth: 1, padding: 12 },
  viewHintText: { color: "#526058", fontSize: 13, lineHeight: 18 },
});
