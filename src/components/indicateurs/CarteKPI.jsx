/**
 * CarteKPI — composant NON STANDARD « à facette » : il ne sait pas ce qu'il affiche.
 *
 * Deux usages possibles :
 *   <CarteKPI libelle="Produits" valeur={13} />                  → affichage simple
 *   <CarteKPI libelle="Alertes"><MaJauge/></CarteKPI>            → contenu libre
 *
 * C'est le `props.children` du cours (facette au sens CCM) : la carte fournit le
 * cadre et le titre, l'appelant fournit le contenu. Aucun état local.
 *
 * @param {{ libelle: string, valeur?: string|number, unite?: string,
 *           detail?: string, variante?: 'primaire'|'alerte'|'rupture'|'neutre'|'succes',
 *           children?: React.ReactNode }} props
 */
const COULEURS = {
  primaire: "var(--couleur-primaire)",
  alerte: "var(--couleur-alerte)",
  rupture: "var(--couleur-rupture)",
  succes: "var(--couleur-succes)",
  neutre: "#4b5563",
};

export function CarteKPI({
  libelle,
  valeur,
  unite,
  detail,
  variante = "primaire",
  children,
}) {
  return (
    <div className="card kpi h-100 shadow-sm">
      <div className="card-body">
        <div className="kpi-libelle mb-2">{libelle}</div>

        {children ?? (
          <div className="kpi-valeur" style={{ color: COULEURS[variante] }}>
            {valeur}
            {unite ? <span className="fs-5 ms-1 fw-normal">{unite}</span> : null}
          </div>
        )}

        {detail ? <div className="text-muted small mt-2">{detail}</div> : null}
      </div>
    </div>
  );
}
