/**
 * projectTransportRequests.js — Demandes de transport (table project_transport_requests)
 * Lecture / écriture uniquement sur cette table.
 */
import { getSupabase } from '../../lib/supabase';

const TABLE = 'project_transport_requests';

export const TRANSPORT_TYPES = Object.freeze(['evacuation', 'transfert']);
export const TRANSPORT_TYPE_LABELS = Object.freeze({
  evacuation: 'Évacuation',
  transfert: 'Transfert',
});

export const TRANSPORT_STATUTS = Object.freeze([
  'en_attente_traitement',
  'en_transport',
  'traitee',
  'annulee',
]);

export const TRANSPORT_STATUT_LABELS = Object.freeze({
  en_attente_traitement: 'En attente',
  en_transport: 'En transport',
  traitee: 'Traitée',
  annulee: 'Annulée',
});

export const TRANSPORT_STATUT_BADGES = Object.freeze({
  en_attente_traitement: 'badge-orange',
  en_transport: 'badge-blue',
  traitee: 'badge-green',
  annulee: 'badge-red',
});

export const TRANSPORT_PRIORITES = Object.freeze(['normale', 'urgente']);
export const TRANSPORT_PRIORITE_LABELS = Object.freeze({
  normale: 'Normale',
  urgente: 'Urgente',
});

function trimOrEmpty(v) {
  return v == null || v === 'null' ? '' : String(v).trim();
}

function trimOrNull(v) {
  const s = trimOrEmpty(v);
  return s || null;
}

export function transportTypeLabel(t) {
  return TRANSPORT_TYPE_LABELS[t] || t || '—';
}

export function transportStatutLabel(s) {
  return TRANSPORT_STATUT_LABELS[s] || s || '—';
}

export function transportStatutBadge(s) {
  return TRANSPORT_STATUT_BADGES[s] || 'badge-grey';
}

export function transportPrioriteLabel(p) {
  return TRANSPORT_PRIORITE_LABELS[p] || p || '—';
}

export function normalizeTransportRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    ref: row.ref || '',
    type: row.type || 'evacuation',
    depart: row.depart || '',
    depart_project_id: row.depart_project_id || null,
    destination: row.destination || '',
    destination_project_id: row.destination_project_id || null,
    materiel: row.materiel || '',
    quantite: row.quantite || '',
    date_souhaitee: row.date_souhaitee || '',
    priorite: row.priorite || 'normale',
    remarque: row.remarque || '',
    statut: row.statut || 'en_attente_traitement',
    chauffeur: row.chauffeur || '',
    vehicule: row.vehicule || '',
    date_transport: row.date_transport || '',
    demandeur_nom: row.demandeur_nom || '',
    traite_par: row.traite_par || null,
    traite_par_nom: row.traite_par_nom || '',
    created_by: row.created_by || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function requireUser() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) return session.user;
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error('Session requise. Reconnectez-vous.');
  return user;
}

export async function generateTransportRequestRef() {
  const year = new Date().getFullYear();
  const prefix = `TR-${year}-`;
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
    const m = String(row.ref || '').match(/TR-\d{4}-(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]) || 0);
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function listTransportRequests() {
  await requireUser();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []).map(normalizeTransportRequest);
}

export async function getTransportRequest(id) {
  await requireUser();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return normalizeTransportRequest(data);
}

function toRowPayload(form, { forCreate = false, user = null, demandeurNom = '' } = {}) {
  const row = {
    type: form.type || 'evacuation',
    depart: trimOrNull(form.depart),
    depart_project_id: form.depart_project_id || null,
    destination: trimOrNull(form.destination),
    destination_project_id: form.destination_project_id || null,
    materiel: trimOrNull(form.materiel),
    quantite: trimOrNull(form.quantite),
    date_souhaitee: trimOrNull(form.date_souhaitee) || null,
    priorite: form.priorite || 'normale',
    remarque: trimOrNull(form.remarque),
    statut: form.statut || 'en_attente_traitement',
    chauffeur: trimOrNull(form.chauffeur),
    vehicule: trimOrNull(form.vehicule),
    date_transport: trimOrNull(form.date_transport) || null,
    updated_at: new Date().toISOString(),
  };
  if (forCreate) {
    row.demandeur_nom = trimOrNull(form.demandeur_nom) || trimOrNull(demandeurNom) || 'Utilisateur';
    row.created_by = user?.id || null;
  } else if (form.demandeur_nom != null) {
    row.demandeur_nom = trimOrNull(form.demandeur_nom);
  }
  return row;
}

export async function createTransportRequest(form, { demandeurNom = '' } = {}) {
  const user = await requireUser();
  const ref = form.ref?.trim() || await generateTransportRequestRef();
  const payload = {
    ...toRowPayload(form, { forCreate: true, user, demandeurNom }),
    ref,
  };
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeTransportRequest(data);
}

export async function updateTransportRequest(id, form) {
  await requireUser();
  const payload = toRowPayload(form, { forCreate: false });
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeTransportRequest(data);
}

export async function updateTransportRequestStatus(id, statut, { traiteParNom = '' } = {}) {
  const user = await requireUser();
  if (!TRANSPORT_STATUTS.includes(statut)) throw new Error('Statut invalide.');
  const patch = {
    statut,
    updated_at: new Date().toISOString(),
  };
  if (statut === 'traitee' || statut === 'en_transport') {
    patch.traite_par = user.id;
    patch.traite_par_nom = trimOrNull(traiteParNom) || null;
    if (statut === 'traitee' && !patch.date_transport) {
      patch.date_transport = new Date().toISOString().slice(0, 10);
    }
  }
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeTransportRequest(data);
}
