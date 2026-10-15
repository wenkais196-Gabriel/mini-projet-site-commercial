/**
 * QuantitySelector — small NON-STANDARD component, fully REUSABLE.
 *
 * It knows no product: it displays a quantity bounded to [0, max]. This is the
 * component the Order page uses to guarantee "compliance with the available
 * quantity": the user CANNOT enter more than the stock, even by typing (the value
 * is bounded inside the event handler).
 *
 * @param {{ value: number, max: number, onChange: (value: number) => void,
 *           disabled?: boolean }} props
 */
export function QuantitySelector({ value, max, onChange, disabled = false }) {
  const clamp = (requested) => Math.max(0, Math.min(max, requested));

  return (
    <div className="input-group input-group-sm">
      <button
        type="button"
        className="btn btn-outline-secondary"
        disabled={disabled || value <= 0}
        onClick={() => onChange(clamp(value - 1))}
        aria-label="Diminuer la quantité"
      >
        −
      </button>

      <input
        type="number"
        className="form-control text-center"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-label="Quantité commandée"
        onChange={(event) => {
          const typed = Number(event.target.value);
          onChange(clamp(Number.isFinite(typed) ? Math.trunc(typed) : 0));
        }}
      />

      <button
        type="button"
        className="btn btn-outline-secondary"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Augmenter la quantité"
      >
        +
      </button>
    </div>
  );
}
