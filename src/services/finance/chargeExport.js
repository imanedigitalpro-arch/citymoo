/**
 * chargeExport.js — Export Excel (CSV UTF-8) dépenses générales / charges
 */
import { chargeDisplayRef } from './charges';

function esc(v) {
  const s = String(v ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportChargesExcel(charges, { filename } = {}) {
  const header = [
    'Référence',
    'Date',
    'Libellé',
    'Catégorie',
    'Fournisseur',
    'Projet',
    'Département',
    'Montant',
    'Mode paiement',
    'Réf. paiement',
    'Statut',
    'Commentaire',
  ];
  const lines = [header.join(';')];

  (charges || []).forEach((c) => {
    lines.push([
      chargeDisplayRef(c) || c.ref || '',
      c.date || '',
      c.libelle || '',
      c.categorie || '',
      c.fournisseur || '',
      c.projet_lie || '',
      c.departement || '',
      c.montant ?? '',
      c.mode_paiement || '',
      c.ref_paiement || '',
      c.statut || '',
      c.commentaire || '',
    ].map(esc).join(';'));
  });

  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Depenses_generales_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
