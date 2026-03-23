import { getInitials } from '@/lib/utils';
import { User } from 'lucide-react';

const SIZES = {
  xs:  'h-7 w-7 text-[10px]',
  sm:  'h-9 w-9 text-xs',
  md:  'h-10 w-10 text-sm',
  lg:  'h-12 w-12 text-sm',
  xl:  'h-14 w-14 text-xl',
  '2xl': 'h-20 w-20 text-2xl',
} as const;

export default function Avatar({
  url,
  name,
  size = 'md',
}: {
  url?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
}) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary overflow-hidden ${SIZES[size]}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : getInitials(name) || <User className="h-1/2 w-1/2 text-primary/40" />}
    </div>
  );
}
