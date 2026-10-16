/* @ts-check */

/**
 * Select — reusable drop-down list. It knows nothing about the application: it
 * displays a list of choices and reports the chosen value (reverse data flow),
 * exactly like Input, Checkbox and Range.
 *
 * Why it exists: the category filter of the Products page is a form control of the
 * same family as the other three — "I show a value, I warn when it changes" — so it
 * belongs to the atoms rather than being hand-written inside the orchestrator.
 *
 * `placeholder` is the empty choice ("Toutes les catégories") and is optional: a
 * select without it simply has no "no filter" entry.
 *
 * @param {{ id: string, label: string, value: string,
 *           options: { value: string, label: string }[],
 *           placeholder?: string,
 *           onChange: (value: string) => void }} props
 */
export function Select({ id, label, value, options, placeholder = "", onChange }) {
  return (
    <div>
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
