import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Target, CheckCircle2, AlertTriangle, Flame,
  TrendingUp, TrendingDown, Minus, BarChart3, CalendarClock,
  PieChart as PieChartIcon, ListOrdered, Gauge, Hourglass, CalendarCheck2,
  Activity, Loader2, Calendar as CalendarIcon, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, PieChart, Pie, Cell,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { C, CATEGORY_CONFIG, PRIORITY_CONFIG } from '../lib/shared';
import { startOfWeek, addDays } from '../lib/dates';
import {
  PERIODS, getPeriodRange, getPreviousPeriodRange, filterByCategory,
  onTimeRate, completedInPeriod, overdueNow, currentStreak,
  weeklyCompletion, upcomingLoad, categoryDistribution, categoryHours, pendingByPriority,
  avgMargin, avgResolutionTime, planningRate, weeklyOccupancy,
  formatDuration, formatMinutes,
} from '../lib/stats';
import StatCard from './StatCard';

const PREV_LABELS = { week: 'semana pasada', month: 'mes pasado', quarter: 'trimestre pasado' };
const DIST_HEIGHT = 210;
// Orden de prioridad de mayor a menor (PRIORITY_CONFIG está en orden ascendente: low→urgent)
const PRIORITY_DESC = ['urgent', 'high', 'medium', 'low'];

// ─── PIEZAS COMPARTIDAS ───────────────────────────────────────────────────────

function Pills({ options, value, onChange, useCategoryStyle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.id;
        const color = useCategoryStyle ? opt.color : C.blue;
        const bg = useCategoryStyle ? opt.bg : C.accentLt;
        const Ic = opt.icon;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '12px', fontWeight: active ? '700' : '500',
              border: '1.5px solid ' + (active ? color : C.border),
              background: active ? bg : C.surface,
              color: active ? color : C.muted,
              transition: 'all 0.15s',
            }}>
            {Ic && <Ic size={12} />}{opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Tarjeta contenedora para gráficos: título, caption opcional y estado vacío amigable.
function ChartCard({ icon: Icon, title, caption, height = 240, empty, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(15,32,64,0.05)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {Icon && <Icon size={14} color={C.navy} />}
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.navy }}>{title}</h3>
        </div>
        {caption && <span style={{ fontSize: '10px', color: C.mutedLt, fontWeight: '600' }}>{caption}</span>}
      </div>
      {empty ? (
        <div style={{ minHeight: height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.mutedLt, textAlign: 'center', padding: '0 12px' }}>
          <span style={{ fontSize: '12px' }}>{empty}</span>
        </div>
      ) : (
        <div style={{ width: '100%', height }}>{children}</div>
      )}
    </div>
  );
}

function StatsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(p => p.value !== undefined && p.value !== null && (p.value !== 0 || p.dataKey === 'onTimePct'));
  if (rows.length === 0) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 11px', boxShadow: '0 6px 20px rgba(15,32,64,0.16)', fontSize: '11px' }}>
      {label !== undefined && <div style={{ fontWeight: '700', color: C.navy, marginBottom: 4 }}>{label}</div>}
      {rows.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, padding: '1px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill, flexShrink: 0 }} />
          <span>{p.name}: <b style={{ color: C.navy }}>{p.value}{p.dataKey === 'onTimePct' ? '%' : ''}</b></span>
        </div>
      ))}
    </div>
  );
}

// Número sobre cada barra apilada del gráfico "Carga próxima"; en rojo si hay 3 o más.
function TotalLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={value >= 3 ? 800 : 600} fill={value >= 3 ? C.danger : C.muted}>
      {value}
    </text>
  );
}

