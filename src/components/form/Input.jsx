/* @ts-check */

/**
 * Input — reusable text field. It knows nothing about the application: it shows a
 * value and reports changes (reverse data flow). Reused by every form of the app.
 *
 * @param {{ id: string, label: string, value: string, placeholder?: string,
 *           onChange: (value: string) => void }} props
 */
export function Input({ id, label, value, placeholder = "", onChange }) {
  return (
    <div>
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="form-control form-control-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
