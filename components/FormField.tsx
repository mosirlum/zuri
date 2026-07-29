"use client";

/**
 * Stable FormField component — prevents focus loss on re-render
 * Use this instead of inline input elements in forms
 */

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  options?: { value: string; label: string }[] | string[];
  full?: boolean;
  disabled?: boolean;
  rows?: number;
}

export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  options,
  full,
  disabled,
  rows,
}: FormFieldProps) {
  const baseClass = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const disabledClass = "w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed";

  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">
        {label}
      </label>

      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={disabled ? disabledClass : baseClass}
        >
          <option value="">— Select —</option>
          {options.map((o: any) => (
            typeof o === "string"
              ? <option key={o} value={o}>{o.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          disabled={disabled}
          className={`${disabled ? disabledClass : baseClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={disabled ? disabledClass : baseClass}
        />
      )}
    </div>
  );
}
