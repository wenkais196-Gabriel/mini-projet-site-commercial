export function RangeFiltre({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) {
  return (
    <div>
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        type="range"
        className="form-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(evenement) =>
          onChange(Number(evenement.target.value))
        }
      />
    </div>
  );
}