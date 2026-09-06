import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { demoClient } from "./src/lib/client";
import { type CreateRouteOfferInput, type Match, type OfferId, type StudentId, type ZoneId } from "./src/lib/contracts";
import { MAYA_ID, SAM_ID } from "./src/lib/demo-fixtures";
import { joinRide, listOpenRides, postCurrentRide } from "./src/lib/supabase-api";
import { supabase, type SupabaseDatabase } from "./src/lib/supabase";

type Tab = "home" | "find" | "plan" | "profile";
type OfferCardData = { id: OfferId; driverName: string; originLocation: string; destinationLocation: string; departureStart: string; seatsOpen: number; maxDetourMinutes: number };
const requestId = "request-jordan-clinic";
const zoneLabel: Record<ZoneId, string> = {
  "north-campus": "North Campus", "campus-core": "Campus Core", downtown: "Downtown",
  "public-transit-hub": "Transit Hub", "airport-terminal": "Airport"
};
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
  const [requestId, setRequestId] = useState("request-jordan-clinic");
  const [liveOffers, setLiveOffers] = useState<SupabaseDatabase["public"]["Tables"]["rides"]["Row"][]>([]);
  const liveMode = Boolean(supabase);
  useEffect(() => demoClient.subscribe(() => refresh((value) => value + 1)), []);
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      try {
        setLiveOffers(await listOpenRides());
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load rides."); }
    })();
  }, []);
  const actor = demoClient.currentActor;
  const matches = useMemo(() => demoClient.snapshotMatches(requestId), [requestId, actor]);
  const demoOffers = useMemo(() => demoClient.listOpenOffers().map((offer) => ({ id: offer.id, driverName: demoClient.snapshotStudent(offer.driverId).displayName, originLocation: offer.originLocation, destinationLocation: offer.destinationLocation, departureStart: offer.departureStart, seatsOpen: offer.seatsOpen, maxDetourMinutes: offer.maxDetourMinutes })), [actor]);
  const openOffers: OfferCardData[] = liveMode
    ? liveOffers.map((offer) => ({ id: offer.id as OfferId, driverName: offer.driver_name, originLocation: offer.origin_location, destinationLocation: offer.destination_location, departureStart: offer.departure_start, seatsOpen: offer.seats_open, maxDetourMinutes: offer.max_detour_minutes }))
    : demoOffers;
  const activeMatch = matches.find((match) => ["confirmed", "in_progress"].includes(match.state));

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
      const result = await demoClient.cancelMatch(match.id, "driver_change");
      setMessage(result.rescueStatus === "rematched" ? "Ride cancelled. Rescue found another option." : "Ride cancelled.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel this ride."); }
  }
  async function progress(match: Match) {
    try {
      if (match.state === "confirmed") await demoClient.checkIn(match.id);
      else await demoClient.completeMatch(match.id);
      setMessage(match.state === "confirmed" ? "Checked in at the pickup landmark." : "Ride completed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update this ride."); }
  }
  async function createRequest(pickupLocation: string, destinationLocation: string) {
    try {
      const request = await demoClient.createAnchorRequest({
        pickupZone: zoneForLocation(pickupLocation, "north-campus"),
        pickupLocation: pickupLocation.trim(),
        destinationZone: zoneForLocation(destinationLocation, "downtown"),
        destinationLocation: destinationLocation.trim(),
        arriveBy: "2026-09-06T07:45:00-07:00",
        flexibilityMinutes: 15,
        preferences: ["quiet_ride"]
      });
      setRequestId(request.id);
      setTab("home");
      setMessage(`Request posted for ${request.destinationLocation}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not post request."); }
  }
  async function createOffer(input: CreateRouteOfferInput) {
    try {
      if (liveMode) {
        const ride = await postCurrentRide(input);
        setLiveOffers((current) => [ride, ...current]);
      } else await demoClient.createRouteOffer(input);
      setTab("find");
      setMessage("Your ride is posted. Other students can now join it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not post ride."); }
  }
  async function joinOffer(offerId: OfferId) {
    try {
      if (liveMode) {
        await joinRide(offerId, "North Campus Library entrance");
        setLiveOffers((current) => current.filter((offer) => offer.id !== offerId));
      } else {
        const match = await demoClient.joinRouteOffer(offerId, "North Campus Library entrance");
        setRequestId(match.requestId);
      }
      setTab("home");
      setMessage("You joined the ride. The public pickup landmark is ready.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not join this ride."); }
  }

  const displayName = actor.displayName;
  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>POLYPASSENGER • CAL POLY</Text><Text style={styles.title}>Hey, {displayName}</Text><Text style={styles.subtitle}>Make the next commitment easier.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{displayName[0]}</Text></View></View>
      <View style={styles.notice}><Ionicons name="shield-checkmark" size={18} color="#163B35" /><Text style={styles.noticeText}>{message}</Text></View>
      {tab === "home" && <Home activeMatch={activeMatch} matches={matches} onFind={() => setTab("find")} onPlan={() => setTab("plan")} onOffer={offer} onAccept={accept} onCancel={cancel} onProgress={progress} />}
      {tab === "find" && <Find offers={openOffers} onJoin={joinOffer} />}
      {tab === "plan" && <OfferRide onPosted={createOffer} />}
      {tab === "profile" && <Profile onChange={(id) => { demoClient.setDemoActor(id); setMessage(`Now viewing the ${id.replace("student-", "")} demo session.`); }} />}
    </ScrollView>
    <View style={styles.nav}><Nav icon="home" label="Home" active={tab === "home"} onPress={() => setTab("home")} /><Nav icon="search" label="Join a ride" active={tab === "find"} onPress={() => setTab("find")} /><Nav icon="car" label="Offer a ride" active={tab === "plan"} onPress={() => setTab("plan")} /><Nav icon="person" label="Profile" active={tab === "profile"} onPress={() => setTab("profile")} /></View>
  </SafeAreaView>;
}

function Home({ activeMatch, matches, onFind, onPlan, onOffer, onAccept, onCancel, onProgress }: { activeMatch?: Match; matches: Match[]; onFind: () => void; onPlan: () => void; onOffer: (match: Match, driverId: StudentId) => void; onAccept: (match: Match) => void; onCancel: (match: Match) => void; onProgress: (match: Match) => void }) {
  return <>
    <View style={styles.hero}><View style={{ flex: 1, zIndex: 1 }}><Text style={styles.heroLabel}>NEXT COMMITMENT</Text><Text style={styles.heroTitle}>Downtown by 7:45 AM</Text><Text style={styles.heroMeta}>Tomorrow • from North Campus</Text><Pressable style={styles.darkButton} onPress={onFind}><Text style={styles.darkButtonText}>View matching rides</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></Pressable></View><View style={styles.routeArt}><Ionicons name="navigate" size={54} color="#F3EDE2" /></View></View>
    {activeMatch && <MatchCard match={activeMatch} onOffer={onOffer} onAccept={onAccept} onCancel={onCancel} onProgress={onProgress} />}
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Quick actions</Text><Text style={styles.seeAll}>This week</Text></View>
    <View style={styles.actionRow}><Action icon="search" title="Find a ride" body={`${matches.filter((m) => m.state === "candidate").length} compatible options`} onPress={onFind} /><Action icon="car" title="Offer a seat" body="Help someone get there" onPress={onPlan} /></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>How it works</Text></View><View style={styles.steps}><Step n="01" title="Post your plan" body="Share a broad pickup zone and arrival time." /><Step n="02" title="Choose together" body="Details stay private until both students accept." /><Step n="03" title="Keep moving" body="If plans change, Rescue helps find a replacement." /></View>
  </>;
}

function Find({ offers, onJoin }: { offers: OfferCardData[]; onJoin: (offerId: OfferId) => void }) {
  return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Join a ride</Text><Text style={styles.subtitle}>Browse rides posted by Cal Poly drivers.</Text></View>{offers.map((offer) => <OpenOfferCard key={offer.id} offer={offer} onJoin={onJoin} />)}{offers.length === 0 && <View style={styles.empty}><Ionicons name="car-outline" size={30} color="#8D918B" /><Text style={styles.cardTitle}>No open rides yet</Text><Text style={styles.subtitle}>Check back soon or post a ride for other students.</Text></View>}</>;
}

function OpenOfferCard({ offer, onJoin }: { offer: OfferCardData; onJoin: (offerId: OfferId) => void }) {
  return <View style={styles.matchCard}><View style={styles.matchTop}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{offer.driverName[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardKicker}>OPEN SEAT • {offer.seatsOpen} AVAILABLE</Text><Text style={styles.cardTitle}>{offer.driverName} is driving to {offer.destinationLocation}</Text></View><Ionicons name="people-outline" size={23} color="#28584D" /></View><View style={styles.routeLine}><Text style={styles.routeText}>{offer.originLocation}</Text><Ionicons name="arrow-forward" size={15} color="#8A8C88" /><Text style={styles.routeText}>{offer.destinationLocation}</Text></View><Text style={styles.explanation}>Leaves around {new Date(offer.departureStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} • up to {offer.maxDetourMinutes} min detour</Text><Pressable style={styles.darkButtonSmall} onPress={() => onJoin(offer.id)}><Text style={styles.darkButtonText}>Join this ride</Text></Pressable></View>;
}

function MatchCard({ match, onOffer, onAccept, onCancel, onProgress }: { match: Match; onOffer: (match: Match, driverId: StudentId) => void; onAccept: (match: Match) => void; onCancel?: (match: Match) => void; onProgress?: (match: Match) => void }) {
  const offer = demoClient.snapshotOffer(match.offerId); const driver = demoClient.snapshotStudent(offer.driverId); const confirmed = ["confirmed", "in_progress"].includes(match.state);
  return <View style={styles.matchCard}><View style={styles.matchTop}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{driver.displayName[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardKicker}>{confirmed ? "CONFIRMED RIDE" : "COMPATIBLE ROUTE"}</Text><Text style={styles.cardTitle}>{driver.displayName} is going to {offer.destinationLocation}</Text></View><View style={styles.timePill}><Text style={styles.timeBig}>{match.arrivalSlackMinutes}</Text><Text style={styles.timeSmall}>min early</Text></View></View><View style={styles.routeLine}><Text style={styles.routeText}>{offer.originLocation}</Text><Ionicons name="arrow-forward" size={15} color="#8A8C88" /><Text style={styles.routeText}>{offer.destinationLocation}</Text><Text style={styles.dot}>•</Text><Text style={styles.routeText}>{match.detourMinutes} min detour</Text></View>{match.explanation.map((item) => <Text key={item.text} style={styles.explanation}>✓ {item.text}</Text>)}{confirmed && <Text style={styles.pickup}>Pickup: North Campus Library entrance</Text>}<View style={styles.cardActions}>{match.state === "candidate" && <Pressable style={styles.outlineButton} onPress={() => onOffer(match, offer.driverId)}><Text style={styles.outlineText}>Ask {driver.displayName} to offer</Text></Pressable>}{match.state === "driver_offered" && <Pressable style={styles.darkButtonSmall} onPress={() => onAccept(match)}><Text style={styles.darkButtonText}>Accept this ride</Text></Pressable>}{confirmed && onProgress && <Pressable style={styles.darkButtonSmall} onPress={() => onProgress(match)}><Text style={styles.darkButtonText}>{match.state === "confirmed" ? "Check in" : "Complete ride"}</Text></Pressable>}{confirmed && onCancel && <Pressable style={styles.textButton} onPress={() => onCancel(match)}><Text style={styles.textButtonLabel}>Cancel + Rescue</Text></Pressable>}</View></View>;
}

function OfferRide({ onPosted }: { onPosted: (input: CreateRouteOfferInput) => void }) {
  const [origin, setOrigin] = useState("North Campus");
  const [destination, setDestination] = useState("");
  return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Offer a ride</Text><Text style={styles.subtitle}>Post a route you already plan to drive. Other students can join your open seat.</Text></View><View style={styles.formCard}><Text style={styles.fieldLabel}>Where are you leaving from?</Text><TextInput value={origin} onChangeText={setOrigin} placeholder="e.g. my apartment, campus..." placeholderTextColor="#9BA19B" style={styles.input} /><Text style={styles.fieldLabel}>Where are you going?</Text><TextInput value={destination} onChangeText={setDestination} placeholder="e.g. SLO Airport, internship..." placeholderTextColor="#9BA19B" style={styles.input} /><Pressable disabled={!origin.trim() || !destination.trim()} style={[styles.postButton, (!origin.trim() || !destination.trim()) && styles.postButtonDisabled]} onPress={() => onPosted({ originZone: zoneForLocation(origin, "north-campus"), originLocation: origin.trim(), destinationZone: zoneForLocation(destination, "downtown"), destinationLocation: destination.trim(), departureStart: "2026-09-06T06:55:00-07:00", departureEnd: "2026-09-06T07:05:00-07:00", seatsOpen: 1, maxDetourMinutes: 10, preferenceTags: ["quiet_ride"] })}><Text style={styles.postButtonText}>Post open ride</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></Pressable><Text style={styles.helper}>You are sharing a broad route, not a precise address. Riders only see the public location name.</Text></View></>;
}
function Profile({ onChange }: { onChange: (id: StudentId) => void }) { return <><View style={styles.pageHeading}><Text style={styles.pageTitle}>Your profile</Text><Text style={styles.subtitle}>Local demo session</Text></View><View style={styles.profileCard}><View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>J</Text></View><Text style={styles.profileName}>Jordan</Text><Text style={styles.verified}>Ride backend demo</Text></View><View style={styles.formCard}><Text style={styles.fieldLabel}>Switch demo session</Text><Text style={styles.helper}>Use this to demonstrate the driver and rider sides of the ride flow.</Text>{["student-jordan", MAYA_ID, SAM_ID].map((id) => <Pressable key={id} style={styles.choice} onPress={() => onChange(id as StudentId)}><Text style={styles.choiceText}>{id.replace("student-", "").replace(/^./, (letter) => letter.toUpperCase())}</Text><Ionicons name="chevron-forward" size={16} color="#969993" /></Pressable>)}</View></>; }
function Action({ icon, title, body, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress: () => void }) { return <Pressable style={styles.actionCard} onPress={onPress}><View style={styles.actionIcon}><Ionicons name={icon} size={20} color="#163B35" /></View><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></Pressable>; }
function Step({ n, title, body }: { n: string; title: string; body: string }) { return <View style={styles.step}><Text style={styles.stepNumber}>{n}</Text><View><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View></View>; }
function Nav({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.navItem}><View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={icon} size={20} color={active ? "#17201E" : "#C8CEC8"} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F1EB" }, authSafe: { flex: 1, backgroundColor: "#F4F1EB" }, authContent: { padding: 22, flexGrow: 1, justifyContent: "center" }, authBrand: { marginBottom: 24 }, authTitle: { color: "#17201E", fontSize: 32, fontWeight: "800", marginTop: 8, marginBottom: 8 }, authCard: { backgroundColor: "#FFF", borderRadius: 23, padding: 20 }, authStatus: { color: "#9B5D4E", fontSize: 12, lineHeight: 18, marginTop: 14 }, authSwitch: { color: "#28584D", fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 18 }, content: { padding: 22, paddingBottom: 118 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, eyebrow: { color: "#77817A", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 }, title: { color: "#17201E", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 }, subtitle: { color: "#737A73", fontSize: 14, lineHeight: 21 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#D8C29A", justifyContent: "center", alignItems: "center" }, avatarText: { color: "#453923", fontSize: 18, fontWeight: "800" }, notice: { backgroundColor: "#E2EEE7", borderRadius: 16, padding: 13, flexDirection: "row", gap: 9, alignItems: "center", marginBottom: 18 }, noticeText: { color: "#31594C", flex: 1, fontSize: 12, lineHeight: 17 }, hero: { backgroundColor: "#163B35", borderRadius: 26, minHeight: 190, padding: 22, overflow: "hidden", flexDirection: "row", marginBottom: 22 }, heroLabel: { color: "#AFCDBB", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heroTitle: { color: "#FFF", fontSize: 23, fontWeight: "800", marginTop: 10 }, heroMeta: { color: "#B8D0C3", fontSize: 13, marginTop: 5, marginBottom: 17 }, routeArt: { position: "absolute", right: -12, bottom: 14, width: 130, height: 130, borderRadius: 70, backgroundColor: "#28584D", justifyContent: "center", alignItems: "center", transform: [{ rotate: "-18deg" }] }, darkButton: { backgroundColor: "#26302D", borderRadius: 22, alignSelf: "flex-start", paddingVertical: 11, paddingHorizontal: 15, flexDirection: "row", gap: 10, alignItems: "center" }, darkButtonSmall: { backgroundColor: "#17201E", borderRadius: 18, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center" }, darkButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 }, sectionTitle: { color: "#17201E", fontSize: 18, fontWeight: "800" }, seeAll: { color: "#77817A", fontSize: 12 }, actionRow: { flexDirection: "row", gap: 12, marginBottom: 22 }, actionCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 15, flex: 1, minHeight: 130 }, actionIcon: { backgroundColor: "#E9F0EA", width: 37, height: 37, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 13 }, actionTitle: { color: "#17201E", fontSize: 15, fontWeight: "800" }, actionBody: { color: "#858B84", fontSize: 11, lineHeight: 16, marginTop: 5 }, steps: { backgroundColor: "#FFF", borderRadius: 21, padding: 16, gap: 17 }, step: { flexDirection: "row", gap: 15 }, stepNumber: { color: "#B28D54", fontSize: 12, fontWeight: "900", width: 23, paddingTop: 2 }, stepTitle: { color: "#25302B", fontSize: 14, fontWeight: "800" }, stepBody: { color: "#81877F", fontSize: 12, lineHeight: 18, marginTop: 3, maxWidth: 265 }, pageHeading: { marginBottom: 20 }, pageTitle: { color: "#17201E", fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginBottom: 6 }, matchCard: { backgroundColor: "#FFF", borderRadius: 23, padding: 17, marginBottom: 14 }, matchTop: { flexDirection: "row", gap: 11, alignItems: "center" }, driverAvatar: { backgroundColor: "#E7D1A7", width: 43, height: 43, borderRadius: 16, alignItems: "center", justifyContent: "center" }, driverAvatarText: { color: "#54452C", fontWeight: "800", fontSize: 18 }, cardKicker: { color: "#7B867D", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, cardTitle: { color: "#1C2723", fontSize: 15, fontWeight: "800", marginTop: 3, lineHeight: 21 }, timePill: { backgroundColor: "#E9F0EA", borderRadius: 13, padding: 8, alignItems: "center" }, timeBig: { color: "#28584D", fontWeight: "900", fontSize: 16 }, timeSmall: { color: "#5E766C", fontSize: 9 }, routeLine: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#EEF0EC" }, routeText: { color: "#59625C", fontSize: 11, fontWeight: "700" }, dot: { color: "#A3AAA2" }, explanation: { color: "#6D776F", fontSize: 11, marginTop: 8 }, pickup: { color: "#28584D", backgroundColor: "#E5F2EA", padding: 11, borderRadius: 12, fontSize: 12, fontWeight: "800", marginTop: 12 }, cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 15, alignItems: "center" }, outlineButton: { borderColor: "#CBD8CE", borderWidth: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 13 }, outlineText: { color: "#28584D", fontSize: 11, fontWeight: "800" }, textButton: { padding: 7 }, textButtonLabel: { color: "#9B5D4E", fontSize: 11, fontWeight: "800" }, formCard: { backgroundColor: "#FFF", borderRadius: 23, padding: 18 }, fieldLabel: { color: "#26332D", fontSize: 15, fontWeight: "800", marginBottom: 12 }, input: { backgroundColor: "#F7F8F5", borderRadius: 14, borderWidth: 1, borderColor: "#E0E5DF", color: "#34413A", fontSize: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 17 }, suggestionLabel: { color: "#77817A", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }, suggestionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, suggestion: { backgroundColor: "#E9F0EA", borderRadius: 16, paddingVertical: 9, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 5 }, suggestionText: { color: "#28584D", fontSize: 11, fontWeight: "700" }, postButton: { backgroundColor: "#163B35", borderRadius: 20, paddingVertical: 13, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 20 }, postButtonDisabled: { backgroundColor: "#AEB8B0" }, postButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" }, choice: { backgroundColor: "#F7F8F5", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 9 }, choiceText: { color: "#34413A", fontSize: 14, fontWeight: "700", flex: 1 }, helper: { color: "#838A83", fontSize: 12, lineHeight: 18, marginTop: 14 }, profileCard: { backgroundColor: "#163B35", borderRadius: 23, padding: 22, alignItems: "center", marginBottom: 16 }, bigAvatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: "#D8C29A", alignItems: "center", justifyContent: "center", marginBottom: 12 }, bigAvatarText: { color: "#453923", fontWeight: "900", fontSize: 28 }, profileName: { color: "#FFF", fontSize: 21, fontWeight: "800" }, verified: { color: "#B8D0C3", marginTop: 7, fontSize: 12 }, empty: { backgroundColor: "#FFF", borderRadius: 22, padding: 30, alignItems: "center", gap: 8 }, nav: { position: "absolute", bottom: 14, left: 18, right: 18, backgroundColor: "#17201E", borderRadius: 27, minHeight: 68, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }, navItem: { alignItems: "center", justifyContent: "center", minWidth: 66 }, navIcon: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" }, navIconActive: { backgroundColor: "#EDE9DF" }, navLabel: { color: "#AEB9B0", fontSize: 9, marginTop: 3 }, navLabelActive: { color: "#FFF", fontWeight: "800" }
});
