/**
 * TableCategory — a "structural" component: the grouping row of the products table.
 *
 * It knows nothing about the products themselves, only that "a category header"
 * has a name and a number of items. It is used as a child of TableProducts.
 *
 * It is also the ONE place where the category is displayed for the products of the
 * group: RowProduct does not repeat it on every row (see the report, § 4.1).
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
      <td colSpan={4} className="fw-semibold">
        {category}
        <span className="text-muted fw-normal ms-2">
          {count} produit{count > 1 ? "s" : ""}
        </span>
      </td>
    </tr>
  );
}
