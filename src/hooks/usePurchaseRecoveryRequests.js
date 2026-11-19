import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatSupabaseError } from '../services/supabase/formatError';
import {
  listRecoveryRequests,
  createRecoveryRequest,
  updateRecoveryRequest,
  updateRecoveryRequestStatus,
} from '../services/achats/purchaseRecoveryRequests';

export function usePurchaseRecoveryRequests() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const configured = isSupabaseConfigured();

  const load = useCallback(async () => {
    if (!configured) {
      setError('Supabase non configuré — vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRecords(await listRecoveryRequests());
    } catch (err) {
      console.error('[CITYMO] usePurchaseRecoveryRequests', err);
      setError(formatSupabaseError(err, 'Erreur chargement demandes de récupération.'));
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(form, id, opts = {}) {
    setSaving(true);
    setError(null);
    try {
      const row = id
        ? await updateRecoveryRequest(id, form)
        : await createRecoveryRequest(form, opts);
      await load();
      return { success: true, record: row };
    } catch (err) {
      const msg = formatSupabaseError(err, 'Erreur enregistrement demande de récupération.');
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id, statut) {
    setSaving(true);
    setError(null);
    try {
      await updateRecoveryRequestStatus(id, statut);
      await load();
      return { success: true };
    } catch (err) {
      const msg = formatSupabaseError(err, 'Erreur mise à jour statut.');
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }

  return {
    records,
    loading,
    saving,
    error,
    reload: load,
    save,
    setStatus,
  };
}
