/**
 * KpiCard — NON-STANDARD component with a "facet": it does not know WHAT it shows.
 *
 * It supplies the frame and the title; the CALLER supplies the content through
 * `props.children`. This is the "facet" of the course's component model (CCM) — the
 * card decides how the frame looks, the page decides what is displayed:
 *
 *   <KpiCard label="Produits">
 *     <div className="kpi-value">{stats.productCount}</div>
 *   </KpiCard>
 *
 * No local state, and no decision on the content: that is what makes it a facet
 * rather than a component that would impose its own display.
 *
 * @param {{ label: string, children: React.ReactNode }} props
 */
export function KpiCard({ label, children }) {
  return (
    <div className="card kpi h-100 shadow-sm">
      <div className="card-body">
        <div className="kpi-label mb-2">{label}</div>
        {children}
      </div>
    </div>
  );
}
