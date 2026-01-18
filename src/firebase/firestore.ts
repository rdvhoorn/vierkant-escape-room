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
const LEADERBOARD = "leaderbord-kamp-a";     // public readable
const PRIZES = "prizes-kamp-a";              // private (contains PII)

export type LeaderboardEntry = {
  id?: string;
  name: string;
  age: number;
  createdAt?: Timestamp;
};

export type PrizeEntry = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  createdAt: Date;          // you pass Date from the scene
  group: 6 | 7 | 8;
  beenBefore: boolean;
  parentsPhone: string;
};

function toTimestamp(d: Date) {
  // Ensure it is a valid date
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
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    age: data.age,
    group: data.group,
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