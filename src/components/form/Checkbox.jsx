/* @ts-check */

/**
 * Checkbox — reusable checkbox. Controlled component: the state lives one level up.
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
