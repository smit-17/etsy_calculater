import { DEFAULT_SETTINGS, type PricingSettings } from "./pricing";

const K_SETTINGS = "lepdo.settings.v1";
const K_SAVED = "lepdo.saved.v1";
const K_AUTH = "lepdo.auth.v1";
const K_CALC_COUNT = "lepdo.calcCount.v1";
const K_CALC_LOG = "lepdo.calcLog.v1"; // ISO dates of each calculation

export interface SavedPrice {
  id: string;
  date: string; // ISO
  sku: string;
  productName: string;
  cost: number;
  sellingPrice: number;
  originalPrice: number;
  discountPct: number;
  netProfit: number;
  netMargin?: number;
}

export function loadSettings(): PricingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(K_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export function saveSettings(s: PricingSettings) {
  localStorage.setItem(K_SETTINGS, JSON.stringify(s));
}

export function loadSaved(): SavedPrice[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(K_SAVED) || "[]");
  } catch {
    return [];
  }
}
export function writeSaved(list: SavedPrice[]) {
  localStorage.setItem(K_SAVED, JSON.stringify(list));
}
export function addSaved(p: SavedPrice) {
  const list = loadSaved();
  list.unshift(p);
  writeSaved(list);
}
export function updateSaved(id: string, patch: Partial<SavedPrice>) {
  const list = loadSaved().map((r) => (r.id === id ? { ...r, ...patch } : r));
  writeSaved(list);
}
export function deleteSaved(id: string) {
  writeSaved(loadSaved().filter((r) => r.id !== id));
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(K_AUTH) === "1";
}
export function setAuthed(v: boolean) {
  if (v) localStorage.setItem(K_AUTH, "1");
  else localStorage.removeItem(K_AUTH);
}

export function bumpCalcCount(n: number) {
  const cur = parseInt(localStorage.getItem(K_CALC_COUNT) || "0", 10);
  localStorage.setItem(K_CALC_COUNT, String(cur + n));
  const log: string[] = JSON.parse(localStorage.getItem(K_CALC_LOG) || "[]");
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < n; i++) log.push(today);
  localStorage.setItem(K_CALC_LOG, JSON.stringify(log));
}
export function getCalcCount(): number {
  return parseInt(localStorage.getItem(K_CALC_COUNT) || "0", 10);
}
export function getTodayCalcCount(): number {
  const log: string[] = JSON.parse(localStorage.getItem(K_CALC_LOG) || "[]");
  const today = new Date().toISOString().slice(0, 10);
  return log.filter((d) => d === today).length;
}
