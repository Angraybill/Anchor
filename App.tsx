import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
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
import {
  joinRide,
  listOpenRides,
  listMyRides,
  postCurrentRide,
  type JoinedRide,
} from "./src/lib/supabase-api";
import { supabase, type SupabaseDatabase } from "./src/lib/supabase";
import Landing from "./src/screens/Landing";
import ProfileSetup, { type StudentProfile } from "./src/screens/ProfileSetup";

type Tab = "home" | "find" | "plan" | "profile";
type OfferCardData = {
  id: OfferId;
  driverId?: StudentId;
  driverName: string;
  originLocation: string;
  destinationLocation: string;
  departureStart: string;
  seatsOpen: number;
  costCents: number;
};
type LiveRide = SupabaseDatabase["public"]["Tables"]["rides"]["Row"];
type SavedProfile = StudentProfile;
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

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return `${fallback} ${error.message}`;
  }

  if (typeof error === "object" && error !== null) {
    const details = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [details.message, details.details, details.hint]
      .filter(
        (part): part is string =>
          typeof part === "string" && part.length > 0,
      )
      .join(" ");
    if (parts) return `${fallback} ${parts}`;
    if (typeof details.code === "string") return `${fallback} Code: ${details.code}`;
  }

  return fallback;
}

function formatCostShare(costCents: number): string {
  return costCents > 0
    ? `$${(costCents / 100).toFixed(2)} voluntary cost share per passenger`
    : "No cost share requested";
}

function savedProfileFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> }): SavedProfile | null {
  const metadata = user.user_metadata ?? {};
  const displayName = metadata.display_name;
  const major = metadata.major;
  const classYear = metadata.class_year;
  const rideRole = metadata.ride_role;
  if (
    typeof user.email !== "string" ||
    typeof displayName !== "string" ||
    typeof major !== "string" ||
    typeof classYear !== "string" ||
    (rideRole !== "rider" && rideRole !== "driver" && rideRole !== "both")
  ) {
    return null;
  }
  return { displayName, email: user.email, major, classYear, rideRole };
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [message, setMessage] = useState(
    "PolyPassengers is ready for your next trip.",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [requestId, setRequestId] = useState("request-jordan-clinic");
  const [liveOffers, setLiveOffers] = useState<
    SupabaseDatabase["public"]["Tables"]["rides"]["Row"][]
  >([]);
  const [liveMyRides, setLiveMyRides] = useState<{
    offered: LiveRide[];
    joined: JoinedRide[];
  }>({ offered: [], joined: [] });
  const liveMode = Boolean(supabase);
  useEffect(
    () => demoClient.subscribe(() => refresh((value) => value + 1)),
    [],
  );
  const loadLiveRides = useCallback(async () => {
    if (!supabase || !authenticated) return;
    try {
      const [openRides, myRides] = await Promise.all([
        listOpenRides(),
        listMyRides(),
      ]);
      setLiveOffers(openRides);
      setLiveMyRides(myRides);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load rides.",
      );
    }
  }, [authenticated]);
  useEffect(() => {
    void loadLiveRides();
  }, [loadLiveRides]);

  async function refreshRides() {
    setRefreshing(true);
    try {
      if (liveMode) await loadLiveRides();
      else refresh((value) => value + 1);
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    if (!authenticated || !supabase) return;
    let active = true;
    setProfileLoading(true);
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setAuthenticated(false);
        setProfile(null);
      } else {
        setAuthEmail(data.user.email ?? "");
        setProfile(savedProfileFromUser(data.user));
      }
      setProfileLoading(false);
      setProfileResolved(true);
    });
    return () => {
      active = false;
    };
  }, [authenticated]);
  const actor = demoClient.currentActor;
  const offeredRides = useMemo(
    () => demoClient.snapshotOffers().filter((offer) => offer.driverId === actor.id),
    [actor],
  );
  const matches = useMemo(
    () =>
      demoClient
        .snapshotMatches(requestId)
        .filter(
          (match) =>
            demoClient.snapshotRequest(match.requestId).riderId === actor.id,
        ),
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
          costCents: offer.costCents,
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
        costCents: offer.cost_cents,
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
        const ride = await postCurrentRide(input, profile?.displayName);
        setLiveMyRides((current) => ({
          ...current,
          offered: [ride, ...current.offered],
        }));
      } else await demoClient.createRouteOffer(input);
      setTab("find");
      setMessage("Your ride is posted. Other students can now join it.");
    } catch (error) {
      setMessage(errorMessage(error, "Could not post ride:"));
    }
  }
  async function joinOffer(offerId: OfferId) {
    try {
      if (liveMode) {
        const ride = liveOffers.find((offer) => offer.id === offerId);
        if (!ride) throw new Error("That ride is no longer available.");
        const joinedRide = await joinRide(offerId, ride.origin_location);
        setLiveOffers((current) =>
          current.filter((offer) => offer.id !== offerId),
        );
        setLiveMyRides((current) => ({
          ...current,
          joined: [
            {
              ride: joinedRide,
              pickupLocation: ride.origin_location,
              joinedAt: new Date().toISOString(),
            },
            ...current.joined.filter((joined) => joined.ride.id !== offerId),
          ],
        }));
      } else {
        const offer = demoClient.snapshotOffer(offerId);
        const match = await demoClient.joinRouteOffer(offerId, offer.originLocation);
        setRequestId(match.requestId);
      }
      setTab("home");
      setMessage("You joined the ride. Pickup is set to the listed departure location.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not join this ride.",
      );
    }
  }

  const displayName = profile?.displayName ?? actor.displayName;
  if (!authenticated) {
    return <Landing onAuthenticated={() => {
      setProfileResolved(false);
      setAuthenticated(true);
    }} />;
  }
  if (profileLoading || (supabase && !profileResolved)) {
    return <SafeAreaView style={styles.safe} />;
  }
  const authClient = supabase;
  async function saveProfile(nextProfile: Omit<SavedProfile, "email">) {
    if (authClient) {
      const { data, error } = await authClient.auth.updateUser({
        data: {
          display_name: nextProfile.displayName,
          major: nextProfile.major,
          class_year: nextProfile.classYear,
          ride_role: nextProfile.rideRole,
        },
      });
      if (error) throw error;
      const saved = savedProfileFromUser(data.user);
      if (!saved) throw new Error("Your profile could not be saved. Please try again.");
      setProfile(saved);
    } else {
      setProfile({
        ...nextProfile,
        email: profile?.email ?? authEmail,
      });
    }
    setEditingProfile(false);
    setMessage("Profile updated.");
  }
  if (authClient && !profile) {
    return <ProfileSetup
      email={authEmail || "your Cal Poly email"}
      onSave={saveProfile}
    />;
  }
  const displayProfile: SavedProfile = profile ?? {
    displayName: actor.displayName,
    email: authEmail,
    major: "Not set",
    classYear: "Not set",
    rideRole: "both",
  };
  if (editingProfile) {
    return (
      <ProfileSetup
        email={displayProfile.email}
        initialProfile={displayProfile}
        allowRideRoleEdit={false}
        onCancel={() => setEditingProfile(false)}
        onSave={saveProfile}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          tab === "home" || tab === "find" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshRides()}
              tintColor="#31594C"
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>POLYPASSENGERS • CAL POLY</Text>
            <Text style={styles.title}>Hey, {displayName}</Text>
            <Text style={styles.subtitle}>
              Make the next commitment easier.
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName[0]}</Text>
          </View>
        </View>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color="#31594C" />
          <Text style={styles.noticeText}>{message}</Text>
        </View>
        {tab === "home" && (
          <Home
            offeredRides={liveMode ? [] : offeredRides}
            matches={
              liveMode
                ? []
                : matches.filter((match) => match.state === "confirmed")
            }
            liveOfferedRides={liveMode ? liveMyRides.offered : []}
            liveJoinedRides={liveMode ? liveMyRides.joined : []}
            onOffer={offer}
            onAccept={accept}
            onCancel={cancel}
          />
        )}
        {tab === "find" && <Find offers={openOffers} onJoin={joinOffer} />}
        {tab === "plan" && <OfferRide onPosted={createOffer} />}
        {tab === "profile" && (
          <Profile
            profile={displayProfile}
            onEdit={() => setEditingProfile(true)}
            onLogout={async () => {
              if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) {
                  setMessage(error.message);
                  return;
                }
              }
              setProfile(null);
              setProfileResolved(false);
              setAuthEmail("");
              setAuthenticated(false);
              setEditingProfile(false);
              setTab("home");
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
  liveOfferedRides,
  liveJoinedRides,
  onOffer,
  onAccept,
  onCancel,
}: {
  offeredRides: ReturnType<typeof demoClient.snapshotOffers>;
  matches: Match[];
  liveOfferedRides: LiveRide[];
  liveJoinedRides: JoinedRide[];
  onOffer: (match: Match, driverId: StudentId) => void;
  onAccept: (match: Match) => void;
  onCancel: (match: Match) => void;
}) {
  const joinedRideCount = matches.length + liveJoinedRides.length;
  const offeredRideCount = offeredRides.length + liveOfferedRides.length;
  const totalRideCount = joinedRideCount + offeredRideCount;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Current Rides</Text>
        <Text style={styles.seeAll}>
          {totalRideCount} active
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your rides</Text>
      </View>
      <Text style={styles.subsectionTitle}>Driving</Text>
      {offeredRideCount === 0 && (
        <Text style={styles.emptySectionText}>None</Text>
      )}
      {offeredRides.map((offer) => (
        <OfferedRideCard key={offer.id} offer={offer} />
      ))}
      {liveOfferedRides.map((ride) => (
        <LiveRideCard key={`offered-${ride.id}`} ride={ride} role="offered" />
      ))}

      <Text style={styles.subsectionTitle}>Passenger</Text>
      {joinedRideCount === 0 && <Text style={styles.emptySectionText}>None</Text>}
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          onOffer={onOffer}
          onAccept={onAccept}
          onCancel={onCancel}
        />
      ))}
      {liveJoinedRides.map((joined) => (
        <LiveRideCard
          key={`joined-${joined.ride.id}`}
          ride={joined.ride}
          role="joined"
          pickupLocation={joined.pickupLocation}
        />
      ))}

    </>
  );
}

