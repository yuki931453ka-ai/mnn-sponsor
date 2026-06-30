const SUPABASE_URL = 'SUPABASE_URL_PLACEHOLDER';
const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY_PLACEHOLDER';

let supabaseClient = null;
let realtimeChannel = null;

function isConfigured() {
  return SUPABASE_URL !== 'SUPABASE_URL_PLACEHOLDER' && SUPABASE_ANON_KEY !== 'SUPABASE_ANON_KEY_PLACEHOLDER';
}

async function loadSupabaseSDK() {
  if (window.supabase) return window.supabase;
  const module = await import('https://esm.sh/@supabase/supabase-js@2');
  return module;
}

export async function initSupabase() {
  if (!isConfigured()) return null;
  try {
    const { createClient } = await loadSupabaseSDK();
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch {
    return null;
  }
}

export function getClient() {
  return supabaseClient;
}

function toCamelCase(row) {
  const map = {
    sponsor_id: 'sponsorId',
    log_date: 'logDate',
    log_type: 'logType',
    approach_reason: 'approachReason',
    relationship_memo: 'relationshipMemo',
    next_action: 'nextAction',
    next_action_date: 'nextActionDate',
    sponsor_tier: 'sponsorTier',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  };
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[map[key] || key] = value;
  }
  return result;
}

function toSnakeCase(obj) {
  const map = {
    sponsorId: 'sponsor_id',
    logDate: 'log_date',
    logType: 'log_type',
    approachReason: 'approach_reason',
    relationshipMemo: 'relationship_memo',
    nextAction: 'next_action',
    nextActionDate: 'next_action_date',
    sponsorTier: 'sponsor_tier',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[map[key] || key] = value;
  }
  return result;
}

// --- Sponsors CRUD ---
export async function fetchSponsors() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('sponsors').select('*').order('created_at');
  if (error) { console.error('fetchSponsors:', error); return null; }
  return data.map(toCamelCase);
}

export async function upsertSponsor(sponsor) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('sponsors').upsert(toSnakeCase(sponsor));
  if (error) { console.error('upsertSponsor:', error); return false; }
  return true;
}

export async function deleteSponsorRemote(sponsorId) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('sponsors').delete().eq('id', sponsorId);
  if (error) { console.error('deleteSponsor:', error); return false; }
  return true;
}

// --- Activity Logs CRUD ---
export async function fetchActivities() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('activity_logs').select('*').order('log_date', { ascending: false });
  if (error) { console.error('fetchActivities:', error); return null; }
  return data.map(toCamelCase);
}

export async function insertActivity(activity) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('activity_logs').insert(toSnakeCase(activity));
  if (error) { console.error('insertActivity:', error); return false; }
  return true;
}

export async function deleteActivityRemote(activityId) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from('activity_logs').delete().eq('id', activityId);
  if (error) { console.error('deleteActivity:', error); return false; }
  return true;
}

// --- Realtime ---
export function subscribeRealtime(onSponsorsChange, onActivitiesChange) {
  if (!supabaseClient) return;
  realtimeChannel = supabaseClient
    .channel('mnn-sponsor-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, () => onSponsorsChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => onActivitiesChange())
    .subscribe();
}

export function unsubscribeRealtime() {
  if (realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// --- Sync ---
export async function syncAllFromRemote() {
  const [sponsors, activities] = await Promise.all([
    fetchSponsors(),
    fetchActivities(),
  ]);
  return { sponsors, activities };
}
