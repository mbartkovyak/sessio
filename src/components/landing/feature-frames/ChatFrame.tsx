import { Send } from 'lucide-react';

type Msg = { from: 'coach' | 'athlete'; text: string };

const MESSAGES: Msg[] = [
  { from: 'athlete', text: 'Can I swap Thursday for Friday?' },
  { from: 'coach', text: 'Sure — moved you. Friday 18:00 confirmed.' },
  { from: 'athlete', text: 'Thanks 🙏' },
];

// Mini chat thread with animated typing indicator. Proof that coach/athlete chat is built-in.
export default function ChatFrame({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="rounded-2xl border border-[#111]/8 bg-white p-5 md:p-6 shadow-[0_8px_24px_-12px_rgba(17,17,17,0.06)]">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 border-b border-[#111]/6 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111]/[0.06] font-mono text-[11px] font-semibold text-[#111]/75">
          TK
        </div>
        <div>
          <p className="font-display text-[14px] font-semibold leading-tight text-[#111]">Tomasz K.</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#111]/45">Mon 18:00 · Dinosaurs</p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`flex transition-all duration-500 ${
              msg.from === 'coach' ? 'justify-end' : 'justify-start'
            }`}
            style={{
              transitionDelay: `${200 + i * 150}ms`,
              transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
              opacity: isVisible ? 1 : 0,
              transitionTimingFunction: 'var(--ease-out-smooth, ease-out)',
            }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                msg.from === 'coach'
                  ? 'bg-accent text-white'
                  : 'border border-[#111]/6 bg-[#FDFBF7] text-[#111]/85'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <div
          className="flex transition-all duration-500"
          style={{
            transitionDelay: `${200 + MESSAGES.length * 150 + 200}ms`,
            opacity: isVisible ? 1 : 0,
            transitionTimingFunction: 'var(--ease-out-smooth, ease-out)',
          }}
        >
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#111]/6 bg-[#FDFBF7] px-3.5 py-2.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1.5 w-1.5 rounded-full bg-[#111]/40"
                style={{
                  animation: `typingPulse 1.2s ${i * 0.15}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Input row */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#111]/8 bg-[#FDFBF7] px-3 py-2">
        <span className="flex-1 text-[12px] text-[#111]/40">Type a message…</span>
        <button
          type="button"
          aria-label="Send"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-[0_2px_8px_rgba(230,120,30,0.3)] transition-transform hover:scale-105"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
