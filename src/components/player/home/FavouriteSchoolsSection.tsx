import { useNavigate } from 'react-router-dom';
import { useMyFavouriteSchools } from '@/hooks/school/useSchools';
import Avatar from '@/components/shared/Avatar';

export default function FavouriteSchoolsSection() {
  const navigate = useNavigate();
  const { data: favs = [] } = useMyFavouriteSchools();
  if (!favs.length) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Schools</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {favs.map((f: any) => {
          const school = f.school;
          if (!school) return null;
          return (
            <button
              key={f.id}
              onClick={() => navigate(`/s/${school.id}`)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 min-w-[100px] shrink-0 active:bg-secondary/50 shadow-sm"
            >
              <Avatar url={school.logo_url} name={school.name} size="lg" />
              <p className="text-xs font-medium text-foreground text-center truncate w-full">{school.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
