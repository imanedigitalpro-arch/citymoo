/**
 * repairDuplicateChargeRefs.js
 * Prod annule à tort les dépenses qui partagent la même ref_charge (bug collision).
 * Ici on RÉASSIGNE des refs uniques au lieu d'annuler — sans toucher aux montants / statuts.
 */
import { getSupabase } from '../../lib/supabase';
import { generateChargeRef } from './charges';

const TABLE = 'finance_charges';

/**
 * Pour chaque ref_charge partagée par plusieurs charges non annulées :
 * garde la plus ancienne, attribue une nouvelle ref unique aux autres.
 * @returns {{ repaired: number, groups: number }}
 */
export async function repairDuplicateChargeRefs() {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('id, ref_charge, created_at, statut')
    .neq('statut', 'Annulé')
    .not('ref_charge', 'is', null)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const byRef = new Map();
  for (const row of data || []) {
    const ref = String(row.ref_charge || '').trim();
    if (!ref) continue;
    if (!byRef.has(ref)) byRef.set(ref, []);
    byRef.get(ref).push(row);
  }

  let repaired = 0;
  let groups = 0;
  for (const [, rows] of byRef) {
    if (rows.length < 2) continue;
    groups += 1;
    const [, ...rest] = rows; // keep oldest
    for (const row of rest) {
      const newRef = await generateChargeRef();
      const { error: upErr } = await getSupabase()
        .from(TABLE)
        .update({ ref_charge: newRef, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (upErr) throw upErr;
      repaired += 1;
    }
  }
  return { repaired, groups };
}
