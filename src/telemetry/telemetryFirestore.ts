import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { DeviceInfo } from "./deviceInfo";

const BUG_REPORTS = "telemetry-bug-reports";
const ERRORS = "telemetry-errors";
const ANALYTICS = "telemetry-analytics";
const META_COLLECTION = "telemetry-meta";
const META_DOC = "today";

const BUDGET_LIMIT = 15_000;

// ── Bug Reports ──

export interface BugReportData {
  description: string;
  currentScene: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  registrySnapshot: Record<string, unknown>;
}

export async function submitBugReport(data: BugReportData): Promise<void> {
  await addDoc(collection(db, BUG_REPORTS), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

// ── Error Logs ──

export interface ErrorData {
  message: string;
  stack: string;
  type: "error" | "unhandledrejection";
  currentScene: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  url: string;
}

export async function submitError(data: ErrorData): Promise<void> {
  await addDoc(collection(db, ERRORS), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

// ── Analytics ──

export interface AnalyticsData {
  sessionId: string;
  deviceInfo: DeviceInfo;
  events: Array<Record<string, unknown>>;
}

export async function submitAnalytics(data: AnalyticsData): Promise<void> {
  await addDoc(collection(db, ANALYTICS), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

// ── Budget Counter ──

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Check if there is budget remaining for telemetry writes today.
 * If yes, reserves `estimatedWrites` by incrementing the counter.
 * Returns true if telemetry should be enabled.
 */
export async function checkAndReserveBudget(
  estimatedWrites: number,
): Promise<boolean> {
  const ref = doc(db, META_COLLECTION, META_DOC);
  const today = todayString();

  try {
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data().date !== today) {
      // First session today (or first ever) — reset counter
      await setDoc(ref, { date: today, count: estimatedWrites });
      return true;
    }

    const currentCount = snap.data().count ?? 0;
    if (currentCount >= BUDGET_LIMIT) {
      return false;
    }

    // Reserve budget for this session
    await setDoc(ref, { count: increment(estimatedWrites) }, { merge: true });
    return true;
  } catch {
    // Firestore error — enable optimistically
    return true;
  }
}
