// firestore.ts
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { app } from "./firebase";

export const db = getFirestore(app);

// Collections (Kamp A)
const LEADERBOARD = "leaderbord-kamp-a"; // public readable
const PRIZES = "prizes-kamp-a"; // private (contains PII)

export type LeaderboardEntry = {
  id?: string;
  name: string;
  age: number;
  createdAt?: Timestamp;
};

export type KampVoorkeur = "A1" | "A2" | "geen";

export type PrizeEntry = {
  // required (*)
  firstName: string; // voornaam*
  lastName: string; // achternaam*
  address: string; // adres*
  postcode: string; // postcode*
  city: string; // plaats*
  email: string; // email*
  phone: string; // telefoon*
  birthdate: string; // geboortedatum* (YYYY-MM-DD)
  groupText: string; // groep* (met eventuele toevoeging)
  school: string; // school*
  campPreference: KampVoorkeur; // kampvoorkeur* (A1/A2/geen)

  // optional
  gender?: string | null; // geslacht (open)

  // kept restrictions fields (from your existing flow)
  age: number; // derived in scene from birthdate (still stored)
  eligibilityGroup: 6 | 7 | 8; // chosen for prize eligibility gating
  beenBefore: boolean;
  parentsPhone: string;

  createdAt: Date; // you pass Date from the scene
};

function toTimestamp(d: Date) {
  const ms = d?.getTime?.();
  if (!Number.isFinite(ms)) return Timestamp.now();
  return Timestamp.fromDate(d);
}

// ---------------------------
// Write: Leaderboard (public)
// ---------------------------
export async function submitLeaderboard(data: LeaderboardEntry) {
  const createdAt = Timestamp.now();

  await addDoc(collection(db, LEADERBOARD), {
    name: data.name,
    age: data.age,
    createdAt,
  });
}

// ---------------------------
// Write: Prizes (private)
// ---------------------------
export async function submitPrizes(data: PrizeEntry) {
  const createdAt = toTimestamp(data.createdAt);

  await addDoc(collection(db, PRIZES), {
    // required dataset
    firstName: data.firstName,
    lastName: data.lastName,
    address: data.address,
    postcode: data.postcode, // store normalized (e.g. "1234 AB") from scene if you want
    city: data.city,
    email: data.email,
    phone: data.phone,
    birthdate: data.birthdate, // "YYYY-MM-DD"
    groupText: data.groupText,
    school: data.school,
    campPreference: data.campPreference,

    // optional
    gender: data.gender ?? null,

    // kept restriction fields
    age: data.age,
    eligibilityGroup: data.eligibilityGroup,
    beenBefore: data.beenBefore,
    parentsPhone: data.parentsPhone,

    createdAt,
  });
}

// ---------------------------
// Read: Leaderboard (public)
// ---------------------------
export async function getLeaderboardKampA(max = 50): Promise<LeaderboardEntry[]> {
  const q = query(collection(db, LEADERBOARD), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data.name ?? ""),
      age: Number(data.age ?? 0),
      createdAt: data.createdAt,
    };
  });
}
