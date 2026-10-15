export function CheckboxFiltre({
  id,
  label,
  checked,
  onChange,
}) {
  return (
    <div className="form-check">
      <input
        id={id}
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onChange={(evenement) => onChange(evenement.target.checked)}
      />

      <label className="form-check-label small" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}