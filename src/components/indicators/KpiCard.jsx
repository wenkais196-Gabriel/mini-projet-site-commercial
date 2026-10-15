/**
 * KpiCard — NON-STANDARD component with a "facet": it does not know what it shows.
 *
 * Two possible uses:
 *   <KpiCard label="Produits" value={13} />              → plain display
 *   <KpiCard label="Alertes"><MyGauge/></KpiCard>        → free content
 *
 * This is the `props.children` of the course (facet in CCM vocabulary): the card
 * provides the frame and the title, the caller provides the content. No local state.
 *
 * @param {{ label: string, value?: string|number, unit?: string, detail?: string,
 *           variant?: 'primary'|'alert'|'outOfStock'|'neutral'|'success',
 *           children?: React.ReactNode }} props
 */
const COLORS = {
  primary: "var(--primary-color)",
  alert: "var(--alert-color)",
  outOfStock: "var(--out-of-stock-color)",
  success: "var(--success-color)",
  neutral: "#4b5563",
};

export function KpiCard({ label, value, unit, detail, variant = "primary", children }) {
  return (
    <div className="card kpi h-100 shadow-sm">
      <div className="card-body">
        <div className="kpi-label mb-2">{label}</div>

        {children ?? (
          <div className="kpi-value" style={{ color: COLORS[variant] }}>
            {value}
            {unit ? <span className="fs-5 ms-1 fw-normal">{unit}</span> : null}
          </div>
        )}

        {detail ? <div className="text-muted small mt-2">{detail}</div> : null}
      </div>
    </div>
  );
}