function LiveRideCard({
  ride,
  role,
  pickupLocation,
}: {
  ride: LiveRide;
  role: "offered" | "joined";
  pickupLocation?: string;
}) {
  const departure = new Date(ride.departure_start);
  return (
    <View style={styles.matchCard}>
      <Text style={styles.cardKicker}>
        {role === "offered" ? "YOUR OFFERED RIDE" : "JOINED RIDE"}
      </Text>
      <Text style={styles.cardTitle}>
        {role === "offered"
          ? `Driving to ${ride.destination_location}`
          : `${ride.driver_name} is driving to ${ride.destination_location}`}
      </Text>
      <View style={styles.routeLine}>
        <Text style={styles.routeText}>{ride.origin_location}</Text>
        <Ionicons name="arrow-forward" size={15} color="#8A8C88" />
        <Text style={styles.routeText}>{ride.destination_location}</Text>
      </View>
      <Text style={styles.explanation}>
        Leaves {departure.toLocaleDateString([], { month: "short", day: "numeric" })} around {departure.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </Text>
      {role === "offered" ? (
        <Text style={styles.explanation}>
          {ride.seats_open} seat{ride.seats_open === 1 ? "" : "s"} available
        </Text>
      ) : (
        <Text style={styles.pickup}>Pickup: {pickupLocation}</Text>
      )}
      <Text style={styles.costShare}>{formatCostShare(ride.cost_cents)}</Text>
    </View>
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
      <Text style={styles.costShare}>{formatCostShare(offer.costCents)}</Text>
      <Pressable
        style={[styles.darkButtonSmall, styles.joinButton]}
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
      <Text style={styles.costShare}>{formatCostShare(offer.costCents)}</Text>
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
      <Text style={styles.costShare}>{formatCostShare(offer.costCents)}</Text>
      {confirmed && (
        <Text style={styles.pickup}>Pickup: {offer.originLocation}</Text>
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
  onPosted: (input: CreateRouteOfferInput) => void | Promise<void>;
}) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [posting, setPosting] = useState(false);
  const [departureTime, setDepartureTime] = useState(() => {
    const time = new Date();
    time.setDate(time.getDate() + 1);
    time.setHours(6, 55, 0, 0);
    return time;
  });
  const [seats, setSeats] = useState("");
  const [costShare, setCostShare] = useState("0");
  const seatCount = Number(seats);
  const costCents = /^\d+(\.\d{1,2})?$/.test(costShare)
    ? Math.round(Number(costShare) * 100)
    : Number.NaN;
  const departureEnd = new Date(departureTime.getTime() + 10 * 60 * 1000);
  const canPost = Boolean(
    origin.trim() &&
      destination.trim() &&
      Number.isInteger(seatCount) &&
      seatCount >= 1 &&
      seatCount <= 4 &&
      Number.isInteger(costCents) &&
      costCents >= 0 &&
      costCents <= 10000,
  );

  async function submitRide() {
    if (!canPost || posting) return;
    setPosting(true);
    try {
      await onPosted({
        originZone: zoneForLocation(origin, "north-campus"),
        originLocation: origin.trim(),
        destinationZone: zoneForLocation(destination, "downtown"),
        destinationLocation: destination.trim(),
        departureStart: departureTime.toISOString(),
        departureEnd: departureEnd.toISOString(),
        seatsOpen: seatCount,
        costCents,
        maxDetourMinutes: 0,
        preferenceTags: ["quiet_ride"],
      });
    } finally {
      setPosting(false);
    }
  }

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
          placeholder="e.g. Vista Grande, NoMo..."
          placeholderTextColor="#9BA19B"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Where are you going?</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Pismo In-N-Out, SLO Airport..."
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
          placeholder="e.g. 1, 2..."
          placeholderTextColor="#9BA19B"
          style={styles.input}
          keyboardType="number-pad"
        />
        <Text style={styles.fieldLabel}>Voluntary cost share per passenger</Text>
        <TextInput
          value={costShare}
          onChangeText={setCostShare}
          placeholder="0.00"
          placeholderTextColor="#9BA19B"
          style={styles.input}
          keyboardType="decimal-pad"
        />
        <Text style={styles.helper}>
          USD only. PolyPassenger does not collect or process payments.
        </Text>
        <Pressable
          disabled={!canPost || posting}
          style={[
            styles.postButton,
            (!canPost || posting) && styles.postButtonDisabled,
          ]}
          onPress={submitRide}
        >
          <Text style={styles.postButtonText}>
            {posting ? "Posting ride…" : "Post open ride"}
          </Text>
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
  profile,
  onEdit,
  onLogout,
}: {
  profile: SavedProfile;
  onEdit: () => void;
  onLogout: () => Promise<void>;
}) {
  const roleLabel = profile.rideRole === "both" ? "Find and offer rides" : profile.rideRole === "driver" ? "Offer rides" : "Find rides";

  return (
    <>
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>Your profile</Text>
        <Text style={styles.subtitle}>{profile.email}</Text>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.bigAvatar}>
          <Text style={styles.bigAvatarText}>{profile.displayName[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{profile.displayName}</Text>
        <Text style={styles.verified}>✓ Verified Cal Poly student</Text>
        <View style={styles.profileStats}>
          <ProfileStat icon="school-outline" label="Major" value={profile.major} />
          <ProfileStat icon="calendar-outline" label="Class" value={profile.classYear} />
        </View>
      </View>
      <Pressable style={styles.editProfileButton} onPress={onEdit} accessibilityRole="button">
        <Ionicons name="create-outline" size={18} color="#28584D" />
        <Text style={styles.editProfileButtonText}>Edit profile</Text>
      </Pressable>
      <View style={styles.profileSectionCard}>
        <View style={styles.profileSectionHeader}>
          <View style={styles.profileSectionIcon}>
            <Ionicons name={profile.rideRole === "driver" ? "car-outline" : "navigate-outline"} size={19} color="#28584D" />
          </View>
          <View style={styles.profileSectionCopy}>
            <Text style={styles.profileSectionEyebrow}>RIDE PREFERENCE</Text>
            <Text style={styles.profileSectionTitle}>{roleLabel}</Text>
          </View>
        </View>
        <Text style={styles.profileSectionBody}>Your profile is connected to your signed-in Cal Poly email, not a shared demo identity.</Text>
      </View>
      <View style={styles.profilePrivacyCard}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#28584D" />
        <View style={styles.profilePrivacyCopy}>
          <Text style={styles.profilePrivacyTitle}>Privacy by default</Text>
          <Text style={styles.profilePrivacyBody}>
            PolyPassengers shares only your first name, campus verification, and broad ride details before a ride is accepted.
          </Text>
        </View>
      </View>
      <Pressable style={styles.logoutButton} onPress={() => void onLogout()} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={18} color="#9B5D4E" />
        <Text style={styles.logoutButtonText}>Log out</Text>
      </Pressable>
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
