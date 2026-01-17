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

export type KampASubmission = {
  name: string;
  age: number;
  email: string;
};

const SUBMISSIONS = "submissions-kamp-a";
const LEADERBOARD = "leaderbord-kamp-a";

export async function submitKampA(data: KampASubmission) {
  const createdAt = Timestamp.now();

  await addDoc(collection(db, SUBMISSIONS), {
    name: data.name,
    age: data.age,
    email: data.email,
    createdAt,
  });

  await addDoc(collection(db, LEADERBOARD), {
    name: data.name,
    age: data.age,
    createdAt,
  });
}

export async function getLeaderboardKampA(max = 50) {
  const q = query(collection(db, LEADERBOARD), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