// ─── SECCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export default function StatsView({ tasks, google, onGoToCalendar }) {
  const [period, setPeriod] = useState('week');
  const [category, setCategory] = useState('all');
  const now = new Date();

  const filtered  = useMemo(() => filterByCategory(tasks, category), [tasks, category]);
  const range     = useMemo(() => getPeriodRange(period, now), [period]);
  const prevRange = useMemo(() => getPreviousPeriodRange(period, now), [period]);

  // ── Fila 1 ──
  const rate    = onTimeRate(filtered, range);
  const comp    = completedInPeriod(filtered, range, prevRange);
  const overdue = overdueNow(filtered, range, now);
  const streak  = currentStreak(filtered, now);

  // ── Fila 2 ──
  const weekly   = useMemo(() => weeklyCompletion(filtered, 8, now), [filtered]);
  const upcoming = useMemo(() => upcomingLoad(filtered, 7, now), [filtered]);
  const weeklyHasData   = weekly.some(w => Object.keys(CATEGORY_CONFIG).some(c => w[c] > 0));
  const upcomingHasData = upcoming.some(d => d.total > 0);

  // ── Fila 3 ──
  const dist       = categoryDistribution(filtered, range);
  const hours      = categoryHours(filtered, range);
  const pendPrio   = pendingByPriority(filtered);
  const distTotal  = dist.reduce((s, d) => s + d.count, 0);
  const hoursTotal = hours.reduce((s, h) => s + h.hours, 0);
  const maxHours   = Math.max(1, ...hours.map(h => h.hours));
  const pendPrioOrdered = PRIORITY_DESC.map(key => pendPrio.find(p => p.key === key));
  const pendPrioTotal   = pendPrioOrdered.reduce((s, p) => s + p.count, 0);

  // ── Fila 4 ──
  const margin     = avgMargin(filtered, range);
  const resolution = avgResolutionTime(filtered, range);
  const plan       = planningRate(filtered);

  // Ocupación de la semana (Google + tareas programadas). No se filtra por tipo:
  // mezcla eventos de Google (sin categoría) con tareas, así que se usa `tasks` completo.
  const [weekEvents, setWeekEvents]   = useState([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [weekError, setWeekError]     = useState('');
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const connected = google?.status === 'connected';

  useEffect(() => {
    if (!connected) { setWeekEvents([]); return; }
    let cancelled = false;
    setLoadingWeek(true); setWeekError('');
    google.listEvents(weekStart, addDays(weekStart, 7))
      .then(items => { if (!cancelled) setWeekEvents(items); })
      .catch(err => { if (!cancelled) { setWeekEvents([]); if (!err.isAuthError) setWeekError(err.message); } })
      .finally(() => { if (!cancelled) setLoadingWeek(false); });
    return () => { cancelled = true; };
  }, [connected, weekStart.getTime()]);

  const linkedIds = useMemo(() => new Set(tasks.map(t => t.google_event_id).filter(Boolean)), [tasks]);
  const googleBlocks = useMemo(() => weekEvents
    .filter(ev => ev.start?.dateTime && !linkedIds.has(ev.id))
    .map(ev => ({ start: new Date(ev.start.dateTime), end: new Date(ev.end?.dateTime || ev.start.dateTime) })),
    [weekEvents, linkedIds]);
  const taskBlocks = useMemo(() => tasks
    .filter(t => t.scheduled_start && t.scheduled_end)
    .map(t => ({ start: new Date(t.scheduled_start), end: new Date(t.scheduled_end) })),
    [tasks]);
  const occupancy = useMemo(() => weeklyOccupancy(taskBlocks, googleBlocks), [taskBlocks, googleBlocks]);

  // Estado de la tarjeta 1 (cumplimiento a tiempo) según umbrales
  const rateColor = rate.pct === null ? C.mutedLt : rate.pct >= 80 ? C.success : rate.pct >= 50 ? C.warn : C.danger;
  const rateBg    = rate.pct === null ? C.bg      : rate.pct >= 80 ? C.successLt : rate.pct >= 50 ? C.warnLt : C.dangerLt;

  const diffArrow = comp.diff === null ? null : comp.diff > 0 ? TrendingUp : comp.diff < 0 ? TrendingDown : Minus;
  const diffColor = comp.diff === null ? C.mutedLt : comp.diff > 0 ? C.success : comp.diff < 0 ? C.danger : C.mutedLt;

  const marginColor = margin.minutes === null ? C.mutedLt : margin.minutes < 0 ? C.danger : C.navy;
  const marginAccent = margin.minutes !== null && margin.minutes < 0 ? C.danger : C.violet;

  return (
    <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
      <style>{`
        .mws-g4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .mws-g2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 1100px) { .mws-g4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px)  { .mws-g4 { grid-template-columns: 1fr; } .mws-g2 { grid-template-columns: 1fr; } }
      `}</style>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Periodo</div>
          <Pills options={PERIODS} value={period} onChange={setPeriod} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Tipo</div>
          <Pills
            options={[{ id: 'all', label: 'Todos', icon: LayoutDashboard, color: C.navy, bg: C.accentLt }, ...Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label, icon: cfg.icon, color: cfg.color, bg: cfg.bg }))]}
            value={category} onChange={setCategory} useCategoryStyle
          />
        </div>
      </div>

      {/* ── FILA 1: KPI ── */}
      <div className="mws-g4" style={{ marginBottom: 20 }}>
        <StatCard icon={Target} label="Cumplimiento a tiempo" iconColor={rateColor} iconBg={rateBg} accent={rateColor}
          value={rate.pct === null ? '—' : rate.pct + '%'} valueColor={rateColor} pct={rate.pct === null ? null : rate.pct}
          sublabel={PERIODS.find(p => p.id === period).label}
          footer={<span style={{ fontSize: '11px', color: C.muted }}>
            {rate.total === 0 ? 'Aún no hay tareas completadas con fecha límite en este periodo.' : `${rate.onTime} de ${rate.total} a tiempo`}
          </span>} />

        <StatCard icon={CheckCircle2} label="Completadas en el periodo" iconColor={C.success} iconBg={C.successLt} accent={C.success}
          value={comp.count}
          footer={comp.diff === null
            ? <span style={{ fontSize: '11px', color: C.mutedLt }}>Sin periodo anterior con qué comparar</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: '700', color: diffColor }}>
                {React.createElement(diffArrow, { size: 12 })}
                {comp.diff === 0 ? 'Sin cambios' : Math.abs(comp.diff)} vs {PREV_LABELS[period]}
              </span>} />

        <StatCard icon={AlertTriangle} label="Vencidas ahora" iconColor={overdue.count > 0 ? C.danger : C.success} iconBg={overdue.count > 0 ? C.dangerLt : C.successLt} accent={overdue.count > 0 ? C.danger : C.success}
          value={overdue.count} valueColor={overdue.count > 0 ? C.danger : C.navy}
          footer={<span style={{ fontSize: '11px', color: C.muted }}>
            {overdue.lateFinished} terminada{overdue.lateFinished === 1 ? '' : 's'} tarde en el periodo
          </span>} />

        <StatCard icon={Flame} label="Racha actual" iconColor={streak.current > 0 ? C.warn : C.mutedLt} iconBg={streak.current > 0 ? C.warnLt : C.bg} accent={streak.current > 0 ? C.warn : C.mutedLt}
          value={streak.current + (streak.current === 1 ? ' día' : ' días')}
          footer={<span style={{ fontSize: '11px', color: C.muted }}>Mejor racha: {streak.best} día{streak.best === 1 ? '' : 's'}</span>} />
      </div>

      {/* ── FILA 2: GRÁFICOS ── */}
      <div className="mws-g2" style={{ marginBottom: 20 }}>
        <ChartCard icon={BarChart3} title="Completadas por semana" caption="Últimas 8 semanas" height={260}
          empty={!weeklyHasData && 'Aún no hay tareas completadas en las últimas 8 semanas.'}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weekly} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
              <Tooltip content={<StatsTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg], i, arr) => (
                <Bar key={key} yAxisId="left" dataKey={key} stackId="cat" name={cfg.label} fill={cfg.color} maxBarSize={26}
                  radius={i === arr.length - 1 ? [3, 3, 0, 0] : 0} />
              ))}
              <Line yAxisId="right" type="monotone" dataKey="onTimePct" name="% a tiempo" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={CalendarClock} title="Carga próxima" caption="Próximos 7 días" height={260}
          empty={!upcomingHasData && 'No tienes tareas por vencer en los próximos 7 días.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={upcoming} margin={{ top: 20, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<StatsTooltip />} />
              {PRIORITY_DESC.slice().reverse().map((key, i, arr) => (
                <Bar key={key} dataKey={key} stackId="p" name={PRIORITY_CONFIG[key].label} fill={PRIORITY_CONFIG[key].color} maxBarSize={26}
                  radius={i === arr.length - 1 ? [3, 3, 0, 0] : 0}>
                  {i === arr.length - 1 && <LabelList dataKey="total" content={<TotalLabel />} />}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── FILA 3 ── */}
      <div className="mws-g2" style={{ marginBottom: 20 }}>
        <ChartCard icon={PieChartIcon} title="Distribución por categoría" caption={PERIODS.find(p => p.id === period).label} height={DIST_HEIGHT}
          empty={distTotal === 0 && 'Aún no hay tareas creadas en este periodo.'}>
          {/* Alturas en px explícitas (no '100%'): con alignItems:'center' la fila del grid no se
              estira, así que un height:'100%' no tiene una altura definida de la que partir y
              ResponsiveContainer termina colapsando el gráfico a un tamaño mínimo. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center', height: DIST_HEIGHT }}>
            <div style={{ position: 'relative', height: DIST_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="count" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                    {dist.map(d => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<StatsTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: C.navy, lineHeight: 1 }}>{distTotal}</div>
                <div style={{ fontSize: '9px', color: C.mutedLt, fontWeight: '600', textTransform: 'uppercase' }}>tareas</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Horas programadas {hoursTotal > 0 && <span style={{ color: C.muted }}>· {hoursTotal.toFixed(1)} h</span>}
              </div>
              {hoursTotal === 0
                ? <span style={{ fontSize: '11px', color: C.mutedLt }}>Sin horas programadas aún.</span>
                : hours.map(h => (
                  <div key={h.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.text, marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: h.color }} />{h.label}
                      </span>
                      <span style={{ fontWeight: '700', color: C.navy }}>{h.hours.toFixed(1)} h</span>
                    </div>
                    <div style={{ height: 5, background: C.bg, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(h.hours / maxHours) * 100}%`, background: h.color, borderRadius: 10, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard icon={ListOrdered} title="Pendientes por prioridad" caption="Instantánea actual" height={210}
          empty={pendPrioTotal === 0 && '¡Sin pendientes! No tienes tareas por hacer.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pendPrioOrdered} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={62} tick={{ fontSize: 11, fill: C.navy, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<StatsTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {pendPrioOrdered.map(d => <Cell key={d.key} fill={d.color} />)}
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 700, fill: C.navy }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── FILA 4: HÁBITOS ── */}
      <div className="mws-g4">
        <StatCard icon={Gauge} label="Margen promedio" iconColor={marginAccent} iconBg={margin.minutes !== null && margin.minutes < 0 ? C.dangerLt : C.violetLt} accent={marginAccent}
          value={margin.minutes === null ? '—' : formatDuration(margin.minutes)} valueColor={marginColor}
          footer={<span style={{ fontSize: '11px', color: C.muted }}>
            {margin.count === 0 ? 'Aún no hay tareas completadas con fecha límite en este periodo.' : `${margin.count} tarea${margin.count === 1 ? '' : 's'} con fecha límite`}
          </span>} />

        <StatCard icon={Hourglass} label="Tiempo de resolución" iconColor={C.blue} iconBg={C.accentLt} accent={C.blue}
          value={resolution.minutes === null ? '—' : formatMinutes(resolution.minutes)}
          footer={<span style={{ fontSize: '11px', color: C.muted }}>
            {resolution.count === 0 ? 'Aún no hay tareas completadas en este periodo.' : `${resolution.count} tarea${resolution.count === 1 ? '' : 's'} completadas`}
          </span>} />

        <StatCard icon={CalendarCheck2} label="Planificación" iconColor={C.violet} iconBg={C.violetLt} accent={C.violet}
          value={plan.pct === null ? '—' : plan.pct + '%'} pct={plan.pct === null ? null : plan.pct}
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '11px', color: C.muted }}>
                {plan.total === 0 ? 'No tienes pendientes con fecha límite.' : `${plan.scheduled} de ${plan.total} programadas`}
              </span>
              {plan.total > plan.scheduled && (
                <button onClick={onGoToCalendar}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '20px', border: '1.5px solid ' + C.violetLt, background: C.violetLt, color: C.violet, fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Programar pendientes <ArrowRight size={10} />
                </button>
              )}
            </div>
          } />

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Activity size={14} color={C.navy} />
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.navy }}>Ocupación de esta semana</h3>
          </div>
          {!google?.configured ? (
            <span style={{ fontSize: '11px', color: C.mutedLt }}>Google Calendar no está configurado.</span>
          ) : !connected ? (
            <>
              <span style={{ fontSize: '11px', color: C.mutedLt }}>Conecta Google Calendar para ver cuánto de tu semana está ocupado.</span>
              <button onClick={google.connect}
                style={{ display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', padding: '6px 12px', borderRadius: '20px', border: '1.5px solid ' + C.border, background: C.surface, color: C.navy, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                <CalendarIcon size={12} color={C.blue} /> Conectar
              </button>
            </>
          ) : loadingWeek ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mutedLt, fontSize: '11px' }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cargando tu semana…
            </div>
          ) : (
            <>
              {weekError && <span style={{ fontSize: '10px', color: C.danger }}>No se pudo cargar todo: {weekError}</span>}
              <div style={{ display: 'flex', height: 10, borderRadius: 10, overflow: 'hidden', background: C.bg }}>
                {/* Si Google + tareas suman más que las horas disponibles (bloques solapados), se
                    escala proporcionalmente para que la barra no se desborde visualmente. */}
                <div style={{ width: `${Math.min(100, (occupancy.googleHours / occupancy.availableHours) * 100)}%`, background: '#64748B' }} title={`Google: ${occupancy.googleHours.toFixed(1)} h`} />
                <div style={{ width: `${Math.max(0, Math.min(100 - (occupancy.googleHours / occupancy.availableHours) * 100, (occupancy.taskHours / occupancy.availableHours) * 100))}%`, background: C.blue }} title={`Tareas: ${occupancy.taskHours.toFixed(1)} h`} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '10px', color: C.muted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#64748B' }} />Google · {occupancy.googleHours.toFixed(1)} h</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.blue }} />Tareas · {occupancy.taskHours.toFixed(1)} h</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.border }} />Libre · {occupancy.freeHours.toFixed(1)} h</span>
              </div>
              <div style={{ fontSize: '11px', color: C.navy, fontWeight: '700' }}>
                {(occupancy.googleHours + occupancy.taskHours).toFixed(1)} h de {occupancy.availableHours} h disponibles (07:00–22:00)
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
