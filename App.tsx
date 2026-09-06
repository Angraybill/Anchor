import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { demoClient } from "./src/lib/client";
import { type CreateRouteOfferInput, type Match, type OfferId, type StudentId, type ZoneId } from "./src/lib/contracts";
import { MAYA_ID, SAM_ID } from "./src/lib/demo-fixtures";

type Tab = "home" | "find" | "plan" | "profile";
const zoneLabel: Record<ZoneId, string> = {
  "north-campus": "North Campus", "campus-core": "Campus Core", downtown: "Downtown",
  "public-transit-hub": "Transit Hub", "airport-terminal": "Airport"
};
const departureTimes = [
  { label: "9:00 AM", value: "09:00" },
  { label: "9:15 AM", value: "09:15" },
  { label: "9:30 AM", value: "09:30" },
  { label: "9:45 AM", value: "09:45" },
  { label: "10:00 AM", value: "10:00" },
  { label: "10:15 AM", value: "10:15" },
  { label: "10:30 AM", value: "10:30" },
  { label: "10:45 AM", value: "10:45" },
  { label: "11:00 AM", value: "11:00" },
  { label: "11:15 AM", value: "11:15" },
  { label: "11:30 AM", value: "11:30" },
  { label: "11:45 AM", value: "11:45" },
  { label: "12:00 PM", value: "12:00" },
  { label: "12:15 PM", value: "12:15" },
  { label: "12:30 PM", value: "12:30" },
  { label: "12:45 PM", value: "12:45" },
  { label: "1:00 PM", value: "13:00" },
  { label: "1:15 PM", value: "13:15" },
  { label: "1:30 PM", value: "13:30" },
  { label: "1:45 PM", value: "13:45" },
  { label: "2:00 PM", value: "14:00" },
  { label: "2:15 PM", value: "14:15" },
  { label: "2:30 PM", value: "14:30" },
  { label: "2:45 PM", value: "14:45" },
  { label: "3:00 PM", value: "16:00" },
  { label: "3:15 PM", value: "16:15" },
  { label: "3:30 PM", value: "16:30" },
  { label: "3:45 PM", value: "16:45" },
  { label: "4:00 PM", value: "17:00" },
  { label: "4:15 PM", value: "17:15" },
  { label: "4:30 PM", value: "17:30" },
  { label: "4:45 PM", value: "17:45" },
  { label: "5:00 PM", value: "18:00" },
  { label: "5:15 PM", value: "18:15" },
  { label: "5:30 PM", value: "18:30" },
  { label: "5:45 PM", value: "18:45" },
] as const;
function zoneForLocation(location: string, fallback: ZoneId): ZoneId {
  const normalized = location.toLowerCase();
  if (normalized.includes("airport")) return "airport-terminal";
  if (normalized.includes("downtown") || normalized.includes("amtrak")) return normalized.includes("amtrak") ? "public-transit-hub" : "downtown";
  if (normalized.includes("campus") || normalized.includes("rec center")) return normalized.includes("north") ? "north-campus" : "campus-core";
  return fallback;
}

