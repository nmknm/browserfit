import { motion, Reorder, useDragControls } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, GripVertical, Laptop, Minus, Monitor, Plus, Smartphone, Tablet, Terminal, Cloud, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { triageLevels, type BrowserAnswer, type Question, type QOption, type TriageLevel } from '../../data/quizzes';
import { BROWSER_BY_ID } from '../../lib/data';
import { detect } from '../../lib/detect';
import type { OsId } from '../../lib/types';
import { BrowserPicker } from '../BrowserPicker';
import { BrowserMark } from '../ui/BrowserMark';

export interface QProps {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  /** trivia: reveal state */
  reveal?: boolean;
  /** how many browsers each option would leave in play, for options that add a requirement */
  impact?: Record<string, number>;
}

const impactText = (n: number) => (n === 0 ? 'Leaves no browsers' : `Leaves ${n} ${n === 1 ? 'browser' : 'browsers'}`);

/** "Leaves 14 browsers", read as part of the option's description. */
function Impact({ q, id, impact }: { q: Question; id: string; impact?: Record<string, number> }) {
  if (impact?.[id] == null) return null;
  return (
    <span id={`${q.id}-${id}-impact`} className="qimpact tnum">
      {impactText(impact[id])}
    </span>
  );
}

function Cards({ q, value, onChange, reveal, big, impact }: QProps & { big?: boolean }) {
  return (
    <div className={`qcards ${big ? 'qcards--big' : ''}`} role="radiogroup" aria-label={q.title}>
      {q.options!.map((o) => {
        const on = value === o.id;
        const state = reveal ? (o.correct ? 'right' : on ? 'wrong' : '') : '';
        return (
          <button key={o.id} role="radio" aria-checked={on} aria-describedby={impact?.[o.id] != null ? `${q.id}-${o.id}-impact` : undefined} className={`qcard ${on ? 'is-on' : ''} ${state ? 'is-' + state : ''}`} onClick={() => !reveal && onChange(o.id)} disabled={reveal && !on && !o.correct}>
            <span className="qcard__check" aria-hidden>
              {on && <Check />}
            </span>
            <span className="qcard__label">{o.label}</span>
            {o.sub && <span className="qcard__sub">{o.sub}</span>}
            <Impact q={q} id={o.id} impact={impact} />
          </button>
        );
      })}
    </div>
  );
}

