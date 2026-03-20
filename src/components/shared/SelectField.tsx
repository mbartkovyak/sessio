import { ChevronDown } from 'lucide-react';

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
