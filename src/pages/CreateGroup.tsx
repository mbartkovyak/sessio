import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check, Copy, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
  { label: 'Tennis', icon: '🎾' },
  { label: 'Swimming', icon: '🏊' },
  { label: 'Running', icon: '🏃' },
  { label: 'Fitness', icon: '💪' },
  { label: 'Yoga', icon: '🧘' },
  { label: 'Football', icon: '⚽' },
  { label: 'Badminton', icon: '🏸' },
  { label: 'Boxing', icon: '🥊' },
  { label: 'Other', icon: '🎯' },
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEADLINES = [
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
];

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [level, setLevel] = useState('All levels');
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [deadline, setDeadline] = useState(24);
  const [allowWaitlist, setAllowWaitlist] = useState(true);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || day === null || !sport) return;
    setLoading(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase.from('groups').insert({
        coach_id: user.id,
        name,
        sport,
        level,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        location,
        capacity,
        confirmation_deadline_hours: deadline,
        allow_waitlist: allowWaitlist,
        invite_code: code,
      }).select().single();
      if (error) throw error;
      setCreated({ id: data.id, code });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inviteLink = created ? `${window.location.origin}/join/${created.code}` : '';

  if (created) {
    return (
      <div className="flex min-h-screen flex-col bg-background items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Group Created! 🎉</h1>
          <p className="text-muted-foreground text-sm mb-8">Share the invite link with your players</p>

          <div className="rounded-xl border border-border bg-card p-4 mb-4 card-shadow text-left">
            <p className="text-xs text-muted-foreground mb-1">Invite code</p>
            <p className="font-mono text-lg font-bold text-foreground tracking-widest">{created.code}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 mb-6 card-shadow">
            <p className="text-xs text-muted-foreground mb-2 text-left">Invite link</p>
            <p className="text-xs font-mono text-foreground break-all text-left">{inviteLink}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                toast.success('Link copied!');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground min-h-[44px]"
            >
              <Copy className="h-4 w-4" />
              Copy Invite Link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my training group on Sessio! ${inviteLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] min-h-[44px]"
            >
              <span className="text-base">💬</span>
              Share via WhatsApp
            </a>
            <button
              onClick={() => navigate(`/coach/group/${created.id}`)}
              className="w-full text-sm font-medium text-primary min-h-[44px]"
            >
              Go to Group →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground">New Group</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-6 space-y-6 pb-8">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Group name *</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tuesday Tennis Group"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          />
        </div>

        {/* Sport */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Sport *</label>
          <div className="grid grid-cols-3 gap-2">
            {SPORTS.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSport(s.label)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs font-medium transition-colors min-h-[60px] ${
                  sport === s.label
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Level</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-xl border py-2.5 px-3 text-sm font-medium transition-colors min-h-[44px] ${
                  level === l
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Day */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Day of week *</label>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(i)}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
                  day === i
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Start time *</label>
            <input
              required
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">End time *</label>
            <input
              required
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Location *</label>
          <input
            required
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. City Sports Centre, Court 3"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Capacity</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCapacity(c => Math.max(2, c - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-xl font-bold text-foreground">{capacity}</span>
            <button
              type="button"
              onClick={() => setCapacity(c => Math.min(20, c + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">players (max 20)</span>
          </div>
        </div>

        {/* Confirmation deadline */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Confirmation deadline</label>
          <div className="flex gap-2">
            {DEADLINES.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDeadline(d.value)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  deadline === d.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allow waitlist */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Allow waitlist</p>
            <p className="text-xs text-muted-foreground">Players can join the waitlist when full</p>
          </div>
          <button
            type="button"
            onClick={() => setAllowWaitlist(v => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${allowWaitlist ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${allowWaitlist ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !name || !sport || day === null || !startTime || !endTime || !location}
          className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 min-h-[48px]"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}
