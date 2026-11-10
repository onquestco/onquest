'use client';

// Pick one of a few options: All / Published / Drafts, or Public / Unlisted / Private.
// A radio group underneath, so arrow keys and screen readers work as people expect.

type Option<Value extends string> = { value: Value; label: string };

type Props<Value extends string> = {
  /** Accessible name of the group, e.g. "Show". */
  label: string;
  options: Option<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function Segmented<Value extends string>({ label, options, value, onChange }: Props<Value>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-pill bg-surface-page p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-pill px-3 text-label has-focus-visible:outline-2 has-focus-visible:outline-brand-strong ${
              selected ? 'bg-brand-strong text-on-brand' : 'text-ink-muted'
            }`}
          >
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
