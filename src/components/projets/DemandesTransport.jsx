/**
 * DemandesTransport.jsx — Demandes de transport (project_transport_requests)
 * Ne touche aucune autre rubrique.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Truck, Eye, Search, ChevronLeft, Loader2, RefreshCw, Plus,
  CheckCircle, Edit2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { listVehicles } from '../../services/logistique/vehicles';
import { listProjectsForSelect } from '../../services/projects/projects';
import {
  TRANSPORT_TYPES,
  TRANSPORT_STATUTS,
  TRANSPORT_PRIORITES,
  transportTypeLabel,
  transportStatutLabel,
  transportStatutBadge,
  transportPrioriteLabel,
  listTransportRequests,
  createTransportRequest,
  updateTransportRequest,
  updateTransportRequestStatus,
} from '../../services/projects/projectTransportRequests';
import { formatSupabaseError } from '../../services/supabase/formatError';

const INPUT = {
  width: '100%', padding: '8px 11px', border: '1.5px solid var(--border)',
  borderRadius: 6, fontSize: '0.86rem', background: '#fff', outline: 'none',
  fontFamily: 'var(--font-body)', color: 'var(--text)', boxSizing: 'border-box',
};
const SELECT = { ...INPUT, cursor: 'pointer' };
const TEXTAREA = { ...INPUT, minHeight: 80, resize: 'vertical' };

const EMPTY_FORM = {
  type: 'evacuation',
  depart: '',
  depart_project_id: '',
  destination: '',
  destination_project_id: '',
  materiel: '',
  quantite: '',
  date_souhaitee: '',
  priorite: 'normale',
  remarque: '',
  statut: 'en_attente_traitement',
  chauffeur: '',
  vehicule: '',
  date_transport: '',
};

function vehicleLabel(v) {
  const plate = v.matricule || v.matricule_ww || '';
  const name = v.vehicule || [v.marque, v.modele].filter(Boolean).join(' ');
  return [plate, name].filter(Boolean).join(' — ') || 'Véhicule';
}

function projectLabel(p) {
  const ref = p.ref || '';
  const nom = p.nom || p.name || '';
  return [ref, nom].filter(Boolean).join(' — ') || nom || ref || 'Projet';
}

function Kpi({ icon, label, value, color }) {
  const colors = { blue: '#1565C0', green: '#2E7D32', orange: '#E65100', grey: 'var(--text-3)' };
  const bgs = { blue: '#E3F2FD', green: '#E8F5E9', orange: '#FFF3E0', grey: 'var(--surface-2)' };
  const c = color || 'grey';
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgs[c], color: colors[c] }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
      }}>
        {label}{required ? <span style={{ color: 'var(--red)' }}> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function toForm(item) {
  if (!item) return { ...EMPTY_FORM, date_souhaitee: new Date().toISOString().slice(0, 10) };
  return {
    type: item.type || 'evacuation',
    depart: item.depart || '',
    depart_project_id: item.depart_project_id || '',
    destination: item.destination || '',
    destination_project_id: item.destination_project_id || '',
    materiel: item.materiel || '',
    quantite: item.quantite || '',
    date_souhaitee: item.date_souhaitee || '',
    priorite: item.priorite || 'normale',
    remarque: item.remarque || '',
    statut: item.statut || 'en_attente_traitement',
    chauffeur: item.chauffeur || '',
    vehicule: item.vehicule || '',
    date_transport: item.date_transport || '',
  };
}

function Detail({ item, onBack, onEdit, onStatus, saving }) {
  return (
    <div className="animate-fade-in">
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={onBack}>
        <ChevronLeft size={15} /> Retour
      </button>
      <div className="flex-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{item.ref}</h1>
          <p className="page-subtitle">{transportTypeLabel(item.type)} — {item.materiel || 'Demande de transport'}</p>
        </div>
        <span className={`badge ${transportStatutBadge(item.statut)}`}>{transportStatutLabel(item.statut)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.84rem' }}>
            {[
              ['Type', transportTypeLabel(item.type)],
              ['Priorité', transportPrioriteLabel(item.priorite)],
              ['Demandeur', item.demandeur_nom],
              ['Date souhaitée', item.date_souhaitee],
              ['Départ', item.depart],
              ['Destination', item.destination],
              ['Matériel', item.materiel],
              ['Quantité', item.quantite],
              ['Chauffeur', item.chauffeur],
              ['Véhicule', item.vehicule],
              ['Date transport', item.date_transport],
              ['Traité par', item.traite_par_nom],
            ].map(([l, v]) => (
              <div key={l}>
                <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>{l}</span>
                <div style={{ fontWeight: 600 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {item.remarque ? (
            <div style={{ marginTop: 14 }}>
              <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Remarque</span>
              <div style={{ fontWeight: 600, marginTop: 4, whiteSpace: 'pre-wrap' }}>{item.remarque}</div>
            </div>
          ) : null}
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={13} /> Modifier</button>
            {item.statut === 'en_attente_traitement' && (
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => onStatus(item.id, 'en_transport')}>
                <Truck size={13} /> Mettre en transport
              </button>
            )}
            {(item.statut === 'en_attente_traitement' || item.statut === 'en_transport') && (
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => onStatus(item.id, 'traitee')}>
                <CheckCircle size={13} /> Marquer traitée
              </button>
            )}
            {item.statut !== 'annulee' && item.statut !== 'traitee' && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} disabled={saving} onClick={() => onStatus(item.id, 'annulee')}>
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemandesTransport() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setError('Session requise. Reconnectez-vous.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [rows, projs, vehs] = await Promise.all([
        listTransportRequests(),
        listProjectsForSelect().catch(() => []),
        listVehicles().catch(() => []),
      ]);
      setRecords(rows);
      setProjects(projs || []);
      setVehicles(vehs || []);
    } catch (err) {
      setError(formatSupabaseError(err, 'Erreur chargement demandes de transport.'));
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => { load(); }, [load]);

  const detail = useMemo(() => records.find((r) => r.id === detailId) || null, [records, detailId]);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase().trim();
    const matchQ = !q
      || r.ref?.toLowerCase().includes(q)
      || r.depart?.toLowerCase().includes(q)
      || r.destination?.toLowerCase().includes(q)
      || r.materiel?.toLowerCase().includes(q)
      || r.demandeur_nom?.toLowerCase().includes(q)
      || r.chauffeur?.toLowerCase().includes(q);
    return matchQ && (!filterStatut || r.statut === filterStatut);
  });

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date_souhaitee: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditId(item.id);
    setForm(toForm(item));
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.materiel.trim() && !form.depart.trim()) {
      window.alert('Renseignez au moins le matériel ou le départ.');
      return;
    }
    setSaving(true);
    try {
      const opts = { demandeurNom: user?.nom || '' };
      if (editId) await updateTransportRequest(editId, form);
      else await createTransportRequest(form, opts);
      setModalOpen(false);
      await load();
    } catch (err) {
      window.alert(formatSupabaseError(err, 'Erreur enregistrement.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id, statut) {
    setSaving(true);
    try {
      await updateTransportRequestStatus(id, statut, { traiteParNom: user?.nom || '' });
      await load();
    } catch (err) {
      window.alert(formatSupabaseError(err, 'Erreur statut.'));
    } finally {
      setSaving(false);
    }
  }

  if (detailId && detail) {
    return (
      <Detail
        item={detail}
        onBack={() => setDetailId(null)}
        onEdit={() => openEdit(detail)}
        onStatus={handleStatus}
        saving={saving}
      />
    );
  }

  const total = records.length;
  const attente = records.filter((r) => r.statut === 'en_attente_traitement').length;
  const enTransport = records.filter((r) => r.statut === 'en_transport').length;
  const traitees = records.filter((r) => r.statut === 'traitee').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">DEMANDES DE TRANSPORT</h1>
          <p className="page-subtitle">Évacuations et transferts entre chantiers / dépôt.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> Nouvelle demande
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ marginBottom: 14, color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 20 }}>
        <Kpi icon={<Truck size={17} />} label="Total" value={total} color="blue" />
        <Kpi icon={<Truck size={17} />} label="En attente" value={attente} color="orange" />
        <Kpi icon={<Truck size={17} />} label="En transport" value={enTransport} color="blue" />
        <Kpi icon={<CheckCircle size={17} />} label="Traitées" value={traitees} color="green" />
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Réf., départ, destination, matériel…" style={{ ...INPUT, paddingLeft: 32 }} />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ ...SELECT, maxWidth: 220 }}>
            <option value="">Tous statuts</option>
            {TRANSPORT_STATUTS.map((s) => <option key={s} value={s}>{transportStatutLabel(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} className="cin-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            Aucune demande de transport.
          </div>
        ) : (
          <div className="table-wrap table-wrap--wide">
            <table>
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Départ</th>
                  <th>Destination</th>
                  <th>Matériel</th>
                  <th>Chauffeur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{r.ref}</td>
                    <td>{transportTypeLabel(r.type)}</td>
                    <td>{r.date_souhaitee || r.date_transport || '—'}</td>
                    <td>{r.depart || '—'}</td>
                    <td>{r.destination || '—'}</td>
                    <td>{r.materiel || '—'}</td>
                    <td>{r.chauffeur || '—'}</td>
                    <td><span className={`badge ${transportStatutBadge(r.statut)}`}>{transportStatutLabel(r.statut)}</span></td>
                    <td>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailId(r.id)}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && !saving && setModalOpen(false)}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>{editId ? 'Modifier la demande' : 'Nouvelle demande de transport'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Type" required>
                <select value={form.type} onChange={(e) => set('type', e.target.value)} style={SELECT}>
                  {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{transportTypeLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Priorité">
                <select value={form.priorite} onChange={(e) => set('priorite', e.target.value)} style={SELECT}>
                  {TRANSPORT_PRIORITES.map((p) => <option key={p} value={p}>{transportPrioriteLabel(p)}</option>)}
                </select>
              </Field>
              <Field label="Date souhaitée">
                <input type="date" value={form.date_souhaitee} onChange={(e) => set('date_souhaitee', e.target.value)} style={INPUT} />
              </Field>
              <Field label="Quantité">
                <input value={form.quantite} onChange={(e) => set('quantite', e.target.value)} style={INPUT} placeholder="ex. 2 voyages" />
              </Field>
              <Field label="Départ (projet / dépôt)">
                <select
                  value={form.depart_project_id || ''}
                  onChange={(e) => {
                    const p = projects.find((x) => String(x.id) === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      depart_project_id: e.target.value,
                      depart: p ? projectLabel(p) : prev.depart,
                    }));
                  }}
                  style={SELECT}
                >
                  <option value="">— Saisie libre —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
                </select>
                <input value={form.depart} onChange={(e) => set('depart', e.target.value)} style={{ ...INPUT, marginTop: 6 }} placeholder="Départ" />
              </Field>
              <Field label="Destination">
                <select
                  value={form.destination_project_id || ''}
                  onChange={(e) => {
                    const p = projects.find((x) => String(x.id) === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      destination_project_id: e.target.value,
                      destination: p ? projectLabel(p) : prev.destination,
                    }));
                  }}
                  style={SELECT}
                >
                  <option value="">— Saisie libre / Dépôt —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
                </select>
                <input value={form.destination} onChange={(e) => set('destination', e.target.value)} style={{ ...INPUT, marginTop: 6 }} placeholder="Destination (ex. Dépôt Khyayta)" />
              </Field>
              <Field label="Véhicule">
                <select
                  value=""
                  onChange={(e) => {
                    const v = vehicles.find((x) => x.id === e.target.value);
                    if (!v) return;
                    setForm((prev) => ({
                      ...prev,
                      vehicule: vehicleLabel(v),
                      chauffeur: prev.chauffeur || v.chauffeur || '',
                    }));
                  }}
                  style={SELECT}
                >
                  <option value="">— Choisir —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
                </select>
                <input value={form.vehicule} onChange={(e) => set('vehicule', e.target.value)} style={{ ...INPUT, marginTop: 6 }} />
              </Field>
              <Field label="Chauffeur">
                <input value={form.chauffeur} onChange={(e) => set('chauffeur', e.target.value)} style={INPUT} />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Matériel" required>
                <textarea value={form.materiel} onChange={(e) => set('materiel', e.target.value)} style={TEXTAREA} rows={3} />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Remarque">
                <textarea value={form.remarque} onChange={(e) => set('remarque', e.target.value)} style={TEXTAREA} rows={2} />
              </Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setModalOpen(false)}>Annuler</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSubmit}>
                {saving ? <Loader2 size={14} className="cin-spin" /> : null}
                {editId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
