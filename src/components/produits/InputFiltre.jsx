export function InputFiltre({
  id,
  label,
  placeholder = "",
  value,
  onChange,
}) {
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
        onChange={(evenement) => onChange(evenement.target.value)}
      />
    </div>
  );
}
