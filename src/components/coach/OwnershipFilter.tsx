export type OwnershipTab = 'all' | 'personal' | 'school';

interface Props {
  value: OwnershipTab;
  onChange: (tab: OwnershipTab) => void;
}

const TABS: { key: OwnershipTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'school', label: 'School' },
];

export default function OwnershipFilter({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg bg-secondary p-0.5">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === tab.key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
