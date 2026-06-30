import { STORAGE_KEYS } from './constants.js';

let sponsors = [];
let activities = [];

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(sponsors));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  } catch { /* quota exceeded */ }
}

export function loadFromLocal() {
  try {
    sponsors = JSON.parse(localStorage.getItem(STORAGE_KEYS.SPONSORS) || '[]');
    activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  } catch {
    sponsors = [];
    activities = [];
  }
}

export function replaceSponsors(data) {
  if (!data) return;
  sponsors = data;
  persist();
}

export function replaceActivities(data) {
  if (!data) return;
  activities = data;
  persist();
}

// --- Sponsors ---
export function getSponsors() { return sponsors; }

export function getSponsorById(id) {
  return sponsors.find(s => s.id === id) || null;
}

export function addSponsor(sponsor) {
  sponsors = [...sponsors, sponsor];
  persist();
}

export function updateSponsor(id, updates) {
  sponsors = sponsors.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s);
  persist();
}

export function removeSponsor(id) {
  sponsors = sponsors.filter(s => s.id !== id);
  activities = activities.filter(a => a.sponsorId !== id);
  persist();
}

// --- Activities ---
export function getActivities() { return activities; }

export function getActivitiesForSponsor(sponsorId) {
  return activities
    .filter(a => a.sponsorId === sponsorId)
    .sort((a, b) => (b.logDate || '').localeCompare(a.logDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function addActivity(activity) {
  activities = [activity, ...activities];
  persist();
}

export function removeActivity(id) {
  activities = activities.filter(a => a.id !== id);
  persist();
}

export function getLatestActivityForSponsor(sponsorId) {
  const acts = getActivitiesForSponsor(sponsorId);
  return acts.length > 0 ? acts[0] : null;
}
