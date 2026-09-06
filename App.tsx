import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "./src/app-styles";
import { demoClient } from "./src/lib/client";
import {
  type CreateRouteOfferInput,
  type Match,
  type OfferId,
  type StudentId,
  type ZoneId,
} from "./src/lib/contracts";
import { JORDAN_ID, MAYA_ID, SAM_ID } from "./src/lib/demo-fixtures";
import {
  joinRide,
  listOpenRides,
  postCurrentRide,
} from "./src/lib/supabase-api";
import { supabase, type SupabaseDatabase } from "./src/lib/supabase";
import Landing from "./src/screens/Landing";

type Tab = "home" | "find" | "plan" | "profile";
type OfferCardData = {
  id: OfferId;
  driverId?: StudentId;
  driverName: string;
  originLocation: string;
  destinationLocation: string;
  departureStart: string;
  seatsOpen: number;
};
const requestId = "request-jordan-clinic";
const zoneLabel: Record<ZoneId, string> = {
  "north-campus": "North Campus",
  "campus-core": "Campus Core",
  downtown: "Downtown",
  "public-transit-hub": "Transit Hub",
  "airport-terminal": "Airport",
};
function zoneForLocation(location: string, fallback: ZoneId): ZoneId {
  const normalized = location.toLowerCase();
  if (normalized.includes("airport")) return "airport-terminal";
  if (normalized.includes("downtown") || normalized.includes("amtrak"))
    return normalized.includes("amtrak") ? "public-transit-hub" : "downtown";
  if (normalized.includes("campus") || normalized.includes("rec center"))
    return normalized.includes("north") ? "north-campus" : "campus-core";
  return fallback;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [message, setMessage] = useState(
    "PolyPassenger is ready for your next trip.",
  );
  const [requestId, setRequestId] = useState("request-jordan-clinic");
  const [liveOffers, setLiveOffers] = useState<
    SupabaseDatabase["public"]["Tables"]["rides"]["Row"][]
  >([]);
  const liveMode = Boolean(supabase);
  useEffect(
    () => demoClient.subscribe(() => refresh((value) => value + 1)),
    [],
  );
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      try {
        setLiveOffers(await listOpenRides());
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not load rides.",
        );
      }
    })();
  }, []);
  const actor = demoClient.currentActor;
  const offeredRides = useMemo(
    () => demoClient.snapshotOffers().filter((offer) => offer.driverId === actor.id),
    [actor],
  );
  const matches = useMemo(
    () => demoClient.snapshotMatches(requestId),
    [requestId, actor],
  );
  const demoOffers = useMemo(
    () =>
      demoClient
        .listOpenOffers()
        .map((offer) => ({
          id: offer.id,
          driverId: offer.driverId,
          driverName: demoClient.snapshotStudent(offer.driverId).displayName,
          originLocation: offer.originLocation,
          destinationLocation: offer.destinationLocation,
          departureStart: offer.departureStart,
          seatsOpen: offer.seatsOpen,
        })),
    [actor],
  );
  const openOffers: OfferCardData[] = (liveMode
    ? liveOffers.map((offer) => ({
        id: offer.id as OfferId,
        driverId: undefined,
        driverName: offer.driver_name,
        originLocation: offer.origin_location,
        destinationLocation: offer.destination_location,
        departureStart: offer.departure_start,
        seatsOpen: offer.seats_open,
      }))
    : demoOffers).filter((offer) => offer.driverId !== actor.id);
  const activeMatch = matches.find((match) =>
    ["confirmed", "in_progress"].includes(match.state),
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
      setMessage(
        error instanceof Error ? error.message : "Could not offer this seat.",
      );
    }
  }
  async function accept(match: Match) {
    try {
      await demoClient.acceptRide(match.id);
      setMessage("Ride confirmed. Pickup details are now visible.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not accept this ride.",
      );
    }
  }
  async function cancel(match: Match) {
    try {
      await demoClient.cancelMatch(match.id, "driver_change");
      setMessage("Ride cancelled.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not cancel this ride.",
      );
    }
  }
  async function progress(match: Match) {
    try {
      if (match.state === "confirmed") await demoClient.checkIn(match.id);
      else await demoClient.completeMatch(match.id);
      setMessage(
        match.state === "confirmed"
          ? "Checked in at the pickup landmark."
          : "Ride completed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update this ride.",
      );
    }
  }
  async function createRequest(
    pickupLocation: string,
    destinationLocation: string,
  ) {
    try {
      const request = await demoClient.createAnchorRequest({
        pickupZone: zoneForLocation(pickupLocation, "north-campus"),
        pickupLocation: pickupLocation.trim(),
        destinationZone: zoneForLocation(destinationLocation, "downtown"),
        destinationLocation: destinationLocation.trim(),
        arriveBy: "2026-09-06T07:45:00-07:00",
        flexibilityMinutes: 15,
        preferences: ["quiet_ride"],
      });
      setRequestId(request.id);
      setTab("home");
      setMessage(`Request posted for ${request.destinationLocation}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not post request.",
      );
    }
  }
  async function createOffer(input: CreateRouteOfferInput) {
    try {
      if (liveMode) {
        const ride = await postCurrentRide(input);
        setLiveOffers((current) => [ride, ...current]);
      } else await demoClient.createRouteOffer(input);
      setTab("find");
      setMessage("Your ride is posted. Other students can now join it.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not post ride.",
      );
    }
  }
  async function joinOffer(offerId: OfferId) {
    try {
      if (liveMode) {
        await joinRide(offerId, "North Campus Library entrance");
        setLiveOffers((current) =>
          current.filter((offer) => offer.id !== offerId),
        );
      } else {
        const match = await demoClient.joinRouteOffer(
          offerId,
          "North Campus Library entrance",
        );
        setRequestId(match.requestId);
      }
      setTab("home");
      setMessage("You joined the ride. The public pickup landmark is ready.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not join this ride.",
      );
    }
  }

  const displayName = actor.displayName;
  if (!authenticated) {
    return <Landing onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>POLYPASSENGER • CAL POLY</Text>
            <Text style={styles.title}>Hey, {displayName}</Text>
            <Text style={styles.subtitle}>
              Make the next commitment easier.
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName[0]}</Text>
          </View>
        </View>
        {tab === "home" && (
          <Home
            offeredRides={offeredRides}
            matches={matches.filter((match) => match.state === "confirmed")}
            onOffer={offer}
            onAccept={accept}
            onCancel={cancel}
          />
        )}
        {tab === "find" && <Find offers={openOffers} onJoin={joinOffer} />}
        {tab === "plan" && <OfferRide onPosted={createOffer} />}
        {tab === "profile" && (
          <Profile
            actor={actor}
            onChange={(id) => {
              demoClient.setDemoActor(id);
              setMessage(
                `Now viewing the ${id.replace("student-", "")} demo session.`,
              );
            }}
          />
        )}
      </ScrollView>
      <View style={styles.nav}>
        <Nav
          icon="home"
          label="Home"
          active={tab === "home"}
          onPress={() => setTab("home")}
        />
        <Nav
          icon="search"
          label="Join a ride"
          active={tab === "find"}
          onPress={() => setTab("find")}
        />
        <Nav
          icon="car"
          label="Offer a ride"
          active={tab === "plan"}
          onPress={() => setTab("plan")}
        />
        <Nav
          icon="person"
          label="Profile"
          active={tab === "profile"}
          onPress={() => setTab("profile")}
        />
      </View>
    </SafeAreaView>
  );
}

function Home({
  offeredRides,
  matches,
  onOffer,
  onAccept,
  onCancel,
}: {
  offeredRides: ReturnType<typeof demoClient.snapshotOffers>;
  matches: Match[];
  onOffer: (match: Match, driverId: StudentId) => void;
  onAccept: (match: Match) => void;
  onCancel: (match: Match) => void;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your rides</Text>
        <Text style={styles.seeAll}>{offeredRides.length + matches.length} active</Text>
      </View>
      {offeredRides.map((offer) => <OfferedRideCard key={offer.id} offer={offer} />)}
      {matches.map((match) => <MatchCard key={match.id} match={match} onOffer={onOffer} onAccept={onAccept} onCancel={onCancel} />)}
      {!offeredRides.length && !matches.length && <View style={styles.empty}><Text style={styles.cardTitle}>No rides yet</Text><Text style={styles.subtitle}>Offer a seat or join an open ride to see it here.</Text></View>}
    </>
  );
}

function Find({
  offers,
  onJoin,
}: {
  offers: OfferCardData[];
  onJoin: (offerId: OfferId) => void;
}) {
  return (
    <>
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>Join a ride</Text>
        <Text style={styles.subtitle}>
          Browse rides posted by Cal Poly drivers.
        </Text>
      </View>
      {offers.map((offer) => (
        <OpenOfferCard key={offer.id} offer={offer} onJoin={onJoin} />
      ))}
      {offers.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={30} color="#8D918B" />
          <Text style={styles.cardTitle}>No open rides yet</Text>
          <Text style={styles.subtitle}>
            Check back soon or post a ride for other students.
          </Text>
        </View>
      )}
    </>
  );
}

function OpenOfferCard({
  offer,
  onJoin,
}: {
  offer: OfferCardData;
  onJoin: (offerId: OfferId) => void;
}) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchTop}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{offer.driverName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardKicker}>
            OPEN SEAT • {offer.seatsOpen} AVAILABLE
          </Text>
          <Text style={styles.cardTitle}>
            {offer.driverName} is driving to {offer.destinationLocation}
          </Text>
        </View>
        <Ionicons name="people-outline" size={23} color="#28584D" />
      </View>
      <View style={styles.routeLine}>
        <Text style={styles.routeText}>{offer.originLocation}</Text>
        <Ionicons name="arrow-forward" size={15} color="#8A8C88" />
        <Text style={styles.routeText}>{offer.destinationLocation}</Text>
      </View>
      <Text style={styles.explanation}>
        Leaves{" "}
        {new Date(offer.departureStart).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}{" "}
        around{" "}
        {new Date(offer.departureStart).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
      </Text>
      <Pressable
        style={styles.darkButtonSmall}
        onPress={() => onJoin(offer.id)}
      >
        <Text style={styles.darkButtonText}>Join this ride</Text>
      </Pressable>
    </View>
  );
}

function OfferedRideCard({
  offer,
}: {
  offer: ReturnType<typeof demoClient.snapshotOffer>;
}) {
  return (
    <View style={styles.matchCard}>
      <Text style={styles.cardKicker}>YOUR OFFERED RIDE</Text>
      <Text style={styles.cardTitle}>Driving to {offer.destinationLocation}</Text>
      <View style={styles.routeLine}>
        <Text style={styles.routeText}>{offer.originLocation}</Text>
        <Ionicons name="arrow-forward" size={15} color="#8A8C88" />
        <Text style={styles.routeText}>{offer.destinationLocation}</Text>
      </View>
      <Text style={styles.explanation}>
        {offer.seatsOpen} seat{offer.seatsOpen === 1 ? "" : "s"} available
      </Text>
    </View>
  );
}

function MatchCard({
  match,
  onOffer,
  onAccept,
  onCancel,
}: {
  match: Match;
  onOffer: (match: Match, driverId: StudentId) => void;
  onAccept: (match: Match) => void;
  onCancel?: (match: Match) => void;
}) {
  const offer = demoClient.snapshotOffer(match.offerId);
  const driver = demoClient.snapshotStudent(offer.driverId);
  const confirmed = ["confirmed", "in_progress"].includes(match.state);
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchTop}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{driver.displayName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardKicker}>
            {confirmed ? "CONFIRMED RIDE" : "COMPATIBLE ROUTE"}
          </Text>
          <Text style={styles.cardTitle}>
            {driver.displayName} is going to {offer.destinationLocation}
          </Text>
        </View>
      </View>
      <View style={styles.routeLine}>
        <Text style={styles.routeText}>{offer.originLocation}</Text>
        <Ionicons name="arrow-forward" size={15} color="#8A8C88" />
        <Text style={styles.routeText}>{offer.destinationLocation}</Text>
      </View>
      {match.explanation.map((item) => (
        <Text key={item.text} style={styles.explanation}>
          ✓ {item.text}
        </Text>
      ))}
      {confirmed && (
        <Text style={styles.pickup}>Pickup: North Campus Library entrance</Text>
      )}
      <View style={styles.cardActions}>
        {match.state === "candidate" && (
          <Pressable
            style={styles.outlineButton}
            onPress={() => onOffer(match, offer.driverId)}
          >
            <Text style={styles.outlineText}>
              Ask {driver.displayName} to offer
            </Text>
          </Pressable>
        )}
        {match.state === "driver_offered" && (
          <Pressable
            style={styles.darkButtonSmall}
            onPress={() => onAccept(match)}
          >
            <Text style={styles.darkButtonText}>Accept this ride</Text>
          </Pressable>
        )}
        {confirmed && onCancel && (
          <Pressable style={styles.textButton} onPress={() => onCancel(match)}>
            <Text style={styles.textButtonLabel}>Cancel ride</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function OfferRide({
  onPosted,
}: {
  onPosted: (input: CreateRouteOfferInput) => void;
}) {
  const [origin, setOrigin] = useState("North Campus");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState(() => {
    const time = new Date();
    time.setDate(time.getDate() + 1);
    time.setHours(6, 55, 0, 0);
    return time;
  });
  const [seats, setSeats] = useState("1");
  const seatCount = Number(seats);
  const departureEnd = new Date(departureTime.getTime() + 10 * 60 * 1000);
  const canPost = Boolean(
    origin.trim() &&
      destination.trim() &&
      Number.isInteger(seatCount) &&
      seatCount >= 1 &&
      seatCount <= 4,
  );
  return (
    <>
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>Offer a ride</Text>
        <Text style={styles.subtitle}>
          Post a route you already plan to drive. Other students can join your
          open seat.
        </Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Where are you leaving from?</Text>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          placeholder="e.g. my apartment, campus..."
          placeholderTextColor="#9BA19B"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Where are you going?</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. SLO Airport, internship..."
          placeholderTextColor="#9BA19B"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>What date are you leaving?</Text>
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={departureTime}
            mode="date"
            display="spinner"
            onChange={(_, selectedDate) => {
              if (!selectedDate) return;
              const next = new Date(departureTime);
              next.setFullYear(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
              );
              setDepartureTime(next);
            }}
          />
        </View>
        <Text style={styles.fieldLabel}>What time are you leaving?</Text>
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={departureTime}
            mode="time"
            display="spinner"
            is24Hour={false}
            onChange={(_, selectedTime) => {
              if (!selectedTime) return;
              const next = new Date(departureTime);
              next.setHours(
                selectedTime.getHours(),
                selectedTime.getMinutes(),
                0,
                0,
              );
              setDepartureTime(next);
            }}
          />
        </View>
        <Text style={styles.helper}>
          Choose the date, hour, minute, and AM/PM for the ride.
        </Text>
        <Text style={styles.fieldLabel}>Number of passengers</Text>
        <TextInput
          value={seats}
          onChangeText={setSeats}
          placeholder="1–4"
          placeholderTextColor="#9BA19B"
          style={styles.input}
          keyboardType="number-pad"
        />
        <Pressable
          disabled={!canPost}
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={() =>
            onPosted({
              originZone: zoneForLocation(origin, "north-campus"),
              originLocation: origin.trim(),
              destinationZone: zoneForLocation(destination, "downtown"),
              destinationLocation: destination.trim(),
              departureStart: departureTime.toISOString(),
              departureEnd: departureEnd.toISOString(),
              seatsOpen: seatCount,
              maxDetourMinutes: 0,
              preferenceTags: ["quiet_ride"],
            })
          }
        >
          <Text style={styles.postButtonText}>Post open ride</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFF" />
        </Pressable>
        <Text style={styles.helper}>
          You are sharing a broad route, not a precise address. Riders only see
          the public location name.
        </Text>
      </View>
    </>
  );
}
function Profile({
  actor,
  onChange,
}: {
  actor: { id: StudentId; displayName: string };
  onChange: (id: StudentId) => void;
}) {
  const profile = getDemoProfile(actor.id);
  const demoStudents = [
    { id: JORDAN_ID, displayName: "Jordan" },
    { id: MAYA_ID, displayName: "Maya" },
    { id: SAM_ID, displayName: "Sam" },
  ];

  return (
    <>
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>Your profile</Text>
        <Text style={styles.subtitle}>Demo details for the hackathon walkthrough</Text>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.bigAvatar}>
          <Text style={styles.bigAvatarText}>{actor.displayName[0]}</Text>
        </View>
        <Text style={styles.profileName}>{actor.displayName}</Text>
        <Text style={styles.verified}>✓ Verified Cal Poly student</Text>
        <View style={styles.profileStats}>
          <ProfileStat icon="school-outline" label="Major" value={profile.major} />
          <ProfileStat icon="calendar-outline" label="Class" value={profile.classYear} />
        </View>
      </View>
      <View style={styles.profileSectionCard}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileSectionIcon}>
            <Ionicons name={profile.vehicleIcon} size={19} color="#28584D" />
          </View>
          <View style={styles.profileSectionCopy}>
            <Text style={styles.profileSectionEyebrow}>{profile.rideRole}</Text>
            <Text style={styles.profileSectionTitle}>{profile.vehicleTitle}</Text>
          </View>
        </View>
        <Text style={styles.profileSectionBody}>{profile.vehicleDetail}</Text>
        <View style={styles.preferenceDivider} />
        <Text style={styles.preferenceLabel}>Ride preferences</Text>
        <View style={styles.preferenceRow}>
          {profile.preferences.map((preference) => (
            <View key={preference} style={styles.preferenceChip}>
              <Text style={styles.preferenceChipText}>{preference}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.profilePrivacyCard}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#28584D" />
        <View style={styles.profilePrivacyCopy}>
          <Text style={styles.profilePrivacyTitle}>Privacy by default</Text>
          <Text style={styles.profilePrivacyBody}>
            PolyPassenger shares only your first name, campus verification, and broad ride details before a ride is accepted.
          </Text>
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Switch demo session</Text>
        <Text style={styles.helper}>
          Preview rider and driver views without editing another student's profile.
        </Text>
        {demoStudents.map((student) => (
          <Pressable
            key={student.id}
            style={[styles.choice, student.id === actor.id && styles.choiceActive]}
            onPress={() => onChange(student.id)}
          >
            <Text style={[styles.choiceText, student.id === actor.id && styles.choiceTextActive]}>
              {student.displayName}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#969993" />
          </Pressable>
        ))}
      </View>
    </>
  );
}
function ProfileStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileStat}>
      <View style={styles.profileStatLabelRow}>
        <Ionicons name={icon} size={13} color="#B8D0C3" />
        <Text style={styles.profileStatLabel}>{label}</Text>
      </View>
      <Text style={styles.profileStatValue}>{value}</Text>
    </View>
  );
}

function getDemoProfile(studentId: StudentId) {
  if (studentId === MAYA_ID) {
    return {
      major: "Environmental Engineering",
      classYear: "2026",
      rideRole: "DRIVER PROFILE",
      vehicleTitle: "2019 Subaru Crosstrek",
      vehicleDetail: "Up to 3 passengers with small bags. Voluntary campus and SLO routes only.",
      vehicleIcon: "car-sport-outline" as const,
      preferences: ["Quiet ride", "Small bags", "On-time"],
    };
  }

  if (studentId === SAM_ID) {
    return {
      major: "Computer Science",
      classYear: "2027",
      rideRole: "DRIVER PROFILE",
      vehicleTitle: "2020 Toyota Corolla",
      vehicleDetail: "Up to 2 passengers with a small bag. Voluntary campus and SLO routes only.",
      vehicleIcon: "car-sport-outline" as const,
      preferences: ["Conversation optional", "Small bags", "On-time"],
    };
  }

  return {
    major: "Biomedical Engineering",
    classYear: "2027",
    rideRole: "RIDER PROFILE",
    vehicleTitle: "No vehicle listed",
    vehicleDetail: "Looking for dependable rides around campus and San Luis Obispo.",
    vehicleIcon: "walk-outline" as const,
    preferences: ["Quiet ride", "On-time", "Backpack only"],
  };
}

function Action({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color="#163B35" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionBody}>{body}</Text>
    </Pressable>
  );
}
function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{n}</Text>
      <View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}
function Nav({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={[styles.navIcon, active && styles.navIconActive]}>
        <Ionicons
          name={icon}
          size={20}
          color={active ? "#17201E" : "#C8CEC8"}
        />
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
