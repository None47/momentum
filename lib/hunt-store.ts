// ============================================================
// MOMENTUM — Hunt Store (Application + Offer Tracker)
// ============================================================

const KEYS = {
  applications: "momentum_hunt_apps",
  internships: "momentum_hunt_internships",
  offers: "momentum_hunt_offers",
  negotiations: "momentum_hunt_negotiations",
} as const;

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key: string, v: unknown) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(v)); }

// ── Applications ──────────────────────────────────────────
export type AppStatus = "APPLIED" | "OA" | "INTERVIEW" | "OFFER" | "REJECTED";
export type AppSource = "LinkedIn" | "Referral" | "Direct" | "Naukri" | "Other";
export type AppRole = "SDE" | "ML Engineer" | "AI Engineer" | "Intern" | "Other";

export interface Application {
  id: string;
  company: string;
  role: AppRole;
  status: AppStatus;
  dateApplied: string;
  source: AppSource;
  jobUrl: string;
  ctcRange: string;
  contactPerson: string;
  contactLinkedIn: string;
  referralUsed: boolean;
  referralCousin: string;
  followUpDate: string;
  notes: string;
}

export function getApplications(): Application[] { return read<Application[]>(KEYS.applications, []); }
export function addApplication(app: Application) { const all = getApplications(); all.push(app); write(KEYS.applications, all); }
export function updateApplication(id: string, updates: Partial<Application>) {
  const all = getApplications();
  const idx = all.findIndex((a) => a.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; write(KEYS.applications, all); }
}
export function deleteApplication(id: string) { write(KEYS.applications, getApplications().filter((a) => a.id !== id)); }

export function getAppStats() {
  const apps = getApplications();
  return {
    total: apps.length,
    applied: apps.filter((a) => a.status === "APPLIED").length,
    oa: apps.filter((a) => a.status === "OA").length,
    interview: apps.filter((a) => a.status === "INTERVIEW").length,
    offers: apps.filter((a) => a.status === "OFFER").length,
    rejected: apps.filter((a) => a.status === "REJECTED").length,
    responseRate: apps.length > 0 ? Math.round((apps.filter((a) => a.status !== "APPLIED").length / apps.length) * 100) : 0,
  };
}

export function getFollowUpReminders(): Application[] {
  const apps = getApplications().filter((a) => a.status === "APPLIED");
  const now = Date.now();
  return apps.filter((a) => {
    const applied = new Date(a.dateApplied).getTime();
    return now - applied > 7 * 86400000;
  });
}

// ── Internships ───────────────────────────────────────────
export interface Internship {
  id: string;
  company: string;
  startDate: string;
  endDate: string;
  stipend: number;
  manager: string;
  projects: string;
  rating: number;
  gotRecommendation: boolean;
}
export function getInternships(): Internship[] { return read<Internship[]>(KEYS.internships, []); }
export function addInternship(i: Internship) { const all = getInternships(); all.push(i); write(KEYS.internships, all); }

// ── Offers ────────────────────────────────────────────────
export type CompanyTier = "FAANG" | "Unicorn" | "Startup" | "MNC" | "Other";
export interface Offer {
  id: string;
  company: string;
  tier: CompanyTier;
  role: string;
  baseLPA: number;
  bonusLPA: number;
  equityLPA: number;
  totalCTC: number;
  joiningDate: string;
  deadline: string;
  location: string;
  techStack: string;
  growthPotential: number;
  notes: string;
}
export function getOffers(): Offer[] { return read<Offer[]>(KEYS.offers, []); }
export function addOffer(o: Offer) { const all = getOffers(); all.push(o); write(KEYS.offers, all); }
export function updateOffer(id: string, updates: Partial<Offer>) {
  const all = getOffers();
  const idx = all.findIndex((o) => o.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; write(KEYS.offers, all); }
}
export function getBestOffer(): number { const offers = getOffers(); return offers.length > 0 ? Math.max(...offers.map((o) => o.totalCTC)) : 0; }

// ── Negotiations ──────────────────────────────────────────
export interface NegotiationRound { amount: number; date: string; response: string; }
export interface Negotiation { offerId: string; initial: number; rounds: NegotiationRound[]; finalOffer: number; }
export function getNegotiations(): Negotiation[] { return read<Negotiation[]>(KEYS.negotiations, []); }
export function addNegotiation(n: Negotiation) { const all = getNegotiations(); all.push(n); write(KEYS.negotiations, all); }

// ── Cousin Referrals ──────────────────────────────────────
export const COUSIN_REFERRALS = [
  { company: "Apple", status: "WAITING", unlockDate: "Oct 2026" },
  { company: "Microsoft", status: "WAITING", unlockDate: "Oct 2026" },
  { company: "Amazon", status: "WAITING", unlockDate: "Oct 2026" },
  { company: "Flipkart", status: "WAITING", unlockDate: "Oct 2026" },
  { company: "Walmart", status: "WAITING", unlockDate: "Oct 2026" },
];
