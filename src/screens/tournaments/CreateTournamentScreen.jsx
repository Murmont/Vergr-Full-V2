// 4-step Create Tournament wizard — matches the mock.
//   Step 1 — Basic Info (name + game + short description)
//   Step 2 — Format & Rules (format, max players, stream, BR games)
//   Step 3 — Prizes & Entry (entry fee + optional host squad + breakdown)
//   Step 4 — Review & Create (summary + confirm)
//
// Right rail carries a live Tournament Summary, a Need Help card, and a
// Tournament Rules checklist using graphic-tournament-rules.png.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { createTournament, getUserSquads } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import AppHeader from '../../components/brand/AppHeader';
import AppRightRail from '../../components/brand/AppRightRail';
import { SectionCard } from '../../components/brand/SectionCard';
import {
  BRACKET_TYPE_LIST,
  getBracketType,
  isBracketTypeAllowed,
  computePrizeBreakdown,
  recommendedSwissRounds,
} from '../../utils/tournamentTypes';

const GAMES = ['Valorant', 'Fortnite', 'Apex Legends', 'League of Legends', 'CS2', 'Overwatch 2', 'Rocket League', 'Call of Duty', 'FIFA', 'Other'];

const STEPS = [
  { id: 1, label: 'Basic Info',      icon: 'edit_note' },
  { id: 2, label: 'Format & Rules',  icon: 'rule' },
  { id: 3, label: 'Prizes & Entry',  icon: 'payments' },
  { id: 4, label: 'Review & Create', icon: 'check_circle' },
];

const RULES_CHECKLIST = [
  'All participants must register before start time',
  'Fair play — cheating is an instant ban',
  'Entry fees are non-refundable once play begins',
  'Disputes go to the tournament host',
  'Mod cut (5%) is taken from the gross prize pool',
];

