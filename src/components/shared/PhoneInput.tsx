import { useState, useEffect } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+48', country: 'PL', flag: '🇵🇱', digits: 9 },
  { code: '+380', country: 'UA', flag: '🇺🇦', digits: 9 },
  { code: '+49', country: 'DE', flag: '🇩🇪', digits: 11 },
  { code: '+44', country: 'GB', flag: '🇬🇧', digits: 10 },
  { code: '+33', country: 'FR', flag: '🇫🇷', digits: 9 },
  { code: '+34', country: 'ES', flag: '🇪🇸', digits: 9 },
  { code: '+39', country: 'IT', flag: '🇮🇹', digits: 10 },
  { code: '+420', country: 'CZ', flag: '🇨🇿', digits: 9 },
  { code: '+421', country: 'SK', flag: '🇸🇰', digits: 9 },
  { code: '+31', country: 'NL', flag: '🇳🇱', digits: 9 },
  { code: '+46', country: 'SE', flag: '🇸🇪', digits: 9 },
  { code: '+47', country: 'NO', flag: '🇳🇴', digits: 8 },
  { code: '+43', country: 'AT', flag: '🇦🇹', digits: 10 },
  { code: '+41', country: 'CH', flag: '🇨🇭', digits: 9 },
  { code: '+1', country: 'US', flag: '🇺🇸', digits: 10 },
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

/** Check if an E.164 phone string has the correct number of digits for its country */
export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const { countryCode, number } = parsePhone(value);
  const cc = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const digits = number.replace(/\D/g, '');
  return digits.length === cc.digits;
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

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const maxDigits = selected.digits;

  function emit(cc: string, num: string) {
    const sel = COUNTRY_CODES.find(c => c.code === cc) ?? COUNTRY_CODES[0];
    const digits = num.replace(/\D/g, '').slice(0, sel.digits);
    onChange(digits ? `${cc}${digits}` : '');
  }

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
          maxLength={maxDigits}
          onChange={e => { setNumber(e.target.value); emit(countryCode, e.target.value); }}
          className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
        />
      </div>
    </div>
  );
}
