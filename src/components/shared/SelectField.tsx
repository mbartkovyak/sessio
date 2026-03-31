import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  labels,
  required,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  labels?: Record<string, string>;
  required?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation('common');
  const displayPlaceholder = placeholder ?? t('form.select');

  return (
    <div>
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring${disabled ? ' opacity-60 cursor-not-allowed' : ''}`}
        >
          {(!required || !value) && <option value="">{displayPlaceholder}</option>}
          {options.map(o => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
