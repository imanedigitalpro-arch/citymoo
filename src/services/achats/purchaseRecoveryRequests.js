/**
 * purchaseRecoveryRequests.js — Demandes de récupération (Achats)
 * Table: achat_demandes_recuperation uniquement.
 */
import { getSupabase } from '../../lib/supabase';

const TABLE = 'achat_demandes_recuperation';

export const RECOVERY_STATUTS = Object.freeze([
  'a_planifier',
  'en_transport',
  'traitee',
  'annulee',
]);

export const RECOVERY_STATUT_LABELS = Object.freeze({
  a_planifier: 'À planifier',
  en_transport: 'En transport',
  traitee: 'Traitée',
  annulee: 'Annulée',
});

export const RECOVERY_STATUT_BADGES = Object.freeze({
  a_planifier: 'badge-orange',
  en_transport: 'badge-blue',
  traitee: 'badge-green',
  annulee: 'badge-red',
});

export function recoveryStatutLabel(statut) {
  return RECOVERY_STATUT_LABELS[statut] || statut || '—';
}

export function recoveryStatutBadge(statut) {
  return RECOVERY_STATUT_BADGES[statut] || 'badge-grey';
}

function trimOrEmpty(v) {
  return v == null ? '' : String(v).trim();
}

function trimOrNull(v) {
  const s = trimOrEmpty(v);
  return s || null;
}

export function normalizeRecoveryRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    ref: row.ref || '',
    qui: row.qui || '',
    quand: row.quand || (row.created_at ? String(row.created_at).slice(0, 10) : ''),
    quoi: row.quoi || '',
    statut: row.statut || 'a_planifier',
    created_by: row.created_by || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    payment_order_id: row.payment_order_id || null,
    purchase_request_id: row.purchase_request_id || null,
    purchase_request_ref: row.purchase_request_ref || '',
    purchase_oa_ref: row.purchase_oa_ref || '',
    fournisseur: row.fournisseur || '',
    projet: row.projet || '',
    chauffeur: row.chauffeur || '',
    vehicule: row.vehicule || '',
    date_recuperation: row.date_recuperation || '',
    depart: row.depart || '',
    destination: row.destination || '',
    destination_project_id: row.destination_project_id || null,
    remarque: row.remarque || '',
    passage_depot: Boolean(row.passage_depot),
  };
}

async function requireUser() {
  const { data: { user }, error } = await getSupabase().auth.getUser();
  if (error || !user) throw new Error('Session requise.');
  return user;
}

export async function generateRecoveryRequestRef() {
  const year = new Date().getFullYear();
  const prefix = `DR-${year}-`;
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('ref')
    .like('ref', `${prefix}%`)
    .order('ref', { ascending: false })
    .limit(50);
  if (error) {
    if (error.code === '42P01') return `${prefix}001`;
    throw error;
  }
  let max = 0;
  for (const row of data || []) {
    const m = String(row.ref || '').match(/DR-\d{4}-(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]) || 0);
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function listRecoveryRequests() {
  await requireUser();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []).map(normalizeRecoveryRequest);
}

export async function getRecoveryRequest(id) {
  await requireUser();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return normalizeRecoveryRequest(data);
}

function toRowPayload(form, { forCreate = false, user = null, quiName = '' } = {}) {
  const row = {
    quoi: trimOrNull(form.quoi),
    statut: form.statut || 'a_planifier',
    purchase_request_id: form.purchase_request_id || null,
    purchase_request_ref: trimOrNull(form.purchase_request_ref),
    purchase_oa_ref: trimOrNull(form.purchase_oa_ref),
    payment_order_id: form.payment_order_id || null,
    fournisseur: trimOrNull(form.fournisseur),
    projet: trimOrNull(form.projet),
    chauffeur: trimOrNull(form.chauffeur),
    vehicule: trimOrNull(form.vehicule),
    date_recuperation: trimOrNull(form.date_recuperation) || null,
    depart: trimOrNull(form.depart),
    destination: trimOrNull(form.destination),
    destination_project_id: form.destination_project_id || null,
    remarque: trimOrNull(form.remarque),
    passage_depot: Boolean(form.passage_depot),
    updated_at: new Date().toISOString(),
  };

  if (forCreate) {
    const today = new Date().toISOString().slice(0, 10);
    row.qui = trimOrNull(form.qui) || trimOrNull(quiName) || 'Utilisateur';
    row.quand = trimOrNull(form.quand) || today;
    row.created_by = user?.id || null;
  } else if (form.qui != null) {
    row.qui = trimOrNull(form.qui);
  }
  if (form.quand != null) row.quand = trimOrNull(form.quand) || null;

  return row;
}

export async function createRecoveryRequest(form, { quiName = '' } = {}) {
  const user = await requireUser();
  const ref = form.ref?.trim() || await generateRecoveryRequestRef();
  const payload = {
    ...toRowPayload(form, { forCreate: true, user, quiName }),
    ref,
  };
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeRecoveryRequest(data);
}

export async function updateRecoveryRequest(id, form) {
  await requireUser();
  const payload = toRowPayload(form, { forCreate: false });
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeRecoveryRequest(data);
}

export async function updateRecoveryRequestStatus(id, statut) {
  await requireUser();
  if (!RECOVERY_STATUTS.includes(statut)) {
    throw new Error('Statut invalide.');
  }
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeRecoveryRequest(data);
}