function Chips({ q, value, onChange }: QProps) {
  const list = (value as string[]) ?? [];
  const toggle = (o: QOption) => {
    if (o.id === 'none') return onChange(list.includes('none') ? [] : ['none']);
    const base = list.filter((x) => x !== 'none');
    onChange(base.includes(o.id) ? base.filter((x) => x !== o.id) : [...base, o.id]);
  };
  return (
    <div className="qchips" role="group" aria-label={q.title}>
      {q.options!.map((o) => (
        <button key={o.id} className="qchip" aria-pressed={list.includes(o.id)} onClick={() => toggle(o)}>
          <span className="qchip__box" aria-hidden>
            {list.includes(o.id) && <Check />}
          </span>
          <span>
            <span className="qcard__label">{o.label}</span>
            {o.sub && <span className="qcard__sub">{o.sub}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Scale({ q, value, onChange }: QProps) {
  const v = value == null ? 2 : Number(value);
  const scale = q.scale ?? ['0', '1', '2', '3', '4'];
  useEffect(() => {
    if (value == null) onChange(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="qscale">
      <p className="qscale__value" aria-hidden>
        {scale[v]}
      </p>
      <input
        type="range"
        className="range"
        min={0}
        max={4}
        step={1}
        value={v}
        aria-label={q.title}
        aria-valuetext={scale[v]}
        style={{ ['--fill' as string]: `${(v / 4) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="qscale__ticks" aria-hidden>
        {scale.map((s, i) => (
          <button key={s} tabIndex={-1} className={i === v ? 'is-on' : ''} onClick={() => onChange(i)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function RankItem({ id, label, index, total, move, mark, locked }: { id: string; label: string; index: number; total: number; move: (from: number, to: number) => void; mark?: 'right' | 'wrong'; locked?: boolean }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls} className={`qrank__item ${mark ? `is-${mark}` : ''}`} whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-pop)' }}>
      <span className="qrank__grip" onPointerDown={(e) => !locked && controls.start(e)} aria-hidden style={{ touchAction: 'none' }}>
        <GripVertical />
      </span>
      <span className="qrank__pos tnum">{index + 1}</span>
      <span className="qrank__label">{label}</span>
      {mark && (
        <span className="qrank__mark" style={{ '--i': index } as React.CSSProperties}>
          {mark === 'right' ? <Check aria-hidden /> : <X aria-hidden />}
          <span className="sr-only">{mark === 'right' ? 'Correct place' : 'Wrong place'}</span>
        </span>
      )}
      <span className="qrank__btns">
        <button className="btn btn--sm btn--icon btn--ghost" disabled={locked || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${label} up`}>
          <ArrowUp />
        </button>
        <button className="btn btn--sm btn--icon btn--ghost" disabled={locked || index === total - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${label} down`}>
          <ArrowDown />
        </button>
      </span>
    </Reorder.Item>
  );
}

const hashOf = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
};

/** Put items in order. The options are listed in the correct order; the starting order is a stable shuffle. */
function Order({ q, value, onChange, reveal }: QProps) {
  const correct = q.options!.map((o) => o.id);
  const label = (id: string) => q.options!.find((o) => o.id === id)?.label ?? id;
  const start = useMemo(() => {
    const s = [...correct].sort((a, z) => hashOf(q.id + a) - hashOf(q.id + z));
    return s.every((id, i) => id === correct[i]) ? [...s].reverse() : s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);
  const order = (value as string[] | undefined) ?? start;
  useEffect(() => {
    if (value == null) onChange(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const move = (from: number, to: number) => {
    const n = [...order];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    onChange(n);
  };
  return (
    <Reorder.Group axis="y" values={order} onReorder={(next) => !reveal && onChange(next)} className="qrank" aria-label={q.title}>
      {order.map((id, i) => (
        <RankItem key={id} id={id} label={label(id)} index={i} total={order.length} move={move} locked={reveal} mark={reveal ? (correct[i] === id ? 'right' : 'wrong') : undefined} />
      ))}
    </Reorder.Group>
  );
}

function Rank({ q, value, onChange }: QProps) {
  const items = q.items!;
  const order = (value as string[]) ?? items.map((i) => i.id);
  useEffect(() => {
    if (value == null) onChange(items.map((i) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const move = (from: number, to: number) => {
    const n = [...order];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    onChange(n);
  };
  return (
    <Reorder.Group axis="y" values={order} onReorder={onChange} className="qrank" aria-label={q.title}>
      {order.map((id, i) => (
        <RankItem key={id} id={id} label={items.find((x) => x.id === id)?.label ?? id} index={i} total={order.length} move={move} />
      ))}
    </Reorder.Group>
  );
}

function ThisOrThat({ q, value, onChange, impact }: QProps) {
  const [a, b] = q.options!;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') onChange(a.id);
    if (e.key === 'ArrowRight') onChange(b.id);
  };
  return (
    <div className="qtot" onKeyDown={onKey}>
      {[a, b].map((o, i) => (
        <motion.button
          key={o.id}
          className={`qtot__card ${value === o.id ? 'is-on' : ''} ${value && value !== o.id ? 'is-off' : ''}`}
          aria-pressed={value === o.id}
          aria-describedby={impact?.[o.id] != null ? `${q.id}-${o.id}-impact` : undefined}
          onClick={() => onChange(o.id)}
          drag="x"
          dragSnapToOrigin
          dragElastic={0.4}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 70) onChange(o.id);
          }}
          style={{ touchAction: 'pan-y' }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="qtot__dir" aria-hidden>
            {i === 0 ? <ArrowLeft /> : <ArrowRight />}
          </span>
          <span className="qcard__label">{o.label}</span>
          {o.sub && <span className="qcard__sub">{o.sub}</span>}
          <Impact q={q} id={o.id} impact={impact} />
        </motion.button>
      ))}
      <span className="qtot__or" aria-hidden>
        or
      </span>
    </div>
  );
}

function Tradeoff({ q, value, onChange }: QProps) {
  const [x, y] = (value as [number, number]) ?? [0.5, 0.5];
  const pad = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [xl, xh, yl, yh] = q.axes!;
  useEffect(() => {
    if (value == null) onChange([0.5, 0.5]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (cx: number, cy: number) => {
    const r = pad.current!.getBoundingClientRect();
    onChange([Math.max(0, Math.min(1, (cx - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (cy - r.top) / r.height))]);
  };
  const end = () => {
    dragging.current = false;
  };
  return (
    <div className="qpad-wrap">
      <span className="qpad__ax qpad__ax--top">{yh}</span>
      <div className="qpad-row">
        <span className="qpad__ax qpad__ax--side">{xl}</span>
        <div
          ref={pad}
          className="qpad"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            set(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => dragging.current && set(e.clientX, e.clientY)}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        >
          <div className="qpad__grid" aria-hidden />
          <span
            className="qpad__dot"
            role="slider"
            tabIndex={0}
            aria-label={`${xl} to ${xh}, ${yl} to ${yh}`}
            aria-valuetext={`${Math.round(x * 100)}% ${xh.toLowerCase()}, ${Math.round(y * 100)}% ${yh.toLowerCase()}`}
            aria-valuenow={Math.round(x * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }}
            onKeyDown={(e) => {
              const s = 0.1;
              if (e.key === 'ArrowRight') onChange([Math.min(1, x + s), y]);
              else if (e.key === 'ArrowLeft') onChange([Math.max(0, x - s), y]);
              else if (e.key === 'ArrowUp') onChange([x, Math.min(1, y + s)]);
              else if (e.key === 'ArrowDown') onChange([x, Math.max(0, y - s)]);
              else return;
              e.preventDefault();
            }}
          />
        </div>
        <span className="qpad__ax qpad__ax--side">{xh}</span>
      </div>
      <span className="qpad__ax qpad__ax--bottom">{yl}</span>
    </div>
  );
}

function UiMock({ kind }: { kind: string }) {
  return (
    <span className={`mock mock--${kind}`} aria-hidden>
      <span className="mock__bar">
        <i />
        <i />
        <i />
      </span>
      <span className="mock__body">
        {kind === 'classic' && (
          <>
            <span className="mock__tabs">
              <b />
              <b />
              <b />
              <b />
            </span>
            <span className="mock__page" />
          </>
        )}
        {kind === 'vertical' && (
          <span className="mock__row">
            <span className="mock__side">
              <b />
              <b />
              <b />
              <b />
              <b />
            </span>
            <span className="mock__page" />
          </span>
        )}
        {kind === 'spaces' && (
          <span className="mock__row">
            <span className="mock__side mock__side--spaces">
              <em />
              <b />
              <b />
              <b />
            </span>
            <span className="mock__page" />
            <span className="mock__page" />
          </span>
        )}
        {kind === 'minimal' && <span className="mock__page mock__page--full" />}
      </span>
    </span>
  );
}

function UiPicker({ q, value, onChange, impact }: QProps) {
  return (
    <div className="qui" role="radiogroup" aria-label={q.title}>
      {q.options!.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} aria-describedby={impact?.[o.id] != null ? `${q.id}-${o.id}-impact` : undefined} className={`qui__opt ${value === o.id ? 'is-on' : ''}`} onClick={() => onChange(o.id)}>
          <UiMock kind={o.id} />
          <span className="qcard__label">{o.label}</span>
          <Impact q={q} id={o.id} impact={impact} />
        </button>
      ))}
    </div>
  );
}

const DEVICES: { id: OsId; label: string; icon: typeof Monitor }[] = [
  { id: 'windows', label: 'Windows PC', icon: Monitor },
  { id: 'macos', label: 'Mac', icon: Laptop },
  { id: 'linux', label: 'Linux', icon: Terminal },
  { id: 'android', label: 'Android phone or tablet', icon: Smartphone },
  { id: 'ios', label: 'iPhone or iPad', icon: Tablet },
  { id: 'chromeos', label: 'Chromebook', icon: Cloud },
];

function OsPick({ value, onChange }: QProps) {
  const list = (value as OsId[]) ?? [];
  return (
    <div className="qos" role="group" aria-label="Devices">
      {DEVICES.map((d) => {
        const on = list.includes(d.id);
        return (
          <button key={d.id} className={`qos__opt ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? list.filter((x) => x !== d.id) : [...list, d.id])}>
            <d.icon aria-hidden />
            <span>{d.label}</span>
            <span className="qchip__box" aria-hidden>
              {on && <Check />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Budget({ q, value, onChange }: QProps) {
  const items = q.items!;
  const pts = (value as Record<string, number>) ?? Object.fromEntries(items.map((i) => [i.id, 20]));
  useEffect(() => {
    if (value == null) onChange(Object.fromEntries(items.map((i) => [i.id, 20])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const total = Object.values(pts).reduce((a, v) => a + v, 0);
  const left = 100 - total;
  const set = (id: string, v: number) => {
    const clamped = Math.max(0, Math.min(v, pts[id] + left));
    onChange({ ...pts, [id]: clamped });
  };
  return (
    <div className="qbudget">
      <p className={`qbudget__left tnum ${left === 0 ? 'is-done' : ''}`} aria-live="polite">
        {left === 0 ? 'All 100 points placed' : `${left} points left to place`}
      </p>
      {items.map((it) => (
        <div key={it.id} className="qbudget__row">
          <span className="qbudget__label">{it.label}</span>
          <button className="btn btn--icon btn--sm" onClick={() => set(it.id, pts[it.id] - 5)} disabled={pts[it.id] <= 0} aria-label={`Fewer points for ${it.label}`}>
            <Minus />
          </button>
          <span className="qbudget__bar" aria-hidden>
            <motion.span animate={{ scaleX: pts[it.id] / 100 }} initial={false} transition={{ duration: 0.2 }} style={{ transformOrigin: 'left' }} />
          </span>
          <span className="tnum qbudget__n" aria-label={`${it.label}: ${pts[it.id]} points`}>
            {pts[it.id]}
          </span>
          <button className="btn btn--icon btn--sm" onClick={() => set(it.id, pts[it.id] + 5)} disabled={left <= 0} aria-label={`More points for ${it.label}`}>
            <Plus />
          </button>
        </div>
      ))}
    </div>
  );
}

const TRIAGE_LEVELS: { id: TriageLevel; label: string }[] = [
  { id: 'must', label: 'Must have' },
  { id: 'nice', label: 'Nice to have' },
  { id: 'no', label: 'Don’t mind' },
];

/** Rate each row Must have, Nice to have or Don't mind. Native radios give arrow-key movement for free. */
function Triage({ q, value, onChange }: QProps) {
  const base = useId();
  const levels = triageLevels(value);
  useEffect(() => {
    if (value == null) onChange({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="qtriage" role="group" aria-label={q.title}>
      {q.triage!.map((it) => (
        <div key={it.id} className="qtriage__row" role="radiogroup" aria-labelledby={`${base}-${it.id}`}>
          <span id={`${base}-${it.id}`} className="qtriage__label">
            <span className="qcard__label">{it.label}</span>
            {it.sub && <span className="qcard__sub">{it.sub}</span>}
          </span>
          <span className="qtriage__seg">
            {TRIAGE_LEVELS.map((l) => {
              const on = (levels[it.id] ?? 'no') === l.id;
              return (
                <label key={l.id} className={`qtriage__opt qtriage__opt--${l.id}`}>
                  <input type="radio" name={`${base}-${it.id}`} checked={on} onChange={() => onChange({ ...levels, [it.id]: l.id })} />
                  <span>
                    {l.id !== 'no' && <Check aria-hidden style={{ visibility: on ? 'visible' : 'hidden' }} />}
                    {l.label}
                  </span>
                </label>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Preset chips for quick taps plus a stepper and a typed field. */
function NumberQ({ q, value, onChange }: QProps) {
  const spec = q.number!;
  const hintId = useId();
  const v = typeof value === 'number' ? value : null;
  const hint = useMemo(() => spec.hint?.() ?? null, [spec]);
  const [text, setText] = useState(v == null ? '' : String(v));
  useEffect(() => setText(v == null ? '' : String(v)), [v]);
  const clamp = (n: number) => Math.max(spec.min, Math.min(spec.max, n));
  const bump = (dir: number) => onChange(clamp((v ?? spec.presets[1] ?? spec.min) + dir * spec.step));
  return (
    <div className="qnum">
      <div className="row" role="group" aria-label={`Common values for ${q.title}`}>
        {spec.presets.map((p) => (
          <button key={p} type="button" className="chip tnum" aria-pressed={v === p} onClick={() => onChange(p)}>
            {p} {spec.unit}
          </button>
        ))}
      </div>
      <div className="qnum__step">
        <button type="button" className="btn btn--icon" aria-label={`Fewer ${spec.unit}`} disabled={v != null && v <= spec.min} onClick={() => bump(-1)}>
          <Minus />
        </button>
        <input
          className="input qnum__input tnum"
          type="number"
          inputMode="numeric"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          aria-label={`${q.title} (${spec.unit})`}
          aria-describedby={hint ? hintId : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n) && n >= spec.min && n <= spec.max) onChange(Math.round(n));
          }}
          onBlur={() => setText(v == null ? '' : String(v))}
        />
        <span className="qnum__unit">{spec.unit}</span>
        <button type="button" className="btn btn--icon" aria-label={`More ${spec.unit}`} disabled={v != null && v >= spec.max} onClick={() => bump(1)}>
          <Plus />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="small muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Pick the browser you use now, and what bugs you about it. */
function BrowserQ({ q, value, onChange }: QProps) {
  const v: BrowserAnswer = (value as BrowserAnswer | null) ?? { id: null, gripes: [] };
  const cur = v.id ? BROWSER_BY_ID[v.id] : undefined;
  const seen = useMemo(() => {
    const d = detect();
    return d.browserId ? BROWSER_BY_ID[d.browserId] : undefined;
  }, []);
  const set = (patch: Partial<BrowserAnswer>) => onChange({ ...v, ...patch });
  const toggle = (id: string) => set({ gripes: v.gripes.includes(id) ? v.gripes.filter((g) => g !== id) : [...v.gripes, id] });
  return (
    <div className="qbrowser">
      {cur ? (
        <div className="qbrowser__cur panel panel-pad">
          <BrowserMark b={cur} size={32} />
          <strong className="truncate">{cur.name}</strong>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => set({ id: null, different: false })}>
            Change
          </button>
        </div>
      ) : (
        <div className="qbrowser__pick">
          <BrowserPicker label="Search for your browser" onPick={(b) => set({ id: b.id })} />
          {seen && (
            <button type="button" className="chip" onClick={() => set({ id: seen.id })}>
              I’m using {seen.name} right now
            </button>
          )}
        </div>
      )}
      <div className="qchips" role="group" aria-label="What bugs you about it">
        {q.gripes!.map((g) => (
          <button key={g.id} type="button" className="qchip" aria-pressed={v.gripes.includes(g.id)} onClick={() => toggle(g.id)}>
            <span className="qchip__box" aria-hidden>
              {v.gripes.includes(g.id) && <Check />}
            </span>
            <span className="qcard__label">{g.label}</span>
          </button>
        ))}
      </div>
      {cur && (
        <label className="switch">
          <input type="checkbox" checked={!!v.different} onChange={(e) => set({ different: e.target.checked })} /> Show me something different from {cur.name}
        </label>
      )}
    </div>
  );
}

export function QuestionView(p: QProps) {
  switch (p.q.type) {
    case 'order':
      return <Order {...p} />;
    case 'triage':
      return <Triage {...p} />;
    case 'number':
      return <NumberQ {...p} />;
    case 'browser':
      return <BrowserQ {...p} />;
    case 'single':
    case 'scenario':
    case 'trivia':
    case 'truefalse':
      return <Cards {...p} big={p.q.type === 'scenario'} />;
    case 'yesno':
      return <Cards {...p} />;
    case 'multi':
    case 'extensions':
      return <Chips {...p} />;
    case 'slider':
    case 'tolerance':
      return <Scale {...p} />;
    case 'rank':
      return <Rank {...p} />;
    case 'thisorthat':
      return <ThisOrThat {...p} />;
    case 'tradeoff':
      return <Tradeoff {...p} />;
    case 'ui':
      return <UiPicker {...p} />;
    case 'os':
      return <OsPick {...p} />;
    case 'budget':
      return <Budget {...p} />;
    default:
      return p.q.options ? <Cards {...p} /> : null;
  }
}

export const TYPE_LABEL: Record<string, string> = {
  single: 'Pick one',
  scenario: 'Scenario',
  yesno: 'Yes or no',
  multi: 'Pick any',
  extensions: 'Pick any',
  slider: 'Slide',
  tolerance: 'Slide',
  rank: 'Rank',
  thisorthat: 'This or that',
  tradeoff: 'Place the dot',
  ui: 'Pick a layout',
  os: 'Your devices',
  budget: 'Split points',
  triage: 'Rate each',
  number: 'Enter a number',
  browser: 'Your browser',
  order: 'Put in order',
  trivia: 'Trivia',
  truefalse: 'True or false',
};
