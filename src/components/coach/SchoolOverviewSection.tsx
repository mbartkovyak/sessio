import { useNavigate } from 'react-router-dom';
import { Plus, Users, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';

export default function SchoolOverviewSection({ school }: { school: { id: string; name: string } }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: fullSchool } = useMySchool();
  const schoolMembers = (fullSchool)?.school_members ?? [];
  const isSelfCoach = schoolMembers.some((m: any) => m.coach_id === profile?.id);

  async function addSelfAsCoach() {
    if (!fullSchool?.id || !profile?.id) return;
    const { error } = await supabase
      .from('school_members')
      .insert({ school_id: fullSchool.id, coach_id: profile.id, status: 'approved' });
    if (error) toast.error(error.message);
    else {
      toast.success("Added! You can now create trainings.");
      qc.invalidateQueries({ queryKey: ['my-school'] });
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
        <p className="text-sm text-muted-foreground">School overview</p>
      </div>

      {/* Coaches in school */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Coaches</h2>
          <button onClick={() => navigate('/school/coaches')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
            <Plus className="h-4 w-4" /> Invite
          </button>
        </div>
        {schoolMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No coaches yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schoolMembers.map((m: any) => {
              const coach = m.coach;
              const isMe = m.coach_id === profile?.id;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Avatar url={coach?.avatar_url} name={coach?.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {coach?.full_name ?? 'Coach'}{isMe && <span className="text-primary ml-1">(you)</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!isSelfCoach && (
          <button
            onClick={addSelfAsCoach}
            className="w-full rounded-xl border-2 border-dashed border-primary/30 p-3 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors mt-2"
          >
            <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Add myself as coach
          </button>
        )}
      </div>

      {/* School management */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <button onClick={() => navigate('/school/coaches')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
          <Users className="h-4 w-4 text-muted-foreground" /> Manage Coaches
        </button>
        <button onClick={() => navigate('/school/profile')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
          <Settings className="h-4 w-4 text-muted-foreground" /> School Settings
        </button>
      </div>
    </div>
  );
}
