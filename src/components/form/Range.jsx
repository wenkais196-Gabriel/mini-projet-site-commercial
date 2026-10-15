/* @ts-check */

/**
 * Range — reusable slider. Always reports a NUMBER (the DOM gives a string).
 * Reused by the product filters and available for any other numeric input.
 *
 * @param {{ id: string, label: string, value: number, min: number, max: number,
 *           step?: number, onChange: (value: number) => void }} props
 */
export function Range({ id, label, value, min, max, step = 1, onChange }) {
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
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
