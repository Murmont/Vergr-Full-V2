// src/screens/creator/CreatorScheduleScreen.jsx
// Creator Studio — Schedule. Professional month-grid calendar + agenda view toggle.
// Uses local state + mock for now; will wire to Firestore scheduledPosts when backend lands.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/creator/CreatorLayout';
import { Card, SectionHeader } from '../../components/creator/Widgets';
import Icon from '../../components/Icon';

// ── Content type theme (matches VERGR content taxonomy) ────────────────
const TYPE_STYLE = {
  clip:        { label: 'Clip',        dot: '#22d3ee', chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20' },
  short:       { label: 'Short',       dot: '#f472b6', chip: 'bg-pink-500/10 text-pink-300 border-pink-400/20' },
  photo:       { label: 'Photo',       dot: '#a78bfa', chip: 'bg-violet-500/10 text-violet-300 border-violet-400/20' },
  article:     { label: 'Article',     dot: '#fbbf24', chip: 'bg-amber-500/10 text-amber-300 border-amber-400/20' },
  text:        { label: 'Text',        dot: '#60a5fa', chip: 'bg-blue-500/10 text-blue-300 border-blue-400/20' },
  live:        { label: 'Live',        dot: '#fb7185', chip: 'bg-rose-500/10 text-rose-300 border-rose-400/20' },
  tierlist:    { label: 'Tier List',   dot: '#34d399', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' },
  achievement: { label: 'Achievement', dot: '#f97316', chip: 'bg-orange-500/10 text-orange-300 border-orange-400/20' },
  lfg:         { label: 'LFG',         dot: '#4DFFD4', chip: 'bg-teal-500/10 text-teal-300 border-teal-400/20' },
  quote:       { label: 'Quote',       dot: '#C87FFF', chip: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-400/20' },
};

// Mock scheduled posts — deterministic across current month
function buildMockSchedule(monthDate) {
  const y = monthDate.getFullYear(), m = monthDate.getMonth();
  const types = Object.keys(TYPE_STYLE);
  const items = [];
  const seeds = [
    [2, 18, 30, 'Ranked recap montage'],
    [4, 11, 0,  'Stream highlights #12'],
    [4, 20, 0,  'Go Live · Apex tourney'],
    [7, 9, 15,  'Patch 4.2 breakdown'],
    [7, 16, 45, 'Weekly tier list'],
    [10, 14, 0, 'Community Q&A short'],
    [13, 19, 0, 'New setup photo'],
    [15, 21, 0, 'Live · Squad night'],
    [17, 12, 0, 'Highlight clip'],
    [20, 17, 30, 'Article: How I hit Apex'],
    [22, 10, 0, 'LFG: Diamond grind'],
    [24, 20, 0, 'Achievement: 10K followers'],
    [27, 18, 0, 'Tier list — best guns'],
  ];
  seeds.forEach(([day, hh, mm, title], i) => {
    const d = new Date(y, m, day, hh, mm);
    if (d.getMonth() !== m) return;
    items.push({
      id: `mock-${i}`,
      title,
      type: types[i % types.length],
      when: d,
      status: i % 5 === 0 ? 'draft' : 'scheduled',
    });
  });
  return items;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a, b)   { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

// Monday-first weekday index (0 = Mon … 6 = Sun)
function mondayIdx(d) { return (d.getDay() + 6) % 7; }

export default function CreatorScheduleScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState('month'); // month | agenda
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(new Date());

  const scheduled = useMemo(() => buildMockSchedule(cursor), [cursor]);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startPad = mondayIdx(first);
    const total = daysInMonth(cursor);
    const cells = [];
    // leading padding (prev month days for visual continuity)
    for (let i = startPad; i > 0; i--) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - i);
      cells.push({ date: d, outside: true });
    }
    for (let i = 1; i <= total; i++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), outside: false });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
    }
    return cells;
  }, [cursor]);

  const itemsOnDay = (date) => scheduled.filter(it => sameDay(it.when, date));
  const selectedItems = itemsOnDay(selected).sort((a, b) => a.when - b.when);

  const monthTotal = scheduled.length;
  const draftsCount = scheduled.filter(s => s.status === 'draft').length;
  const upcoming = [...scheduled]
    .filter(s => s.when >= new Date())
    .sort((a, b) => a.when - b.when)
    .slice(0, 6);

  const goMonth = (delta) => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(d);
  };
  const goToday = () => {
    const t = new Date();
    setCursor(startOfMonth(t));
    setSelected(t);
  };

  return (
    <CreatorLayout page="schedule" title="Schedule" subtitle="Plan drops, streams and campaigns" requiredTier="lite" lockDescription="Plan posts, streams and campaigns on a content calendar. Upgrade to Lite to unlock scheduling.">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => goMonth(-1)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-colors">
            <Icon name="chevron_left" size={18} className="text-white" />
          </button>
          <div className="min-w-[200px] text-center">
            <p className="font-syne font-extrabold text-white text-xl leading-none">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</p>
            <p className="text-[11px] text-text-muted mt-1 font-dmmono tabular-nums">{monthTotal} scheduled · {draftsCount} drafts</p>
          </div>
          <button onClick={() => goMonth(1)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-colors">
            <Icon name="chevron_right" size={18} className="text-white" />
          </button>
          <button onClick={goToday}
            className="ml-2 h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-bold text-white transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {['month','agenda'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`h-7 px-3 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  view === v ? 'bg-white/10 text-white' : 'text-text-muted hover:text-text-secondary'
                }`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/create')}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-violet text-bg-dark font-extrabold text-xs hover:brightness-110 transition-all inline-flex items-center gap-1.5">
            <Icon name="add" size={14} /> New post
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* Calendar */}
          <Card className="p-3 md:p-4">
            {/* Weekday headings */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 px-1">
              {WEEK_LABELS.map(d => (
                <div key={d} className="text-[10px] uppercase tracking-widest text-text-muted font-bold text-center">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {grid.map(({ date, outside }, i) => {
                const items = itemsOnDay(date);
                const isToday = sameDay(date, new Date());
                const isSelected = sameDay(date, selected);
                return (
                  <button key={i} onClick={() => setSelected(date)}
                    className={`relative group text-left min-h-[82px] md:min-h-[104px] rounded-xl p-2 border transition-all ${
                      outside
                        ? 'bg-white/[0.01] border-white/[0.03] text-text-muted/60'
                        : isSelected
                          ? 'bg-brand-cyan/10 border-brand-cyan/40 shadow-[0_0_0_1px_rgba(77,255,212,0.2)]'
                          : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-dmmono font-bold text-xs tabular-nums ${
                        isToday ? 'text-brand-cyan' : outside ? 'text-text-muted/60' : 'text-white'
                      }`}>
                        {date.getDate()}
                      </span>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />}
                    </div>

                    {/* Event dots / chips — max 3 chips, then +N */}
                    {!outside && items.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {items.slice(0, 3).map(it => {
                          const s = TYPE_STYLE[it.type] || TYPE_STYLE.text;
                          return (
                            <div key={it.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold truncate ${s.chip}`}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                              <span className="truncate">{it.title}</span>
                            </div>
                          );
                        })}
                        {items.length > 3 && (
                          <div className="text-[10px] text-text-muted font-semibold px-1.5">+{items.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 px-1 pt-3 border-t border-white/[0.04]">
              {Object.entries(TYPE_STYLE).map(([k, s]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{s.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Day detail side panel */}
          <Card className="p-4 md:p-5 h-fit sticky top-[80px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Selected</p>
                <p className="font-syne font-extrabold text-white text-lg leading-tight mt-0.5">
                  {selected.toLocaleDateString(undefined, { weekday: 'long' })}
                </p>
                <p className="font-dmmono text-text-secondary text-sm tabular-nums">
                  {selected.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => navigate('/create')}
                className="w-9 h-9 rounded-xl bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center transition-colors"
                title="Schedule on this day">
                <Icon name="add" size={18} className="text-brand-cyan" />
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                  <Icon name="event_available" size={22} className="text-text-muted" />
                </div>
                <p className="text-sm text-text-secondary font-semibold">Nothing scheduled</p>
                <p className="text-xs text-text-muted mt-1">Tap + to plan a post for this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(it => {
                  const s = TYPE_STYLE[it.type] || TYPE_STYLE.text;
                  return (
                    <div key={it.id} className="group relative p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors">
                      <div className="flex items-start gap-2.5">
                        <span className="w-1 self-stretch rounded-full shrink-0 mt-1" style={{ backgroundColor: s.dot }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded border ${s.chip}`}>{s.label}</span>
                            {it.status === 'draft' && (
                              <span className="text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.08]">Draft</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-white leading-snug">{it.title}</p>
                          <p className="text-[11px] text-text-muted font-dmmono tabular-nums mt-1">
                            {it.when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-white">
                          <Icon name="more_horiz" size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upcoming peek */}
            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">Upcoming</p>
              <div className="space-y-1.5">
                {upcoming.slice(0, 4).map(it => {
                  const s = TYPE_STYLE[it.type] || TYPE_STYLE.text;
                  return (
                    <button key={it.id} onClick={() => setSelected(new Date(it.when.getFullYear(), it.when.getMonth(), it.when.getDate()))}
                      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                      <span className="flex-1 text-[12px] text-text-secondary truncate">{it.title}</span>
                      <span className="text-[10px] text-text-muted font-dmmono tabular-nums shrink-0">
                        {it.when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        // Agenda list view
        <Card className="p-4 md:p-5">
          <SectionHeader title={`Agenda — ${MONTH_NAMES[cursor.getMonth()]}`} subtitle={`${monthTotal} items this month`} />
          {scheduled.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">Nothing scheduled this month.</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {[...scheduled].sort((a, b) => a.when - b.when).map(it => {
                const s = TYPE_STYLE[it.type] || TYPE_STYLE.text;
                return (
                  <div key={it.id} className="flex items-center gap-4 py-3">
                    <div className="w-14 text-center shrink-0">
                      <p className="font-dmmono font-bold text-white text-lg leading-none tabular-nums">{it.when.getDate()}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">
                        {it.when.toLocaleDateString(undefined, { weekday: 'short' })}
                      </p>
                    </div>
                    <span className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded border ${s.chip}`}>{s.label}</span>
                        {it.status === 'draft' && (
                          <span className="text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.08]">Draft</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate">{it.title}</p>
                    </div>
                    <p className="text-[11px] text-text-muted font-dmmono tabular-nums shrink-0">
                      {it.when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <button className="text-text-muted hover:text-white shrink-0">
                      <Icon name="more_horiz" size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </CreatorLayout>
  );
}
