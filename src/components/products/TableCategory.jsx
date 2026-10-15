/**
 * TableCategory — a "structural" component: the grouping row of the products table.
 *
 * It knows nothing about the products themselves, only that "a category header"
 * has a name and a number of items. It is used as a child of TableProducts.
 *
 * Extracting it into its own component (instead of an inline <tr>) has two
 * benefits: TableProducts only orchestrates, and the component diagram can name
 * this piece — which is exactly what the course's component model does.
 *
 * @param {{ category: string, count: number }} props
 */
export function TableCategory({ category, count }) {
  return (
    <tr className="table-secondary">
      <td colSpan={6} className="fw-semibold">
        {category}
        <span className="text-muted fw-normal ms-2">
          {count} produit{count > 1 ? "s" : ""}
        </span>
      </td>
    </tr>
  );
}
