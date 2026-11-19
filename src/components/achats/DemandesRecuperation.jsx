/**
 * DemandesRecuperation.jsx — Demandes de récupération (Achats)
 * Lit / écrit uniquement achat_demandes_recuperation.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Truck, Eye, Search, ChevronLeft, Loader2, RefreshCw, Plus,
  CheckCircle, Package, Edit2,
} from 'lucide-react';
import { usePurchaseRecoveryRequests } from '../../hooks/usePurchaseRecoveryRequests';
import { useAuth } from '../../hooks/useAuth';
import { listPurchaseRequests } from '../../services/achats/purchaseRequests';
import { listVehicles } from '../../services/logistique/vehicles';
import {
  RECOVERY_STATUTS,
  recoveryStatutLabel,
  recoveryStatutBadge,
} from '../../services/achats/purchaseRecoveryRequests';
import {
  INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE,
  KpiCard, EmptyState, Modal, SectionTitle, FField, FRow,
} from './shared.jsx';

const EMPTY_FORM = {
  quoi: '',
  statut: 'a_planifier',
  purchase_request_id: '',
  purchase_request_ref: '',
  purchase_oa_ref: '',
  fournisseur: '',
  projet: '',
  chauffeur: '',
  vehicule: '',
  date_recuperation: '',
  depart: '',
  destination: '',
  destination_project_id: '',
  remarque: '',
  passage_depot: false,
};

const NEXT_STATUS = {
  a_planifier: 'en_transport',
  en_transport: 'traitee',
};

function toFormState(item) {
  if (!item) return { ...EMPTY_FORM };
  return {
    quoi: item.quoi || '',
    statut: item.statut || 'a_planifier',
    purchase_request_id: item.purchase_request_id || '',
    purchase_request_ref: item.purchase_request_ref || '',
    purchase_oa_ref: item.purchase_oa_ref || '',
    fournisseur: item.fournisseur || '',
    projet: item.projet || '',
    chauffeur: item.chauffeur || '',
    vehicule: item.vehicule || '',
    date_recuperation: item.date_recuperation || '',
    depart: item.depart || '',
    destination: item.destination || '',
    destination_project_id: item.destination_project_id || '',
    remarque: item.remarque || '',
    passage_depot: Boolean(item.passage_depot),
  };
}

function vehicleOptionLabel(v) {
  const plate = v.matricule || v.matricule_ww || '';
  const name = v.vehicule || [v.marque, v.modele].filter(Boolean).join(' ');
  return [plate, name].filter(Boolean).join(' — ') || 'Véhicule';
}

function RecoveryForm({ form, setForm, purchaseOptions, vehicles, errors }) {
  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPurchaseChange(id) {
    const pr = purchaseOptions.find((p) => p.id === id);
    if (!pr) {
      setForm((prev) => ({
        ...prev,
        purchase_request_id: '',
        purchase_request_ref: '',
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      purchase_request_id: pr.id,
      purchase_request_ref: pr.ref || '',
      fournisseur: prev.fournisseur || pr.fournisseur || pr.supplier_name || '',
      projet: prev.projet || pr.projet_lie || pr.project_name || '',
      quoi: prev.quoi || pr.titre || '',
      depart: prev.depart || pr.fournisseur || pr.supplier_name || '',
      destination: prev.destination || pr.projet_lie || pr.project_name || '',
      destination_project_id: prev.destination_project_id || pr.project_id || '',
    }));
  }

  function onVehicleChange(id) {
    const v = vehicles.find((x) => x.id === id);
    if (!v) {
      set('vehicule', '');
      return;
    }
    setForm((prev) => ({
      ...prev,
      vehicule: vehicleOptionLabel(v),
      chauffeur: prev.chauffeur || v.chauffeur || '',
    }));
  }

  const selectedVehicleId = vehicles.find((v) => vehicleOptionLabel(v) === form.vehicule)?.id || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FRow>
        <FField label="Objet / Quoi" required>
          <input value={form.quoi} onChange={(e) => set('quoi', e.target.value)} style={INPUT_STYLE} placeholder="Ex. ÉLECTRICITÉ" />
          {errors.quoi && <div style={{ color: 'var(--red)', fontSize: '0.72rem', marginTop: 4 }}>{errors.quoi}</div>}
        </FField>
        <FField label="Date de récupération">
          <input type="date" value={form.date_recuperation} onChange={(e) => set('date_recuperation', e.target.value)} style={INPUT_STYLE} />
        </FField>
      </FRow>

      <FRow>
        <FField label="Demande d'achat liée">
          <select
            value={form.purchase_request_id || ''}
            onChange={(e) => onPurchaseChange(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="">— Aucune —</option>
            {purchaseOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.ref} — {p.titre || 'Sans titre'}</option>
            ))}
          </select>
        </FField>
        <FField label="Réf. OA (si connue)">
          <input value={form.purchase_oa_ref} onChange={(e) => set('purchase_oa_ref', e.target.value)} style={INPUT_STYLE} placeholder="OA-2026-…" />
        </FField>
      </FRow>

      <FRow>
        <FField label="Fournisseur / Départ">
          <input value={form.depart} onChange={(e) => { set('depart', e.target.value); if (!form.fournisseur) set('fournisseur', e.target.value); }} style={INPUT_STYLE} placeholder="Lieu de récupération" />
        </FField>
        <FField label="Fournisseur (libellé)">
          <input value={form.fournisseur} onChange={(e) => set('fournisseur', e.target.value)} style={INPUT_STYLE} />
        </FField>
      </FRow>

      <FRow>
        <FField label="Destination">
          <input value={form.destination} onChange={(e) => set('destination', e.target.value)} style={INPUT_STYLE} placeholder="Projet ou dépôt" />
        </FField>
        <FField label="Projet (libellé)">
          <input value={form.projet} onChange={(e) => set('projet', e.target.value)} style={INPUT_STYLE} />
        </FField>
      </FRow>

      <FRow>
        <FField label="Véhicule">
          <select value={selectedVehicleId} onChange={(e) => onVehicleChange(e.target.value)} style={SELECT_STYLE}>
            <option value="">— Saisie libre ci-dessous —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{vehicleOptionLabel(v)}</option>
            ))}
          </select>
          <input
            value={form.vehicule}
            onChange={(e) => set('vehicule', e.target.value)}
            style={{ ...INPUT_STYLE, marginTop: 6 }}
            placeholder="Ex. 19699-Y-6 — FORD TRANSIT"
          />
        </FField>
        <FField label="Chauffeur">
          <input value={form.chauffeur} onChange={(e) => set('chauffeur', e.target.value)} style={INPUT_STYLE} />
        </FField>
      </FRow>

      <FField label="Remarque / Articles à récupérer">
        <textarea value={form.remarque} onChange={(e) => set('remarque', e.target.value)} style={TEXTAREA_STYLE} rows={4} placeholder="Liste des articles…" />
      </FField>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 600 }}>
        <input type="checkbox" checked={Boolean(form.passage_depot)} onChange={(e) => set('passage_depot', e.target.checked)} />
        Passage dépôt
      </label>
    </div>
  );
}

function DetailRecovery({ item, onBack, onEdit, onStatusChange, saving }) {
  const next = NEXT_STATUS[item.statut];

  return (
    <div className="animate-fade-in">
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={onBack}>
        <ChevronLeft size={15} /> Retour
      </button>

      <div className="flex-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{item.ref}</h1>
          <p className="page-subtitle">{item.quoi || 'Demande de récupération'}</p>
        </div>
        <span className={`badge ${recoveryStatutBadge(item.statut)}`}>{recoveryStatutLabel(item.statut)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div className="card">
          <SectionTitle icon={<Truck size={12} />}>Détails</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.84rem' }}>
            {[
              ['Demandeur', item.qui],
              ['Date demande', item.quand],
              ['Date récupération', item.date_recuperation],
              ['Demande d\'achat', item.purchase_request_ref],
              ['Ordre d\'achat', item.purchase_oa_ref],
              ['Fournisseur', item.fournisseur || item.depart],
              ['Départ', item.depart],
              ['Destination', item.destination],
              ['Projet', item.projet],
              ['Chauffeur', item.chauffeur],
              ['Véhicule', item.vehicule],
              ['Passage dépôt', item.passage_depot ? 'Oui' : 'Non'],
            ].map(([l, v]) => (
              <div key={l}>
                <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>{l}</span>
                <div style={{ fontWeight: 600 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {item.remarque && (
            <div style={{ marginTop: 16 }}>
              <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Remarque</span>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', fontSize: '0.84rem', margin: '6px 0 0', fontWeight: 600 }}>{item.remarque}</pre>
            </div>
          )}
        </div>

        <div className="card">
          <SectionTitle>Actions</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
              <Edit2 size={13} /> Modifier
            </button>
            {next && (
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => onStatusChange(item.id, next)}>
                {next === 'en_transport' && <><Truck size={13} /> Mettre en transport</>}
                {next === 'traitee' && <><CheckCircle size={13} /> Marquer traitée</>}
              </button>
            )}
            {item.statut !== 'annulee' && item.statut !== 'traitee' && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} disabled={saving} onClick={() => onStatusChange(item.id, 'annulee')}>
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemandesRecuperation() {
  const { user } = useAuth();
  const { records, loading, saving, error, reload, save, setStatus } = usePurchaseRecoveryRequests();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [purchaseOptions, setPurchaseOptions] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prs, vehs] = await Promise.all([
          listPurchaseRequests().catch(() => []),
          listVehicles().catch(() => []),
        ]);
        if (!active) return;
        setPurchaseOptions((prs || []).slice(0, 300));
        setVehicles(vehs || []);
      } catch {
        /* options secondaires — lecture seule */
      }
    })();
    return () => { active = false; };
  }, []);

  const detail = useMemo(
    () => records.find((r) => r.id === detailId) || null,
    [records, detailId],
  );

  const filtered = records.filter((r) => {
    const q = search.toLowerCase().trim();
    const matchQ = !q
      || r.ref?.toLowerCase().includes(q)
      || r.quoi?.toLowerCase().includes(q)
      || r.qui?.toLowerCase().includes(q)
      || r.fournisseur?.toLowerCase().includes(q)
      || r.depart?.toLowerCase().includes(q)
      || r.destination?.toLowerCase().includes(q)
      || r.projet?.toLowerCase().includes(q)
      || r.chauffeur?.toLowerCase().includes(q)
      || r.purchase_request_ref?.toLowerCase().includes(q);
    return matchQ && (!filterStatut || r.statut === filterStatut);
  });

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date_recuperation: new Date().toISOString().slice(0, 10) });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditId(item.id);
    setForm(toFormState(item));
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errors = {};
    if (!form.quoi.trim()) errors.quoi = 'Requis';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await save(form, editId, { quiName: user?.nom || '' });
    if (result.success) {
      setModalOpen(false);
      if (result.record?.id) setDetailId(result.record.id);
    }
  }

  async function handleStatusChange(id, statut) {
    const result = await setStatus(id, statut);
    if (!result.success && result.error) window.alert(result.error);
  }

  if (detailId && detail) {
    return (
      <DetailRecovery
        item={detail}
        onBack={() => setDetailId(null)}
        onEdit={() => openEdit(detail)}
        onStatusChange={handleStatusChange}
        saving={saving}
      />
    );
  }

  const total = records.length;
  const enTransport = records.filter((r) => r.statut === 'en_transport').length;
  const traitees = records.filter((r) => r.statut === 'traitee').length;
  const aPlanifier = records.filter((r) => r.statut === 'a_planifier').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">DEMANDES DE RÉCUPÉRATION</h1>
          <p className="page-subtitle">Organisation des récupérations fournisseur → chantier / dépôt.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> Nouvelle demande
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ marginBottom: 14, color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 20 }}>
        <KpiCard icon={<Package size={17} />} label="Total" value={total} color="blue" />
        <KpiCard icon={<Truck size={17} />} label="À planifier" value={aPlanifier} color="orange" />
        <KpiCard icon={<Truck size={17} />} label="En transport" value={enTransport} color="purple" />
        <KpiCard icon={<CheckCircle size={17} />} label="Traitées" value={traitees} color="green" />
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Réf., objet, fournisseur, projet, chauffeur…"
              style={{ ...INPUT_STYLE, paddingLeft: 32 }}
            />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ ...SELECT_STYLE, maxWidth: 220 }}>
            <option value="">Tous statuts</option>
            {RECOVERY_STATUTS.map((s) => (
              <option key={s} value={s}>{recoveryStatutLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} className="cin-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Truck size={24} />}
            title="Aucune demande de récupération"
            sub="Créez une demande pour organiser une récupération chez un fournisseur."
            action="Nouvelle demande"
            onAction={openCreate}
          />
        ) : (
          <div className="table-wrap table-wrap--wide">
            <table>
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Date</th>
                  <th>Quoi</th>
                  <th>DA</th>
                  <th>Départ</th>
                  <th>Destination</th>
                  <th>Chauffeur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{r.ref}</td>
                    <td>{r.date_recuperation || r.quand || '—'}</td>
                    <td>{r.quoi || '—'}</td>
                    <td>{r.purchase_request_ref || '—'}</td>
                    <td>{r.depart || r.fournisseur || '—'}</td>
                    <td>{r.destination || r.projet || '—'}</td>
                    <td>{r.chauffeur || '—'}</td>
                    <td>
                      <span className={`badge ${recoveryStatutBadge(r.statut)}`}>{recoveryStatutLabel(r.statut)}</span>
                      {r.passage_depot ? <span className="badge badge-grey" style={{ marginLeft: 4 }}>Dépôt</span> : null}
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary btn-sm" title="Voir" onClick={() => setDetailId(r.id)}>
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

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editId ? 'Modifier la demande de récupération' : 'Nouvelle demande de récupération'}
        width={720}
      >
        <RecoveryForm
          form={form}
          setForm={setForm}
          purchaseOptions={purchaseOptions}
          vehicles={vehicles}
          errors={formErrors}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setModalOpen(false)}>Annuler</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSubmit}>
            {saving ? <Loader2 size={14} className="cin-spin" /> : null}
            {editId ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