export default function App() {
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [message, setMessage] = useState("PolyPassenger is ready for your next trip.");
  useEffect(() => demoClient.subscribe(() => refresh((value) => value + 1)), []);
  const actor = demoClient.currentActor;
  const openOffers = useMemo(
    () => demoClient.listOpenOffers().filter((offer) => offer.driverId !== actor.id),
    [actor],
  );
  const offeredRides = useMemo(
    () => demoClient.snapshotOffers().filter((offer) => offer.driverId === actor.id),
    [actor],
  );
  const joinedMatches = useMemo(
    () => demoClient.snapshotJoinedMatches(actor.id),
    [actor],
  );

  function offer(match: Match, driverId: StudentId) {
    try {
      demoClient.setDemoActor(driverId);
      void demoClient.offerSeat(match.id).then(() => {
        demoClient.setDemoActor("student-jordan");
        setMessage("Seat offered. Review it below and accept when ready.");
      });
    } catch (error) {
      demoClient.setDemoActor("student-jordan");
      setMessage(error instanceof Error ? error.message : "Could not offer this seat.");
    }
  }
  async function accept(match: Match) {
    try { await demoClient.acceptRide(match.id); setMessage("Ride confirmed. Pickup details are now visible."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not accept this ride."); }
  }
  async function cancel(match: Match) {
    try {
      await demoClient.cancelMatch(match.id, "driver_change");
      setMessage("Ride cancelled. The seat is available again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel this ride."); }
  }
  async function createOffer(input: CreateRouteOfferInput) {
    try {
      await demoClient.createRouteOffer(input);
      setTab("find");
      setMessage("Your ride is posted. Other students can now join it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not post ride."); }
  }
  async function joinOffer(offerId: OfferId) {
    try {
      const match = await demoClient.joinRouteOffer(offerId, "North Campus");
      setTab("home");
      setMessage("You joined the ride. The public pickup landmark is ready.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not join this ride."); }
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>POLYPASSENGER • CAL POLY</Text><Text style={styles.title}>Hey, {actor.displayName}</Text><Text style={styles.subtitle}>Make the next commitment easier.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{actor.displayName[0]}</Text></View></View>
      {tab === "home" && <Home offeredRides={offeredRides} joinedMatches={joinedMatches} onOffer={offer} onAccept={accept} onCancel={cancel} />}
      {tab === "find" && <Find offers={openOffers} onJoin={joinOffer} />}
      {tab === "plan" && <OfferRide onPosted={createOffer} />}
      {tab === "profile" && <Profile actor={actor} onChange={(id) => { demoClient.setDemoActor(id); setMessage(`Now viewing the ${id.replace("student-", "")} demo session.`); }} />}
    </ScrollView>
    <View style={styles.nav}><Nav icon="home" label="Home" active={tab === "home"} onPress={() => setTab("home")} /><Nav icon="search" label="Join a ride" active={tab === "find"} onPress={() => setTab("find")} /><Nav icon="car" label="Offer a ride" active={tab === "plan"} onPress={() => setTab("plan")} /><Nav icon="person" label="Profile" active={tab === "profile"} onPress={() => setTab("profile")} /></View>
  </SafeAreaView>;
}

function Home({ offeredRides, joinedMatches, onOffer, onAccept, onCancel }: { offeredRides: ReturnType<typeof demoClient.snapshotOffers>; joinedMatches: ReturnType<typeof demoClient.snapshotJoinedMatches>; onOffer: (match: Match, driverId: StudentId) => void; onAccept: (match: Match) => void; onCancel: (match: Match) => void }) {
  return <>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your rides</Text><Text style={styles.seeAll}>{offeredRides.length + joinedMatches.length} active</Text></View>
    {offeredRides.map((offer) => <OfferedRideCard key={offer.id} offer={offer} />)}
    {joinedMatches.map((match) => <MatchCard key={match.id} match={match} onOffer={onOffer} onAccept={onAccept} onCancel={onCancel} />)}
    {!offeredRides.length && !joinedMatches.length && <View style={styles.empty}><Ionicons name="car-outline" size={30} color="#8D918B" /><Text style={styles.cardTitle}>No rides yet</Text><Text style={styles.subtitle}>Offer a seat or join an open ride to see it here.</Text></View>}
  </>;
}

function Find({ offers, onJoin }: { offers: ReturnType<typeof demoClient.listOpenOffers>; onJoin: (offerId: OfferId) => void }) {
  return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Join a ride</Text><Text style={styles.subtitle}>Browse rides posted by verified Cal Poly drivers.</Text></View>{offers.map((offer) => <OpenOfferCard key={offer.id} offer={offer} onJoin={onJoin} />)}{offers.length === 0 && <View style={styles.empty}><Ionicons name="car-outline" size={30} color="#8D918B" /><Text style={styles.cardTitle}>No open rides yet</Text><Text style={styles.subtitle}>Check back soon or post a ride for other students.</Text></View>}</>;
}

function OpenOfferCard({ offer, onJoin }: { offer: ReturnType<typeof demoClient.snapshotOffer>; onJoin: (offerId: OfferId) => void }) {
  const driver = demoClient.snapshotStudent(offer.driverId);
  const riders = demoClient.snapshotCommittedRiders(offer.id);
  return <View style={styles.matchCard}><View style={styles.matchTop}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{driver.displayName[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardKicker}>OPEN SEAT • {offer.seatsOpen} AVAILABLE</Text><Text style={styles.cardTitle}>{driver.displayName} is driving to {offer.destinationLocation}</Text></View><Ionicons name="people-outline" size={23} color="#28584D" /></View><View style={styles.routeLine}><Text style={styles.routeText}>{offer.originLocation}</Text><Ionicons name="arrow-forward" size={15} color="#8A8C88" /><Text style={styles.routeText}>{offer.destinationLocation}</Text></View><Text style={styles.explanation}>Leaves around {new Date(offer.departureStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text><Text style={styles.riderList}>Committed: {riders.length ? riders.map((rider) => rider.displayName).join(", ") : "No riders yet"}</Text><Pressable style={styles.darkButtonSmall} onPress={() => onJoin(offer.id)}><Text style={styles.darkButtonText}>Join this ride</Text></Pressable></View>;
}

function OfferedRideCard({ offer }: { offer: ReturnType<typeof demoClient.snapshotOffer> }) {
  const riders = demoClient.snapshotCommittedRiders(offer.id);
  return <View style={styles.matchCard}><View style={styles.matchTop}><View style={styles.driverAvatar}><Ionicons name="car" size={20} color="#54452C" /></View><View style={{ flex: 1 }}><Text style={styles.cardKicker}>YOUR OFFERED RIDE</Text><Text style={styles.cardTitle}>Driving to {offer.destinationLocation}</Text></View><View style={styles.timePill}><Text style={styles.timeBig}>{offer.seatsOpen}</Text><Text style={styles.timeSmall}>seats left</Text></View></View><View style={styles.routeLine}><Text style={styles.routeText}>{offer.originLocation}</Text><Ionicons name="arrow-forward" size={15} color="#8A8C88" /><Text style={styles.routeText}>{offer.destinationLocation}</Text></View><Text style={styles.explanation}>Leaves at {new Date(offer.departureStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text><Text style={styles.riderList}>Committed: {riders.length ? riders.map((rider) => rider.displayName).join(", ") : "No riders yet"}</Text></View>;
}

function MatchCard({ match, onOffer, onAccept, onCancel }: { match: Match; onOffer: (match: Match, driverId: StudentId) => void; onAccept: (match: Match) => void; onCancel?: (match: Match) => void }) {
  const offer = demoClient.snapshotOffer(match.offerId); const driver = demoClient.snapshotStudent(offer.driverId); const confirmed = match.state === "confirmed";
  return <View style={styles.matchCard}><View style={styles.matchTop}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{driver.displayName[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardKicker}>{confirmed ? "CONFIRMED RIDE" : "COMPATIBLE ROUTE"}</Text><Text style={styles.cardTitle}>{driver.displayName} is going to {offer.destinationLocation}</Text></View></View><View style={styles.routeLine}><Text style={styles.routeText}>{offer.originLocation}</Text><Ionicons name="arrow-forward" size={15} color="#8A8C88" /><Text style={styles.routeText}>{offer.destinationLocation}</Text></View>{confirmed && <Text style={styles.pickup}>Pickup: North Campus Library entrance</Text>}<View style={styles.cardActions}>{match.state === "candidate" && <Pressable style={styles.outlineButton} onPress={() => onOffer(match, offer.driverId)}><Text style={styles.outlineText}>Ask {driver.displayName} to offer</Text></Pressable>}{match.state === "driver_offered" && <Pressable style={styles.darkButtonSmall} onPress={() => onAccept(match)}><Text style={styles.darkButtonText}>Accept this ride</Text></Pressable>}{confirmed && onCancel && <Pressable style={styles.textButton} onPress={() => onCancel(match)}><Text style={styles.textButtonLabel}>Cancel ride</Text></Pressable>}</View></View>;
}

function OfferRide({ onPosted }: { onPosted: (input: CreateRouteOfferInput) => void }) {
  const [origin, setOrigin] = useState("North Campus");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("07:00");
  const [seats, setSeats] = useState("1");
  const seatCount = Number(seats);
  const canPost = origin.trim() && destination.trim() && Number.isInteger(seatCount) && seatCount >= 1 && seatCount <= 4;
  const departureStart = `2026-09-06T${departureTime}:00-07:00`;
  const departureEnd = new Date(new Date(departureStart).getTime() + 10 * 60 * 1000).toISOString();
  return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Offer a ride</Text><Text style={styles.subtitle}>Post a route you already plan to drive. Other students can join your open seat.</Text></View><View style={styles.formCard}><Text style={styles.fieldLabel}>Where are you leaving from?</Text><TextInput value={origin} onChangeText={setOrigin} placeholder="e.g. my apartment, campus..." placeholderTextColor="#718078" style={styles.input} /><Text style={styles.fieldLabel}>Where are you going?</Text><TextInput value={destination} onChangeText={setDestination} placeholder="e.g. SLO Airport, internship..." placeholderTextColor="#718078" style={styles.input} /><Text style={styles.fieldLabel}>Departure time</Text><View style={styles.pickerShell}><Picker selectedValue={departureTime} onValueChange={(value) => setDepartureTime(String(value))} style={styles.picker} itemStyle={styles.pickerItem}>{departureTimes.map((time) => <Picker.Item key={time.value} label={time.label} value={time.value} color="#20302B" />)}</Picker></View><Text style={styles.fieldLabel}>Available seats</Text><TextInput value={seats} onChangeText={setSeats} placeholder="1–4" placeholderTextColor="#718078" style={styles.input} keyboardType="number-pad" /><Pressable disabled={!canPost} style={[styles.postButton, !canPost && styles.postButtonDisabled]} onPress={() => onPosted({ originZone: zoneForLocation(origin, "north-campus"), originLocation: origin.trim(), destinationZone: zoneForLocation(destination, "downtown"), destinationLocation: destination.trim(), departureStart, departureEnd, seatsOpen: seatCount })}><Text style={styles.postButtonText}>Post open ride</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></Pressable><Text style={styles.helper}>Choose from available departure times and offer one to four seats. Riders see only the broad route until they join.</Text></View></>;
}
function Profile({ actor, onChange }: { actor: typeof demoClient.currentActor; onChange: (id: StudentId) => void }) { return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Your profile</Text><Text style={styles.subtitle}>Verified student demo session</Text></View><View style={styles.profileCard}><View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{actor.displayName[0]}</Text></View><Text style={styles.profileName}>{actor.displayName}</Text><Text style={styles.verified}>✓ Verified Cal Poly student</Text></View><View style={styles.formCard}><Text style={styles.fieldLabel}>Switch demo session</Text><Text style={styles.helper}>Use this to demonstrate the driver and rider sides of the flow.</Text>{["student-jordan", MAYA_ID, SAM_ID].map((id) => <Pressable key={id} style={styles.choice} onPress={() => onChange(id as StudentId)}><Text style={styles.choiceText}>{id.replace("student-", "").replace(/^./, (letter) => letter.toUpperCase())}</Text><Ionicons name="chevron-forward" size={16} color="#969993" /></Pressable>)}</View></>; }
function Nav({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.navItem}><View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={icon} size={20} color={active ? "#17201E" : "#C8CEC8"} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text></Pressable>; }

const darkStyles = {
  safe: { flex: 1, backgroundColor: "#08110E" },
  content: { padding: 22, paddingBottom: 118, backgroundColor: "#08110E" },
  eyebrow: { color: "#9FB8AB", fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.2, marginBottom: 6 },
  title: { color: "#F5F7F3", fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.8 },
  subtitle: { color: "#AAB8B0", fontSize: 14, lineHeight: 21 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#2B4B3E", justifyContent: "center" as const, alignItems: "center" as const },
  avatarText: { color: "#E8F1EB", fontSize: 18, fontWeight: "800" as const },
  sectionTitle: { color: "#F5F7F3", fontSize: 18, fontWeight: "800" as const },
  seeAll: { color: "#9FB8AB", fontSize: 12 },
  pageTitle: { color: "#F5F7F3", fontSize: 29, fontWeight: "800" as const, letterSpacing: -0.8, marginBottom: 6 },
  matchCard: { backgroundColor: "#14211C", borderRadius: 23, padding: 17, marginBottom: 14 },
  formCard: { backgroundColor: "#14211C", borderRadius: 23, padding: 18 },
  empty: { backgroundColor: "#14211C", borderRadius: 22, padding: 30, alignItems: "center" as const, gap: 8 },
  driverAvatar: { backgroundColor: "#2B4B3E", width: 43, height: 43, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const },
  driverAvatarText: { color: "#E8F1EB", fontWeight: "800" as const, fontSize: 18 },
  cardKicker: { color: "#9FB8AB", fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  cardTitle: { color: "#F5F7F3", fontSize: 15, fontWeight: "800" as const, marginTop: 3, lineHeight: 21 },
  timePill: { backgroundColor: "#213B30", borderRadius: 13, padding: 8, alignItems: "center" as const },
  timeBig: { color: "#D0E6D8", fontWeight: "900" as const, fontSize: 16 },
  timeSmall: { color: "#A9C7B4", fontSize: 9 },
  routeLine: { flexDirection: "row" as const, gap: 7, alignItems: "center" as const, marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#284036" },
  routeText: { color: "#C6D1CA", fontSize: 11, fontWeight: "700" as const },
  dot: { color: "#95828b" },
  explanation: { color: "#AAB8B0", fontSize: 11, marginTop: 8, },
  pickup: { color: "#D0E6D8", backgroundColor: "#213B30", padding: 11, borderRadius: 12, fontSize: 12, fontWeight: "800" as const, marginTop: 12 },
  outlineButton: { borderColor: "#5B7C6B", borderWidth: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 13 },
  outlineText: { color: "#CFE7D8", fontSize: 11, fontWeight: "800" as const },
  fieldLabel: { color: "#E8F1EB", fontSize: 15, fontWeight: "800" as const, marginBottom: 12 },
  input: { backgroundColor: "#0D1813", borderRadius: 14, borderWidth: 1, borderColor: "#2C473A", color: "#F5F7F3", fontSize: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 17 },
  pickerShell: { backgroundColor: "#0D1813", borderRadius: 14, borderWidth: 1, borderColor: "#2C473A", marginBottom: 17, overflow: "hidden" as const },
  picker: { color: "#F5F7F3", height: 140 },
  pickerItem: { color: "#F5F7F3", fontSize: 16 },
  postButton: { backgroundColor: "#D0E6D8", borderRadius: 20, paddingVertical: 13, paddingHorizontal: 16, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 9, marginTop: 20 },
  postButtonText: { color: "#08110E", fontSize: 13, fontWeight: "800" as const },
  choice: { backgroundColor: "#0D1813", borderRadius: 14, padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginTop: 9 },
  choiceText: { color: "#E8F1EB", fontSize: 14, fontWeight: "700" as const, flex: 1 },
  helper: { color: "#AAB8B0", fontSize: 12, lineHeight: 18, marginTop: 14 },
  nav: { position: "absolute" as const, bottom: 14, left: 18, right: 18, backgroundColor: "#14211C", borderRadius: 27, minHeight: 68, paddingHorizontal: 8, flexDirection: "row" as const, justifyContent: "space-around" as const, alignItems: "center" as const },
  navIconActive: { backgroundColor: "#D0E6D8" },
  navLabel: { color: "#8FA197", fontSize: 9, marginTop: 3 },
  navLabelActive: { color: "#F5F7F3", fontWeight: "800" as const },
};

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F1EB" }, content: { padding: 22, paddingBottom: 118 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, eyebrow: { color: "#77817A", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 }, title: { color: "#17201E", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 }, subtitle: { color: "#737A73", fontSize: 14, lineHeight: 21 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#D8C29A", justifyContent: "center", alignItems: "center" }, avatarText: { color: "#453923", fontSize: 18, fontWeight: "800" }, notice: { backgroundColor: "#E2EEE7", borderRadius: 16, padding: 13, flexDirection: "row", gap: 9, alignItems: "center", marginBottom: 18 }, noticeText: { color: "#31594C", flex: 1, fontSize: 12, lineHeight: 17 }, hero: { backgroundColor: "#163B35", borderRadius: 26, minHeight: 190, padding: 22, overflow: "hidden", flexDirection: "row", marginBottom: 22 }, heroLabel: { color: "#AFCDBB", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heroTitle: { color: "#FFF", fontSize: 23, fontWeight: "800", marginTop: 10 }, heroMeta: { color: "#B8D0C3", fontSize: 13, marginTop: 5, marginBottom: 17 }, routeArt: { position: "absolute", right: -12, bottom: 14, width: 130, height: 130, borderRadius: 70, backgroundColor: "#28584D", justifyContent: "center", alignItems: "center", transform: [{ rotate: "-18deg" }] }, darkButton: { backgroundColor: "#26302D", borderRadius: 22, alignSelf: "flex-start", paddingVertical: 11, paddingHorizontal: 15, flexDirection: "row", gap: 10, alignItems: "center" }, darkButtonSmall: { backgroundColor: "#3c5645", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14, alignItems: "center" }, darkButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }, sectionTitle: { color: "#17201E", fontSize: 18, fontWeight: "800" }, seeAll: { color: "#77817A", fontSize: 12 }, actionRow: { flexDirection: "row", gap: 12, marginBottom: 22 }, actionCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 15, flex: 1, minHeight: 130 }, actionIcon: { backgroundColor: "#E9F0EA", width: 37, height: 37, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 13 }, actionTitle: { color: "#17201E", fontSize: 15, fontWeight: "800" }, actionBody: { color: "#858B84", fontSize: 11, lineHeight: 16, marginTop: 5 }, steps: { backgroundColor: "#FFF", borderRadius: 21, padding: 16, gap: 17 }, step: { flexDirection: "row", gap: 15 }, stepNumber: { color: "#B28D54", fontSize: 12, fontWeight: "900", width: 23, paddingTop: 2 }, stepTitle: { color: "#25302B", fontSize: 14, fontWeight: "800" }, stepBody: { color: "#81877F", fontSize: 12, lineHeight: 18, marginTop: 3, maxWidth: 265 }, pageHeading: { marginBottom: 20 }, pageTitle: { color: "#17201E", fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginBottom: 6 }, matchCard: { backgroundColor: "#FFF", borderRadius: 23, padding: 17, marginBottom: 14 }, matchTop: { flexDirection: "row", gap: 11, alignItems: "center" }, driverAvatar: { backgroundColor: "#E7D1A7", width: 43, height: 43, borderRadius: 16, alignItems: "center", justifyContent: "center" }, driverAvatarText: { color: "#54452C", fontWeight: "800", fontSize: 18 }, cardKicker: { color: "#7B867D", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, cardTitle: { color: "#1C2723", fontSize: 15, fontWeight: "800", marginTop: 3, lineHeight: 21 }, timePill: { backgroundColor: "#E9F0EA", borderRadius: 13, padding: 8, alignItems: "center" }, timeBig: { color: "#28584D", fontWeight: "900", fontSize: 16 }, timeSmall: { color: "#5E766C", fontSize: 9 }, routeLine: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#EEF0EC" }, routeText: { color: "#59625C", fontSize: 11, fontWeight: "700" }, dot: { color: "#A3AAA2" }, explanation: { color: "#6D776F", fontSize: 11, marginTop: 8 }, pickup: { color: "#28584D", backgroundColor: "#E5F2EA", padding: 11, borderRadius: 12, fontSize: 12, fontWeight: "800", marginTop: 12 }, cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 15, alignItems: "center" }, outlineButton: { borderColor: "#CBD8CE", borderWidth: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 13 }, outlineText: { color: "#28584D", fontSize: 11, fontWeight: "800" }, textButton: { padding: 7 }, textButtonLabel: { color: "#9B5D4E", fontSize: 11, fontWeight: "800" }, formCard: { backgroundColor: "#FFF", borderRadius: 23, padding: 18 }, fieldLabel: { color: "#26332D", fontSize: 15, fontWeight: "800", marginBottom: 12 }, input: { backgroundColor: "#F7F8F5", borderRadius: 14, borderWidth: 1, borderColor: "#E0E5DF", color: "#34413A", fontSize: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 17 }, suggestionLabel: { color: "#77817A", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }, suggestionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, suggestion: { backgroundColor: "#E9F0EA", borderRadius: 16, paddingVertical: 9, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 5 }, suggestionText: { color: "#28584D", fontSize: 11, fontWeight: "700" }, postButton: { backgroundColor: "#163B35", borderRadius: 20, paddingVertical: 13, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 20 }, postButtonDisabled: { backgroundColor: "#AEB8B0" }, postButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" }, choice: { backgroundColor: "#F7F8F5", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 9 }, choiceText: { color: "#34413A", fontSize: 14, fontWeight: "700", flex: 1 }, helper: { color: "#838A83", fontSize: 12, lineHeight: 18, marginTop: 14 }, profileCard: { backgroundColor: "#163B35", borderRadius: 23, padding: 22, alignItems: "center", marginBottom: 16 }, bigAvatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: "#D8C29A", alignItems: "center", justifyContent: "center", marginBottom: 12 }, bigAvatarText: { color: "#453923", fontWeight: "900", fontSize: 28 }, profileName: { color: "#FFF", fontSize: 21, fontWeight: "800" }, verified: { color: "#B8D0C3", marginTop: 7, fontSize: 12 }, empty: { backgroundColor: "#FFF", borderRadius: 22, padding: 30, alignItems: "center", gap: 8 }, nav: { position: "absolute", bottom: 14, left: 18, right: 18, backgroundColor: "#17201E", borderRadius: 27, minHeight: 68, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }, navItem: { alignItems: "center", justifyContent: "center", minWidth: 66 }, navIcon: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" }, navIconActive: { backgroundColor: "#EDE9DF" }, navLabel: { color: "#AEB9B0", fontSize: 9, marginTop: 3 }, navLabelActive: { color: "#FFF", fontWeight: "800" },
});

const styles = {
  ...baseStyles,
  riderList: { color: "#4A6655", fontSize: 11, fontWeight: "800" as const, marginTop: 10 },
  pickerShell: { backgroundColor: "#F7F8F5", borderRadius: 14, borderWidth: 1, borderColor: "#C9D5CA", height: 140, marginBottom: 17, overflow: "hidden" as const, justifyContent: "center" as const },
  picker: { color: "#20302B", height: 216 },
  pickerItem: { color: "#20302B", fontSize: 16 },
  outlineButton: { backgroundColor: "#EDF5EE", borderColor: "#8AAE93", borderWidth: 1, borderRadius: 18, paddingVertical: 11, paddingHorizontal: 13 },
  textButton: { backgroundColor: "#FBE8E2", borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  textButtonLabel: { color: "#8A4738", fontSize: 11, fontWeight: "800" as const },
};
