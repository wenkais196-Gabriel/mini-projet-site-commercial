/* @ts-check */

/**
 * Checkbox — reusable checkbox. Controlled component: the state lives one level up.
 *
 * Course: it is one of the three atoms of the exercise 4 component model (the
 * SearchBar is built as Input + Checkbox + Range). No screen uses it at the moment:
 * the only checkbox of the course's SearchBar filtered the stock alerts, a criterion
 * the assignment does not ask for, and it was removed when the project was brought
 * back to the exact scope. It is kept because it belongs to the reusable set that the
 * component diagram documents; wiring it back means giving it a criterion of its own.
 *
 * @param {{ id: string, label: string, checked: boolean,
 *           onChange: (checked: boolean) => void }} props
 */
export function Checkbox({ id, label, checked, onChange }) {
  return (
    <div className="form-check">
      <input
        id={id}
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label className="form-check-label small" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
