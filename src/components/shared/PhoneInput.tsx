import { useState, useEffect } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+48', country: 'PL', flag: '🇵🇱' },
  { code: '+380', country: 'UA', flag: '🇺🇦' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+44', country: 'GB', flag: '🇬🇧' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+420', country: 'CZ', flag: '🇨🇿' },
  { code: '+421', country: 'SK', flag: '🇸🇰' },
  { code: '+31', country: 'NL', flag: '🇳🇱' },
  { code: '+46', country: 'SE', flag: '🇸🇪' },
  { code: '+47', country: 'NO', flag: '🇳🇴' },
  { code: '+43', country: 'AT', flag: '🇦🇹' },
  { code: '+41', country: 'CH', flag: '🇨🇭' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
] as const;

/** Parse an E.164 phone string into country code + local number */
function parsePhone(value: string | null | undefined): { countryCode: string; number: string } {
  if (!value) return { countryCode: '+48', number: '' };
  const cleaned = value.replace(/\s/g, '');
  // Try matching longest codes first (e.g. +380 before +3)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (cleaned.startsWith(cc.code)) {
      return { countryCode: cc.code, number: cleaned.slice(cc.code.length) };
    }
  }
  // If no match but starts with +, extract the code
  if (cleaned.startsWith('+')) {
    return { countryCode: '+48', number: cleaned.replace(/^\+\d{1,3}/, '') };
  }
  // Plain number, assume Polish
  return { countryCode: '+48', number: cleaned };
}

interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
}

export default function PhoneInput({ value, onChange, required }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [number, setNumber] = useState(parsed.number);

  // Sync from parent when value changes externally
  useEffect(() => {
    const p = parsePhone(value);
    setCountryCode(p.countryCode);
    setNumber(p.number);
  }, [value]);

  function emit(cc: string, num: string) {
    const digits = num.replace(/\D/g, '');
    onChange(digits ? `${cc}${digits}` : '');
  }

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];

  return (
    <div>
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
        <Phone className="h-3.5 w-3.5" /> Phone {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <select
            value={countryCode}
            onChange={e => { setCountryCode(e.target.value); emit(e.target.value, number); }}
            className="appearance-none rounded-xl border border-input bg-card pl-3 pr-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] w-[115px]"
          >
            {COUNTRY_CODES.map(cc => (
              <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Phone number"
          value={number}
          onChange={e => { setNumber(e.target.value); emit(countryCode, e.target.value); }}
          className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
        />
      </div>
    </div>
  );
}
