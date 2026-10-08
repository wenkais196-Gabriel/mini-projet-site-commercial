/**
 * SelecteurQuantite — petit composant NON STANDARD, totalement RÉUTILISABLE.
 *
 * Il ne connaît aucun produit : il affiche une quantité bornée dans [0, max].
 * C'est le composant que la page Commande utilise pour garantir « le respect des
 * contraintes de quantité disponible » : l'utilisateur ne PEUT PAS saisir une
 * quantité supérieure au stock, même en tapant au clavier (la valeur est bornée
 * dans le gestionnaire d'événement).
 *
 * @param {{ valeur: number, max: number, onChange: (valeur: number) => void,
 *           disabled?: boolean }} props
 */
export function SelecteurQuantite({ valeur, max, onChange, disabled = false }) {
  const borner = (valeurDemandee) => Math.max(0, Math.min(max, valeurDemandee));

  return (
    <div className="input-group input-group-sm">
      <button
        type="button"
        className="btn btn-outline-secondary"
        disabled={disabled || valeur <= 0}
        onClick={() => onChange(borner(valeur - 1))}
        aria-label="Diminuer la quantité"
      >
        −
      </button>

      <input
        type="number"
        className="form-control text-center"
        min={0}
        max={max}
        step={1}
        value={valeur}
        disabled={disabled}
        aria-label="Quantité commandée"
        onChange={(evenement) => {
          const saisie = Number(evenement.target.value);
          onChange(borner(Number.isFinite(saisie) ? Math.trunc(saisie) : 0));
        }}
      />

      <button
        type="button"
        className="btn btn-outline-secondary"
        disabled={disabled || valeur >= max}
        onClick={() => onChange(borner(valeur + 1))}
        aria-label="Augmenter la quantité"
      >
        +
      </button>
    </div>
  );
}