export default function CreateTournamentScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [game, setGame] = useState('');
  const [customGame, setCustomGame] = useState('');
  const [type, setType] = useState('single_elim');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [entryFee, setEntryFee] = useState('');
  const [squadId, setSquadId] = useState('');
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [brGameCount, setBrGameCount] = useState(3);
  const [streamRequired, setStreamRequired] = useState(false);

  const { currentUser } = useAuth();
  const { wallet, profile } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  const plan = profile?.tier || 'free';
  const bracketCfg = getBracketType(type);

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  useEffect(() => {
    if (!currentUser) return;
    getUserSquads(currentUser.uid).then(setSquads).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!bracketCfg) return;
    if (!bracketCfg.allowedPlayers.includes(maxParticipants)) {
      setMaxParticipants(bracketCfg.allowedPlayers[0]);
    }
    if (bracketCfg.streamRequired) setStreamRequired(true);
  }, [type, bracketCfg]); // eslint-disable-line

  const finalGame = game === 'Other' ? customGame.trim() : game;
  const fee = parseInt(entryFee) || 0;
  const estimatedPrize = fee * maxParticipants;
  const needsSquad = bracketCfg?.mode === 'squad';
  const prizeBreakdown = useMemo(
    () => computePrizeBreakdown(estimatedPrize, type, { squadTreasury: needsSquad }),
    [estimatedPrize, type, needsSquad]
  );
  const swissRounds = type === 'swiss' ? recommendedSwissRounds(maxParticipants) : 0;

  const step1Valid = name.trim().length >= 3 && finalGame;
  const step2Valid = !!bracketCfg && isBracketTypeAllowed(type, plan);
  const step3Valid = !needsSquad || !!squadId;
  const canSubmit = step1Valid && step2Valid && step3Valid;

  const handleNext = () => {
    if (step === 1 && !step1Valid) { showToast('Add a name and pick a game', 'error'); return; }
    if (step === 2 && !step2Valid) { showToast('Your plan cannot use this format', 'error'); return; }
    if (step === 3 && !step3Valid) { showToast('Pick a host squad for squad tournaments', 'error'); return; }
    setStep(s => Math.min(4, s + 1));
  };
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const handleCreate = async () => {
    if (!canSubmit || loading) return;
    if (!isBracketTypeAllowed(type, plan)) {
      showToast(`${bracketCfg.label} requires a ${bracketCfg.minPlan} plan`, 'error');
      return;
    }
    setLoading(true);
    try {
      const tournamentId = await createTournament(currentUser.uid, squadId || null, {
        name: name.trim(),
        description: description.trim(),
        game: finalGame,
        entryFee: fee,
        maxParticipants,
        type,
        mode: bracketCfg.mode,
        streamRequired,
        brGameCount: type === 'battle_royale' ? brGameCount : null,
        swissRounds: type === 'swiss' ? swissRounds : null,
      });
      showToast('Tournament created!', 'success');
      navigate(`/match/${tournamentId}`);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create tournament', 'error');
    }
    setLoading(false);
  };

  // Mobile: legacy stacked layout
  if (!isDesktop) {
    return (
      <div className="min-h-screen pb-24">
        <TopBar showBack title="Create Tournament" />
        <div className="px-4 py-5">
          <MobileWizard
            step={step} setStep={setStep}
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            game={game} setGame={setGame}
            customGame={customGame} setCustomGame={setCustomGame}
            type={type} setType={setType} plan={plan}
            bracketCfg={bracketCfg}
            maxParticipants={maxParticipants} setMaxParticipants={setMaxParticipants}
            entryFee={entryFee} setEntryFee={setEntryFee}
            squadId={squadId} setSquadId={setSquadId} squads={squads} needsSquad={needsSquad}
            brGameCount={brGameCount} setBrGameCount={setBrGameCount}
            streamRequired={streamRequired} setStreamRequired={setStreamRequired}
            swissRounds={swissRounds} prizeBreakdown={prizeBreakdown} fee={fee}
            finalGame={finalGame}
            onBack={handleBack} onNext={handleNext} onCreate={handleCreate}
            canSubmit={canSubmit} loading={loading}
          />
        </div>
      </div>
    );
  }

  // Desktop: 2-col (wizard + right rail)
  return (
    <div className="min-h-screen bg-bg-dark">
      <AppHeader title="Create Tournament" subtitle="Host a cup. Set the rules. Claim the crown." />

      <div className="flex gap-6 px-6 py-6">
        <main className="flex-1 min-w-0 max-w-3xl space-y-6">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => s.id < step && setStep(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-1 border transition-colors ${
                      active ? 'border-brand-violet bg-brand-violet/10' :
                      done   ? 'border-brand-cyan/30 bg-brand-cyan/5 hover:bg-brand-cyan/10' :
                               'border-white/[0.06] bg-white/[0.03] opacity-60'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-dmmono font-bold ${
                      active ? 'bg-brand-violet text-white' :
                      done   ? 'bg-brand-cyan text-bg-dark' :
                               'bg-white/[0.06] text-text-muted'
                    }`}>
                      {done ? <Icon name="check" size={14}/> : s.id}
                    </span>
                    <span className={`text-[11px] font-dmmono uppercase tracking-[0.12em] truncate ${
                      active ? 'text-text-primary' : 'text-text-muted'
                    }`}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className="h-px w-3 bg-white/[0.08]" />}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          {step === 1 && (
            <SectionCard title="Basic Info">
              <div className="space-y-5">
                <Field label="Tournament Name *">
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Friday Night Valorant Cup" maxLength={60}
                    className="input" />
                </Field>
                <Field label="Short Description">
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Tell players what makes this cup special…"
                    className="input resize-none" maxLength={240} />
                </Field>
                <Field label="Game *">
                  <div className="flex flex-wrap gap-2">
                    {GAMES.map(g => (
                      <button key={g} onClick={() => setGame(g)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                          game === g
                            ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan'
                            : 'bg-white/[0.04] border border-white/[0.06] text-text-muted hover:text-text-secondary'
                        }`}>{g}</button>
                    ))}
                  </div>
                  {game === 'Other' && (
                    <input type="text" value={customGame} onChange={e => setCustomGame(e.target.value)}
                      placeholder="Enter game name…" className="input mt-3" />
                  )}
                </Field>
              </div>
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="Format & Rules">
              <div className="space-y-5">
                <Field label="Format *">
                  <div className="space-y-2">
                    {BRACKET_TYPE_LIST.map(t => {
                      const allowed = isBracketTypeAllowed(t.id, plan);
                      const selected = type === t.id;
                      return (
                        <button key={t.id}
                          onClick={() => allowed ? setType(t.id) : navigate('/settings/subscription')}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                            selected ? 'border-brand-violet bg-brand-violet/5'
                            : allowed ? 'border-white/[0.06] bg-white/[0.03] hover:border-white/10'
                                      : 'border-white/[0.04] bg-white/[0.02] opacity-60'
                          }`}>
                          <Icon name={t.icon} size={22} className={selected ? 'text-brand-violet' : 'text-text-muted'} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-text-primary text-sm font-bold">{t.label}</p>
                              {!allowed && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold">{t.minPlan}</span>
                              )}
                              {t.streamRequired && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-ember/15 text-brand-ember">Stream</span>
                              )}
                            </div>
                            <p className="text-text-muted text-[11px] mt-0.5">{t.description}</p>
                          </div>
                          {selected && <Icon name="check_circle" size={18} className="text-brand-violet" />}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label={needsSquad ? 'Max Squads' : 'Max Players'}>
                  <div className="flex gap-2 flex-wrap">
                    {(bracketCfg?.allowedPlayers || []).map(n => (
                      <button key={n} onClick={() => setMaxParticipants(n)}
                        className={`min-w-[64px] py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                          maxParticipants === n
                            ? 'bg-brand-gold/15 border border-brand-gold/40 text-brand-gold'
                            : 'bg-white/[0.04] border border-white/[0.06] text-text-muted'
                        }`}>{n}</button>
                    ))}
                  </div>
                  {type === 'swiss' && (
                    <p className="text-text-muted text-[11px] mt-2">Recommended: {swissRounds} rounds (log₂ of players)</p>
                  )}
                </Field>

                {type === 'battle_royale' && (
                  <Field label="Games per Event">
                    <div className="flex gap-2">
                      {[1, 3, 5, 7].map(n => (
                        <button key={n} onClick={() => setBrGameCount(n)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            brGameCount === n
                              ? 'bg-brand-ember/15 border border-brand-ember/40 text-brand-ember'
                              : 'bg-white/[0.04] border border-white/[0.06] text-text-muted'
                          }`}>{n}</button>
                      ))}
                    </div>
                    <p className="text-text-muted text-[11px] mt-2">Placement points aggregate across games. 1st = 15, 2nd = 12, …, 10th = 1.</p>
                  </Field>
                )}

                <button onClick={() => !bracketCfg?.streamRequired && setStreamRequired(!streamRequired)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    streamRequired ? 'border-brand-ember/40 bg-brand-ember/5' : 'border-white/[0.06] bg-white/[0.03]'
                  }`}>
                  <Icon name="live_tv" size={20} className={streamRequired ? 'text-brand-ember' : 'text-text-muted'} />
                  <div className="flex-1">
                    <p className="text-text-primary text-sm font-bold">Live Stream</p>
                    <p className="text-text-muted text-[11px]">
                      {bracketCfg?.streamRequired ? 'Required for invitationals' : 'Optional — stream matches on VERGR'}
                    </p>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-all ${streamRequired ? 'bg-brand-ember' : 'bg-white/[0.08]'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${streamRequired ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            </SectionCard>
          )}

          {step === 3 && (
            <SectionCard title="Prizes & Entry">
              <div className="space-y-5">
                <Field label="Entry Fee (coins) — 0 for free">
                  <input type="number" min="0" value={entryFee} onChange={e => setEntryFee(e.target.value)}
                    placeholder="0" className="input font-dmmono" />
                </Field>

                {fee > 0 && (
                  <div className="p-3 rounded-xl bg-brand-gold/5 border border-brand-gold/20 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Gross pool</span>
                      <span className="text-brand-gold font-dmmono font-bold">{prizeBreakdown.gross.toLocaleString()} coins</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Mod cut (5%)</span>
                      <span className="text-text-muted font-dmmono">−{prizeBreakdown.modCut.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    {prizeBreakdown.payouts.map(p => (
                      <div key={p.place} className="flex justify-between text-xs">
                        <span className="text-text-secondary">{p.label} ({p.pct}%)</span>
                        <span className="text-text-primary font-dmmono">
                          {p.player.toLocaleString()} {needsSquad ? `(+${p.treasury.toLocaleString()} treasury)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {needsSquad && (
                  <Field label="Host Squad *">
                    {squads.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                        <p className="text-text-muted text-sm mb-2">You need to be in a squad to host a squad tournament</p>
                        <button onClick={() => navigate('/squads')} className="text-brand-cyan text-sm font-bold">Browse Squads</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {squads.map(s => (
                          <button key={s.id} onClick={() => setSquadId(s.id)}
                            className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                              squadId === s.id ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-white/[0.03] hover:border-white/10'
                            }`}>
                            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-muted">
                              <Icon name="shield" size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="text-text-primary text-sm font-bold">{s.name}</p>
                              <p className="text-text-muted text-[10px]">{s.memberCount || 0} members</p>
                            </div>
                            {squadId === s.id && <Icon name="check_circle" size={20} className="text-brand-cyan" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>
                )}
              </div>
            </SectionCard>
          )}

          {step === 4 && (
            <SectionCard title="Review & Create">
              <ReviewRow label="Name" value={name || '—'} />
              <ReviewRow label="Game" value={finalGame || '—'} />
              <ReviewRow label="Format" value={bracketCfg?.label || '—'} />
              <ReviewRow label={needsSquad ? 'Max squads' : 'Max players'} value={String(maxParticipants)} />
              <ReviewRow label="Entry fee" value={fee ? `${fee.toLocaleString()} coins` : 'Free'} />
              <ReviewRow label="Prize pool" value={`${estimatedPrize.toLocaleString()} coins`} />
              {type === 'battle_royale' && <ReviewRow label="Games per event" value={String(brGameCount)} />}
              {type === 'swiss' && <ReviewRow label="Swiss rounds" value={String(swissRounds)} />}
              <ReviewRow label="Live stream" value={streamRequired ? 'Required' : 'Optional'} />
              {needsSquad && <ReviewRow label="Host squad" value={squads.find(s => s.id === squadId)?.name || '—'} />}
              {description && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted mb-1">Description</p>
                  <p className="text-text-primary text-sm">{description}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            <button onClick={handleBack} disabled={step === 1}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-text-primary text-sm font-semibold disabled:opacity-30">
              Back
            </button>
            {step < 4 ? (
              <button onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold shadow-lg shadow-brand-violet/30 hover:brightness-110">
                Next Step
              </button>
            ) : (
              <button onClick={handleCreate} disabled={!canSubmit || loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold shadow-lg shadow-brand-violet/30 hover:brightness-110 disabled:opacity-40">
                {loading ? 'Creating…' : 'Create Tournament'}
              </button>
            )}
          </div>
        </main>

        {/* Right rail */}
        <AppRightRail>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="h-20 bg-gradient-to-br from-brand-violet/40 via-brand-pink/20 to-brand-cyan/20 flex items-center justify-center">
              <Icon name="emoji_events" size={36} className="text-white/80" />
            </div>
            <div className="p-4 space-y-2">
              <div className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted">Tournament Summary</div>
              <div className="font-syne font-extrabold text-text-primary text-lg leading-tight truncate">
                {name || 'Untitled Tournament'}
              </div>
              <SummaryRow label="Game"    value={finalGame || '—'} />
              <SummaryRow label="Format"  value={bracketCfg?.label || '—'} />
              <SummaryRow label={needsSquad ? 'Squads' : 'Players'} value={String(maxParticipants)} />
              <SummaryRow label="Entry"   value={fee ? `${fee.toLocaleString()}c` : 'Free'} />
              <SummaryRow label="Pool"    value={`${estimatedPrize.toLocaleString()}c`} gold />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="help" size={16} className="text-brand-cyan" />
              <div className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted">Need Help?</div>
            </div>
            <p className="text-text-secondary text-[12px] leading-snug mb-3">
              New to hosting? Read the quick-start guide for bracket formats, prize math, and host responsibilities.
            </p>
            <button onClick={() => navigate('/help/tournaments')}
              className="w-full py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-text-primary text-xs font-semibold">
              Open host guide
            </button>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-brand-violet/30 to-brand-pink/20 flex items-center justify-center relative">
              <img src="/brand/graphic-tournament-rules.png" alt=""
                className="h-20 w-auto object-contain drop-shadow-xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="p-4">
              <div className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted mb-2">Tournament Rules</div>
              <ul className="space-y-1.5">
                {RULES_CHECKLIST.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-text-secondary">
                    <Icon name="check_circle" size={14} className="text-brand-cyan mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AppRightRail>
      </div>

      {/* shared input style */}
      <style>{`
        .input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 14px;
          color: var(--text-primary, #fff);
          font-size: 14px;
          outline: none;
        }
        .input:focus { border-color: rgba(77,255,212,0.4); }
        .input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-text-muted text-[10px] font-dmmono uppercase tracking-[0.18em] mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] font-dmmono uppercase tracking-[0.14em] text-text-muted">{label}</span>
      <span className="text-text-primary text-sm font-semibold">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, gold }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-text-muted">{label}</span>
      <span className={`font-dmmono font-bold ${gold ? 'text-brand-gold' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

// ───────────────────────── Mobile wizard ─────────────────────────
// Simplified version — stacks each step vertically with the same Back/Next footer.
function MobileWizard(props) {
  const {
    step, name, setName, description, setDescription, game, setGame, customGame, setCustomGame,
    type, setType, plan, bracketCfg, maxParticipants, setMaxParticipants, entryFee, setEntryFee,
    squadId, setSquadId, squads, needsSquad, brGameCount, setBrGameCount,
    streamRequired, setStreamRequired, swissRounds, prizeBreakdown, fee, finalGame,
    onBack, onNext, onCreate, canSubmit, loading,
  } = props;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5">
        {STEPS.map(s => (
          <div key={s.id} className={`flex-1 h-1.5 rounded-full ${
            step >= s.id ? 'bg-brand-violet' : 'bg-white/[0.08]'
          }`} />
        ))}
      </div>
      <div className="text-[10px] font-dmmono uppercase tracking-[0.18em] text-brand-violet">
        Step {step} / 4 — {STEPS[step-1].label}
      </div>

      {step === 1 && (
        <>
          <Field label="Tournament Name *">
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Friday Night Cup" maxLength={60} />
          </Field>
          <Field label="Short Description">
            <textarea rows={3} className="input resize-none" value={description} onChange={e=>setDescription(e.target.value)} maxLength={240} />
          </Field>
          <Field label="Game *">
            <div className="flex flex-wrap gap-2">
              {GAMES.map(g => (
                <button key={g} onClick={() => setGame(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    game === g ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan' : 'bg-white/[0.04] border border-white/[0.06] text-text-muted'
                  }`}>{g}</button>
              ))}
            </div>
            {game === 'Other' && <input className="input mt-3" value={customGame} onChange={e=>setCustomGame(e.target.value)} placeholder="Enter game name…" />}
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <Field label="Format *">
            <div className="space-y-2">
              {BRACKET_TYPE_LIST.map(t => {
                const allowed = isBracketTypeAllowed(t.id, plan);
                const selected = type === t.id;
                return (
                  <button key={t.id} onClick={() => allowed && setType(t.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 ${
                      selected ? 'border-brand-violet bg-brand-violet/5' :
                      allowed ? 'border-white/[0.06] bg-white/[0.03]' :
                      'border-white/[0.04] opacity-60'
                    }`}>
                    <Icon name={t.icon} size={18} className={selected ? 'text-brand-violet' : 'text-text-muted'} />
                    <div className="flex-1">
                      <p className="text-text-primary text-sm font-bold">{t.label}</p>
                      <p className="text-text-muted text-[11px]">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={needsSquad ? 'Max Squads' : 'Max Players'}>
            <div className="flex gap-2 flex-wrap">
              {(bracketCfg?.allowedPlayers || []).map(n => (
                <button key={n} onClick={() => setMaxParticipants(n)}
                  className={`flex-1 min-w-[56px] py-2.5 rounded-lg text-sm font-bold ${
                    maxParticipants === n ? 'bg-brand-gold/15 border border-brand-gold/40 text-brand-gold' : 'bg-white/[0.04] border border-white/[0.06] text-text-muted'
                  }`}>{n}</button>
              ))}
            </div>
          </Field>
          {type === 'battle_royale' && (
            <Field label="Games per Event">
              <div className="flex gap-2">
                {[1,3,5,7].map(n => (
                  <button key={n} onClick={() => setBrGameCount(n)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${
                      brGameCount === n ? 'bg-brand-ember/15 border border-brand-ember/40 text-brand-ember' : 'bg-white/[0.04] border border-white/[0.06] text-text-muted'
                    }`}>{n}</button>
                ))}
              </div>
            </Field>
          )}
          <button onClick={() => !bracketCfg?.streamRequired && setStreamRequired(!streamRequired)}
            className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 ${
              streamRequired ? 'border-brand-ember/40 bg-brand-ember/5' : 'border-white/[0.06] bg-white/[0.03]'
            }`}>
            <Icon name="live_tv" size={18} className={streamRequired ? 'text-brand-ember' : 'text-text-muted'} />
            <div className="flex-1">
              <p className="text-text-primary text-sm font-bold">Live Stream</p>
              <p className="text-text-muted text-[11px]">{bracketCfg?.streamRequired ? 'Required' : 'Optional'}</p>
            </div>
            <div className={`w-9 h-5 rounded-full relative ${streamRequired ? 'bg-brand-ember' : 'bg-white/[0.08]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white ${streamRequired ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <Field label="Entry Fee (coins)">
            <input type="number" min="0" className="input font-dmmono" value={entryFee} onChange={e=>setEntryFee(e.target.value)} placeholder="0" />
          </Field>
          {fee > 0 && (
            <div className="p-3 rounded-xl bg-brand-gold/5 border border-brand-gold/20 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Gross pool</span><span className="text-brand-gold font-dmmono font-bold">{prizeBreakdown.gross.toLocaleString()}c</span></div>
              <div className="flex justify-between text-xs"><span className="text-text-muted">Mod cut (5%)</span><span className="text-text-muted font-dmmono">−{prizeBreakdown.modCut.toLocaleString()}</span></div>
              <div className="h-px bg-white/[0.06]" />
              {prizeBreakdown.payouts.map(p => (
                <div key={p.place} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{p.label} ({p.pct}%)</span>
                  <span className="text-text-primary font-dmmono">{p.player.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {needsSquad && (
            <Field label="Host Squad *">
              {squads.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center text-text-muted text-sm">Join a squad first.</div>
              ) : (
                <div className="space-y-2">
                  {squads.map(s => (
                    <button key={s.id} onClick={() => setSquadId(s.id)}
                      className={`w-full p-3 rounded-xl border flex items-center gap-3 ${
                        squadId === s.id ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-white/[0.03]'
                      }`}>
                      <Icon name="shield" size={16} className="text-text-muted" />
                      <p className="flex-1 text-left text-text-primary text-sm font-bold">{s.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </Field>
          )}
        </>
      )}

      {step === 4 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
          <ReviewRow label="Name"   value={name || '—'} />
          <ReviewRow label="Game"   value={finalGame || '—'} />
          <ReviewRow label="Format" value={bracketCfg?.label || '—'} />
          <ReviewRow label={needsSquad ? 'Squads' : 'Players'} value={String(maxParticipants)} />
          <ReviewRow label="Entry"  value={fee ? `${fee.toLocaleString()}c` : 'Free'} />
          <ReviewRow label="Pool"   value={`${(fee*maxParticipants).toLocaleString()}c`} />
          <ReviewRow label="Stream" value={streamRequired ? 'Required' : 'Optional'} />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} disabled={step === 1}
          className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-text-primary text-sm font-semibold disabled:opacity-30">Back</button>
        {step < 4 ? (
          <button onClick={onNext}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold">Next</button>
        ) : (
          <button onClick={onCreate} disabled={!canSubmit || loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold disabled:opacity-40">
            {loading ? 'Creating…' : 'Create'}
          </button>
        )}
      </div>

      <style>{`
        .input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px 14px; color:#fff; font-size:14px; outline:none; }
        .input:focus { border-color:rgba(77,255,212,0.4); }
        .input::placeholder { color:rgba(255,255,255,0.35); }
      `}</style>
    </div>
  );
}
