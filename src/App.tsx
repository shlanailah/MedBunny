import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  api,
  ApiError,
  formatApiDate,
  type Child,
  type DoseLog,
  type DoseStatus,
  type Medication,
  type MedicationDraft,
  type Session,
  type SessionUser,
} from './lib/api'

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2" /></>,
    history: <><path d="M3 10a9 9 0 1 1 1 8M3 4v6h6m3-3v6l4 2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    pill: <><path d="m8 4-4 4a6 6 0 0 0 8 8l4-4a6 6 0 0 0-8-8Z" /><path d="m6 6 8 8" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />,
    heart: <path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s0 8 8 15c8-7 11-12 8-15Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    edit: <path d="m15 5 4 4L8 20H4v-4ZM13 7l4 4" />,
    child: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9 15a4 4 0 0 0 6 0M12 3c-1 2 0 3 2 3" /></>,
    bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z" /><path d="M10 21h4" /></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
    timer: <><circle cx="12" cy="14" r="7" /><path d="M10 3h4m-2 7v4" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    logout: <><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sun}</svg>
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfWeek(date: Date) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - copy.getDay())
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + amount)
  return copy
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function monthLabel(dateKeyValue: string, withDay = false) {
  const date = new Date(`${dateKeyValue}T12:00:00`)
  return date.toLocaleDateString('en-US', withDay
    ? { month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'long', year: 'numeric' })
}

function doseBucket(value: string) {
  const hour = new Date(value).getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Terjadi kesalahan. Coba lagi sebentar.'
}

function AddMedication({ onBack, initial, onSave }: { onBack: () => void; initial?: Medication; onSave: (medication: MedicationDraft) => Promise<void> }) {
  const [frequency, setFrequency] = useState(initial?.frequency ?? 'Every day')
  const [times, setTimes] = useState(initial?.times ?? ['08:00', '14:00', '22:00'])
  const [meal, setMeal] = useState(initial?.meal ?? 'Anytime')
  const [days, setDays] = useState<string[]>(initial?.days ?? [])
  const [name, setName] = useState(initial?.name ?? '')
  const [dose, setDose] = useState(initial?.dose ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [reviewing, setReviewing] = useState(Boolean(initial))
  const [dayError, setDayError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  function backToEdit() { setReviewing(false) }
  async function saveMedication() {
    setSaving(true)
    setSaveError('')
    try {
      await onSave({
        name: name.trim(),
        dose: dose.trim(),
        startDate,
        note: note.trim(),
        frequency,
        times: frequency === 'As needed' ? [] : times,
        time: frequency === 'As needed' ? '' : (times[0] ?? ''),
        meal,
        days: frequency === 'Some days' ? days : [],
      })
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  if (reviewing) return <section className="add-medication-page review-page" aria-labelledby="review-title">
    <div className="add-page-title"><button className="back-medication" onClick={onBack} aria-label="Back to medications"><Icon name="chevron" /></button><div><div className="eyebrow">A LITTLE CHECK, A LOT OF CARE</div><h1 id="review-title">{initial ? 'Edit Medication' : 'Add Medication'}</h1></div></div>
    <div className="review-content">
      <img className="peeking-bunny" src="/assets/bunny-peeking.png" alt="MedBunny peeking over your medication review" />
      <article className="review-card"><div className="review-medication-title"><span className="medicine-icon coral"><Icon name="pill" /></span><div><h2>{name}</h2><p>{dose}</p></div><button className="review-edit" onClick={backToEdit} aria-label="Edit medication details">Edit<Icon name="chevron" size={14} /></button></div>
        <div className="review-detail"><div><span>Frequency</span><strong>{frequency === 'As needed' ? 'As needed' : `${times.length} ${times.length === 1 ? 'time' : 'times'} a day`}</strong>{frequency === 'Some days' && <p>{days.join(', ')}</p>}{frequency === 'Every day' && <p>Every day</p>}</div><span className="review-slots">{frequency === 'As needed' ? 'No fixed times' : `${times.length} time ${times.length === 1 ? 'slot' : 'slots'}`}</span></div>
        <div className="review-detail"><div><span>Start date</span><strong>{startDate ? new Date(`${startDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not selected'}</strong></div><button className="review-edit" onClick={backToEdit} aria-label="Edit start date"><Icon name="schedule" size={19} /></button></div>
      </article>
      <article className="review-card"><h2>Daily schedule</h2><p className="review-helper">Please verify these times against your prescription before saving.</p>
        {frequency === 'As needed' ? <p className="review-as-needed">No fixed schedule. Follow your healthcare professional’s instructions.</p> : times.map((time, index) => <div className="review-time-row" key={index}><span className="medicine-icon"><Icon name="history" size={20} /></span><div><strong>Time {index + 1} · {Number(time.slice(0, 2)) < 12 ? 'Morning' : Number(time.slice(0, 2)) < 18 ? 'Afternoon' : 'Evening'}</strong><p>{dose} each time</p></div><button className="review-time-edit" onClick={backToEdit} aria-label={`Edit dose ${index + 1} time`}><time>{time}</time><Icon name="chevron" size={14} /></button></div>)}
      </article>
      <div className="review-instructions"><article className="review-card"><h2>Meal instructions</h2><p>{meal}</p><button className="review-edit" onClick={backToEdit}>Edit</button></article><article className="review-card"><h2>Additional instructions</h2><p>{note || 'No additional notes'}</p><button className="review-edit" onClick={backToEdit}>Edit</button></article></div>
      {saveError && <p className="proof-error" role="alert">{saveError}</p>}
      <div className="review-actions"><button className="review-save" disabled={saving} onClick={() => void saveMedication()}>{saving ? 'Saving…' : <><Icon name="check" size={18} />Save</>}</button><button className="review-back" onClick={backToEdit} disabled={saving}>Back to edit</button></div>
    </div>
  </section>
  return <section className="add-medication-page" aria-labelledby="add-title">
    <div className="add-page-title"><button className="back-medication" onClick={onBack} aria-label="Back to medications"><Icon name="chevron" /></button><div><div className="eyebrow">LET’S BUILD A HEALTHY ROUTINE</div><h1 id="add-title">Add Medication</h1></div></div>
    <div className="add-form-card">
      <img className="peeking-bunny" src="/assets/bunny-peeking.png" alt="MedBunny peeking over the medication form" />
      <form onSubmit={event => { event.preventDefault(); if (frequency === 'Some days' && !days.length) { setDayError(true); return } setDayError(false); setReviewing(true) }}>
        <div className="add-top-fields">
          <label>Medication name <span>*</span><input name="medication-name" required pattern=".*\S.*" maxLength={80} placeholder="Enter medication name" value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Dose <span>*</span><input name="dose" required pattern=".*\S.*" maxLength={40} placeholder="e.g. 500 mg" value={dose} onChange={event => setDose(event.target.value)} /></label>
          <label>Start date <span>*</span><input name="start-date" type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
        </div>
        <div className="add-section frequency-section"><h2><span className="step-dot">1</span>How often</h2><div className="choice-group" role="group" aria-label="Medication frequency">{['Every day', 'Some days', 'As needed'].map(option => <button key={option} type="button" aria-pressed={frequency === option} className={frequency === option ? 'chosen' : ''} onClick={() => setFrequency(option)}>{option}</button>)}</div>
        {frequency === 'Some days' && <div className="weekday-choices" role="group" aria-label="Days to take medication">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <button key={day} type="button" aria-pressed={days.includes(day)} className={days.includes(day) ? 'chosen' : ''} onClick={() => setDays(previous => previous.includes(day) ? previous.filter(value => value !== day) : [...previous, day])}>{day}</button>)}</div>}
        {frequency === 'As needed' && <p className="add-helper">Take only as directed by your healthcare professional. No fixed dose times.</p>}
        </div>
        {frequency !== 'As needed' && <div className="add-section"><h2><span className="step-dot">2</span>Dose times</h2><div className="dose-times-panel"><div className="times-counter"><div><strong>Times a day</strong><p>Set each time according to your prescription.</p></div><div className="counter-controls"><button type="button" aria-label="Remove a dose time" disabled={times.length <= 1} onClick={() => setTimes(previous => previous.slice(0, -1))}>−</button><strong aria-live="polite">{times.length}</strong><button type="button" aria-label="Add a dose time" disabled={times.length >= 8} onClick={() => setTimes(previous => [...previous, '08:00'])}>+</button></div></div><div className="dose-time-inputs">{times.map((time, index) => <label key={index}><Icon name="history" size={16} /><input aria-label={`Dose ${index + 1} time`} type="time" required value={time} onChange={event => setTimes(previous => previous.map((value, i) => i === index ? event.target.value : value))} /></label>)}</div><p className="timing-note"><Icon name="heart" size={14} />Follow the timing recommended by your healthcare professional.</p></div></div>}
        <div className="add-section"><h2><span className="step-dot">3</span>Take it</h2><div className="meal-choices" role="group" aria-label="Meal instructions">{['Before a meal', 'After a meal', 'Anytime'].map(option => <button key={option} type="button" aria-pressed={meal === option} className={meal === option ? 'chosen' : ''} onClick={() => setMeal(option)}>{option}</button>)}</div></div>
        <div className="add-section instructions-section"><h2><span className="step-dot">4</span>Additional instructions</h2><label>Instructions from the label or healthcare professional<textarea name="instructions" rows={3} maxLength={1000} placeholder="e.g. Record the exact instructions here..." value={note} onChange={event => setNote(event.target.value)} /></label></div>
        {dayError && <p role="alert" className="proof-error">Please select at least one day.</p>}
        <button className="review-schedule" type="submit">Review Schedule <Icon name="chevron" size={19} /></button>
      </form>
    </div>
  </section>
}

function MedicationHistory({ childId }: { childId: string }) {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('All')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('All')
  const [rows, setRows] = useState<DoseLog[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const today = formatApiDate(new Date())
  const now = new Date()
  const monthStart = formatApiDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = formatApiDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const from = date || (period === 'Today' ? today : monthStart)
  const to = date || (period === 'Today' ? today : monthEnd)

  useEffect(() => {
    let cancelled = false
    api.getStars(childId)
      .then(result => { if (!cancelled) setBalance(result.balance) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [childId, reloadKey])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setLoadError('')
      api.listDoses(childId, {
        from,
        to,
        status: status === 'All' ? undefined : status.toLowerCase() as DoseStatus,
        q: query.trim() || undefined,
      })
        .then(result => { if (!cancelled) setRows(result) })
        .catch(error => { if (!cancelled) setLoadError(errorMessage(error)) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, query.trim() ? 250 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [childId, from, to, status, query, reloadKey])

  const hasFilters = Boolean(query || date || period !== 'All' || status !== 'All')
  function resetFilters() { setQuery(''); setDate(''); setPeriod('All'); setStatus('All') }

  return <section className="history-page" aria-labelledby="history-title">
    <div className="history-page-heading"><div><div className="eyebrow">EVERY LITTLE STEP COUNTS</div><h1 id="history-title">Your report</h1></div></div>
    <div className="history-hero"><img src="/assets/history-bunny.png" alt="A happy MedBunny celebrating with a smiling star" /><div className="history-hero-copy"><span className="history-hero-label">GROWING HEALTHIER, TOGETHER</span><h2>You’re making progress!</h2><p>Every record helps you keep track of the routine.</p><div className="history-stars"><img className="happy-star-icon" src="/assets/happy-star.png" width={32} height={32} alt="" /><strong>{balance}</strong><span>stars collected</span></div></div><div className="history-hero-decoration" aria-hidden="true"><img className="happy-star-icon" src="/assets/happy-star.png" width={44} height={44} alt="" /><img className="happy-star-icon" src="/assets/happy-star.png" width={23} height={23} alt="" /></div></div>
    <div className="history-record-heading"><div><h2>Medication history</h2><p>A little care, one dose at a time.</p></div><span>{date ? monthLabel(date, true) : period === 'Today' ? 'Today' : monthLabel(from)}</span></div>
    <div className="history-filters">
      <label className="history-period"><span className="sr-only">Time period</span><select value={period} onChange={event => { setPeriod(event.target.value); setDate('') }}><option>All</option><option>Today</option></select></label>
      <label className="history-search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg><span className="sr-only">Search medication name</span><input type="search" placeholder="Search medication name" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="history-date"><span>Date</span><input type="date" aria-label="Filter by date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="history-status"><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="All">Status</option><option>Recorded</option><option>Awaiting</option><option>Missed</option><option>Upcoming</option></select></label>
    </div>
    <div className="history-result-info" aria-live="polite"><span>{loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}</span>{hasFilters && <button onClick={resetFilters}>Clear filters</button>}</div>
    <div className="history-records">
      <div className="history-table-heading" aria-hidden="true"><span>MEDICATION</span><span>DATE</span><span>TIME</span><span>STATUS</span></div>
      {loading && <div className="history-empty"><p>Loading your records…</p></div>}
      {!loading && loadError && <div className="history-empty"><Icon name="history" size={33} /><h3>Could not load records</h3><p>{loadError}</p><button onClick={() => setReloadKey(key => key + 1)}>Try again</button></div>}
      {!loading && !loadError && rows.map((row, index) => {
        const scheduled = new Date(row.scheduledAt)
        const statusLabel = row.status.charAt(0).toUpperCase() + row.status.slice(1)
        return <article className="history-record" key={row.id}><div className="history-medication"><span className={`medicine-icon ${['coral', 'yellow', 'blue'][index % 3]}`}><Icon name="pill" size={21} /></span><div><h3>{row.medicationName}</h3><p>{row.dose}</p></div></div><time className="history-record-date" dateTime={row.scheduledAt}>{scheduled.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time><span className="history-record-time">{timeLabel(row.scheduledAt)}</span><span className={`history-record-status ${row.status}`}><Icon name={row.status === 'recorded' ? 'check' : 'history'} size={14} />{statusLabel}</span></article>
      })}
      {!loading && !loadError && !rows.length && <div className="history-empty"><Icon name="history" size={33} /><h3>No records found</h3><p>Try another medication name, date, or status.</p>{hasFilters && <button onClick={resetFilters}>Clear filters</button>}</div>}
    </div>
    <p className="history-note"><Icon name="heart" size={14} />Your records are saved to your account. Your care and consistency make a difference.</p>
  </section>
}

function MedicationSchedule({ childId, onChanged }: { childId: string; onChanged: () => void }) {
  const [items, setItems] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [notice, setNotice] = useState('')

  async function loadMedications() {
    setLoading(true)
    setLoadError('')
    try {
      setItems(await api.listMedications(childId))
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMedications()
  }, [childId])

  async function saveMedication(medication: MedicationDraft) {
    if (editing === 'new') {
      const created = await api.createMedication(childId, medication)
      setItems(previous => [...previous, created])
      setNotice('Medication added to your schedule.')
    } else if (editing) {
      const updated = await api.updateMedication(editing, medication)
      setItems(previous => previous.map(item => item.id === editing ? updated : item))
      setNotice('Medication updated.')
    }
    setEditing(null)
    onChanged()
  }

  const current = items.find(item => item.id === editing)
  if (editing !== null) return <AddMedication initial={current} onBack={() => setEditing(null)} onSave={saveMedication} />

  return <section className="medication-page" aria-labelledby="medications-title">
    <div className="medication-page-heading">
      <div><div className="eyebrow">LITTLE DOSES, LOVING CARE</div><h1 id="medications-title">Your Medication</h1><p>Keep every little dose in one happy place.</p></div>
      <button className="add-medication" onClick={() => setEditing('new')}>Add medication <span aria-hidden="true">+</span></button>
    </div>
    <div className="medication-page-meta"><Icon name="schedule" size={16} /><span>{items.length} scheduled doses</span><span className="medication-parent-note">Managed by a parent or caregiver</span></div>
    {loading ? <div className="history-empty"><p>Loading medications…</p></div> : loadError ? <div className="history-empty"><Icon name="pill" size={33} /><h3>Could not load medications</h3><p>{loadError}</p><button onClick={() => void loadMedications()}>Try again</button></div> : items.length ? <div className="medication-list">{items.map((item, index) => <article className={`medication-entry medication-entry-${index % 3}`} key={item.id}>
      <span className="medication-entry-icon"><img className="medicine-illustration" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /></span>
      <div className="medication-entry-copy"><h2>{item.name} <span>{item.dose}</span></h2><span className="medication-time">{item.meal} · {item.frequency === 'As needed' ? 'As needed' : `${item.times.length} ${item.times.length === 1 ? 'time' : 'times'} a day`}{item.frequency === 'Some days' && ` · ${item.days.join(', ')}`}</span></div>
      <button className="edit-medication" onClick={() => setEditing(item.id)} aria-label={`Edit ${item.name} at ${item.time}`}>Edit<Icon name="chevron" size={15} /></button>
    </article>)}</div> : <div className="history-empty"><Icon name="pill" size={33} /><h3>No medications yet</h3><p>Add the first medication to build your routine.</p><button onClick={() => setEditing('new')}>Add medication</button></div>}
    <p className="medication-notice" role="status">{notice}</p>
    <div className="schedule-mascot"><img src="/assets/schedule-bunny.png" alt="MedBunny holding a star in a flower garden" /><p>Small routines,<br /><strong>bright futures.</strong></p></div>
  </section>
}

const profileSettings = [
  { icon: 'child', title: 'Child Profile', description: 'Nickname and essential basic information', color: 'yellow' },
  { icon: 'bell', title: 'Notifications', description: 'Reminder and notification preferences', color: 'blue' },
  { icon: 'shield', title: 'Security', description: 'PIN or authentication for Parent Mode', color: 'sage' },
  { icon: 'timer', title: 'Kids Mode Settings', description: 'Session length and end-of-play reminders', color: 'lavender' },
  { icon: 'trash', title: 'Data & Account', description: 'Export or delete data with parent confirmation', color: 'coral' },
]

function ProfilePage({ user, child, onBack, onLogout }: { user: SessionUser; child?: Child; onBack: () => void; onLogout: () => void }) {
  return <section className="profile-page" aria-labelledby="profile-title">
    <div className="add-page-title"><button className="back-medication" onClick={onBack} aria-label="Back"><Icon name="chevron" /></button><div><div className="eyebrow">YOUR FAMILY, YOUR WAY</div><h1 id="profile-title">Profile</h1></div></div>
    <div className="profile-card">
      <img className="peeking-bunny" src="/assets/bunny-peeking.png" alt="" />
      <div className="profile-summary"><span className="profile-photo"><Icon name="user" size={34} /></span><div><h2>{user.name}</h2><p>{user.email}</p>{child?.nickname && <p>Child nickname: {child.nickname}</p>}</div><span className="profile-edit" aria-hidden="true"><Icon name="edit" size={19} /></span></div>
      <ul className="profile-settings">{profileSettings.map(item => <li className="profile-setting" key={item.title}><span className={`profile-setting-icon ${item.color}`}><Icon name={item.icon} size={21} /></span><div><h3>{item.title}</h3><p>{item.description}</p></div><Icon name="chevron" size={17} /></li>)}</ul>
    </div>
    <button className="profile-logout" onClick={onLogout}><Icon name="logout" size={18} />Logout</button>
  </section>
}

type PublicScreen = 'landing' | 'login' | 'signup' | 'garden-preview' | 'app'

function useScrollReveal(rootRef: { current: HTMLDivElement | null }) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group] > *'))
    const revealAll = () => targets.forEach(target => target.classList.add('is-revealed'))

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealAll()
      return
    }

    root.classList.add('reveal-ready')
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-revealed', entry.isIntersecting)
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })

    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [rootRef])
}

function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const landingRef = useRef<HTMLDivElement>(null)
  useScrollReveal(landingRef)
  const problems = [
    { icon: 'child', title: 'It’s hard to get them to cooperate.', description: 'Your child might refuse or feel scared when it’s time for medicine.', tone: 'peach' },
    { icon: 'schedule', title: 'Did I give the medicine already?', description: 'Busy days make it hard to remember whether the schedule was followed.', tone: 'sky' },
    { icon: 'history', title: 'Keeping track is exhausting.', description: 'Schedules, instructions, and records can quickly feel overwhelming.', tone: 'lavender' },
  ]
  const features = [
    { icon: 'schedule', title: 'Medication tracker', description: 'View schedules and dose status.', tone: 'sage' },
    { icon: 'bell', title: 'Gentle reminders', description: 'Alerts based on your routine.', tone: 'sky' },
    { icon: 'star', title: 'Bunny’s playtime', description: 'Fun mini-games and activities.', tone: 'sunshine' },
    { icon: 'history', title: 'Progress & history', description: 'See your child’s medication history.', tone: 'lavender' },
    { icon: 'shield', title: 'Parent-controlled', description: 'Your account stays in your control.', tone: 'peach' },
  ]
  return <div className="landing-page" ref={landingRef}>
    <header className="landing-header">
      <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="MedBunny, back to top"><img src="/assets/medbunny-wordmark.png" alt="MedBunny" /></button>
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#home">Home</a><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#our-story">Our story</a>
      </nav>
      <div className="landing-actions"><button className="landing-login" onClick={onLogin}>Log in</button><button className="landing-primary" onClick={onSignup}>Get started</button></div>
    </header>

    <main className="landing-main">
      <section className="landing-hero" id="home">
        <div className="landing-hero-copy" data-reveal-group><span className="landing-kicker">A little care, every day</span><h1>Little Doses,<br /><span>Big Adventures.</span></h1><p>Making medicine routines easier for parents and more playful for little ones.</p><div className="landing-hero-actions"><button className="landing-primary" onClick={onSignup}>Get started <Icon name="chevron" size={16} /></button><a className="landing-secondary" href="#how-it-works">See how it works</a></div><div className="landing-trust"><span><Icon name="shield" size={15} />Parent-guided routines</span><span><Icon name="heart" size={15} />Child-friendly play</span></div></div>
        <div className="landing-hero-art" data-reveal><span className="landing-orbit orbit-one" /><span className="landing-orbit orbit-two" /><img src="/assets/bunny.png" alt="MedBunny holding a happy star" /><img className="landing-bottle" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /><span className="landing-star star-one">✦</span><span className="landing-star star-two">✦</span><div className="hero-chip chip-dose" aria-hidden="true"><span><Icon name="bell" size={17} /></span><div><small>Next dose</small><strong>2:00 PM · Ibuprofen</strong></div></div><div className="hero-chip chip-star" aria-hidden="true"><img src="/assets/happy-star.png" alt="" /><div><small>Today</small><strong>+1 star earned!</strong></div></div></div>
      </section>

      <section className="landing-section problem-section" id="our-story">
        <div className="landing-section-heading" data-reveal><span className="landing-kicker">The problem</span><h2>When Medicine Time Becomes a Challenge</h2><p>We understand. You’re not alone.</p></div>
        <div className="problem-box"><img src="/assets/bunny-peeking.png" alt="MedBunny listening with care" data-reveal /><div className="problem-grid" data-reveal-group>{problems.map(problem => <article className={`landing-info-card tone-${problem.tone}`} key={problem.title}><span><Icon name={problem.icon} size={24} /></span><h3>{problem.title}</h3><p>{problem.description}</p></article>)}</div></div>
      </section>

      <section className="landing-section solution-section">
        <div className="landing-section-heading" data-reveal><span className="landing-kicker">Our solution</span><h2>A Little Helper for Your Child’s Medicine Routine</h2><p>MedBunny helps you stay on track with medication schedules, gentle reminders, and fun activities — all in one place.</p><button className="landing-primary" onClick={onSignup}>Explore MedBunny</button></div>
        <div className="solution-card"><img src="/assets/schedule-bunny.png" alt="MedBunny helping build a healthy routine" data-reveal /><div className="solution-benefits" data-reveal-group><div className="tone-sage"><Icon name="schedule" /><strong>Medication schedule & reminders</strong></div><div className="tone-sky"><Icon name="check" /><strong>Track doses with ease</strong></div><div className="tone-sunshine"><Icon name="star" /><strong>Bunny mascot & mini-games</strong></div><div className="tone-peach"><Icon name="heart" /><strong>One place for you and your child</strong></div></div></div>
      </section>

      <section className="landing-section how-section" id="how-it-works">
        <div className="landing-section-heading" data-reveal><span className="landing-kicker">How it works</span><h2>Small Steps, Easier Routines</h2><p>A simple flow to help you and your child build healthy habits together.</p></div>
        <div className="steps-card" data-reveal-group>{[ 
          { icon: 'schedule', title: 'Set the schedule', description: 'Enter medication details based on the label or care instructions.' },
          { icon: 'check', title: 'Track together', description: 'Log doses, check the schedule, and get gentle reminders.' },
          { icon: 'star', title: 'Play & explore', description: 'Let your child enjoy mini-games and fun activities.' },
        ].map((step, index) => <article className={`tone-${['sage', 'sky', 'sunshine'][index]}`} key={step.title}><span className="step-number">{index + 1}</span><span className="step-icon"><Icon name={step.icon} size={26} /></span><h3>{step.title}</h3><p>{step.description}</p>{index < 2 && <Icon name="chevron" size={18} />}</article>)}</div>
      </section>

      <section className="landing-section features-section" id="features">
        <div className="landing-section-heading" data-reveal><span className="landing-kicker">Key features</span><h2>More Than a Reminder</h2><p>Thoughtfully designed for both parents and children.</p></div>
        <div className="features-card" data-reveal-group>{features.map(feature => <article className={`tone-${feature.tone}`} key={feature.title}><span><Icon name={feature.icon} size={23} /></span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
      </section>

      <section className="promise-section"><div data-reveal><span className="landing-kicker">Our promise</span><h2>Care Comes First</h2><p>We’re here to support your family with safe, simple, and responsible tools.</p></div><img src="/assets/bunny.png" alt="MedBunny holding a heart" data-reveal /><ul data-reveal-group><li><Icon name="check" size={15} />Medication information is managed by you.</li><li><Icon name="check" size={15} />You enter instructions from the label or healthcare professional.</li><li><Icon name="check" size={15} />MedBunny is not a substitute for a doctor or pharmacist.</li><li><Icon name="check" size={15} />Parent access helps protect your child’s data.</li></ul></section>
      <section className="landing-cta" data-reveal><img src="/assets/bunny-peeking.png" alt="" /><span className="cta-star cta-star-one" aria-hidden="true">✦</span><span className="cta-star cta-star-two" aria-hidden="true">✦</span><div className="landing-cta-content"><span className="landing-kicker">Ready to make medicine time feel different?</span><h2>A little support for you. A little adventure for them.</h2><div className="landing-cta-actions"><button className="landing-primary" onClick={onSignup}>Create your free account</button><button className="landing-login" onClick={onLogin}>Log in</button></div></div></section>
    </main>
    <footer className="landing-footer"><img src="/assets/medbunny-wordmark.png" alt="MedBunny" /><span>Made for little ones. Here for you.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</button></footer>
  </div>
}

function AuthPage({ mode, onBack, onSubmit, onSwitch }: { mode: 'login' | 'signup'; onBack: () => void; onSubmit: (input: { name: string; email: string; password: string }) => Promise<void>; onSwitch: () => void }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), password })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page">
    <button className="auth-back" onClick={onBack}><Icon name="chevron" size={17} />Back to MedBunny</button>
    <section className="auth-shell">
      <div className="auth-art"><img className="auth-wordmark" src="/assets/medbunny-wordmark.png" alt="MedBunny" /><div><span className="landing-kicker">A little care, every day</span><h1>{isSignup ? 'Start a healthier little routine.' : 'Welcome back to your routine.'}</h1><p>{isSignup ? 'Create a parent account and keep every dose in one happy place.' : 'Your family’s schedules, progress, and little wins are waiting.'}</p></div><img className="auth-bunny" src={isSignup ? '/assets/schedule-bunny.png' : '/assets/bunny.png'} alt="MedBunny mascot" /></div>
      <div className="auth-panel"><span className="landing-kicker">{isSignup ? 'Let’s get started' : 'Welcome back'}</span><h2>{isSignup ? 'Create your account' : 'Log in to MedBunny'}</h2><p>{isSignup ? 'A parent or caregiver account keeps your family routine together.' : 'Enter your details to continue to your home page.'}</p>
        <form onSubmit={event => void submit(event)}>
          {isSignup && <label>Full name<input name="name" autoComplete="name" required placeholder="Your name" value={name} onChange={event => setName(event.target.value)} /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="parent@example.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Password<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required placeholder="At least 6 characters" value={password} onChange={event => setPassword(event.target.value)} /></label>
          {isSignup && <label>Confirm password<input name="confirm-password" type="password" autoComplete="new-password" minLength={6} required placeholder="Repeat your password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>}
          {error && <p className="proof-error auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? (isSignup ? 'Creating account…' : 'Logging in…') : <>{isSignup ? 'Create account' : 'Log in'}<Icon name="chevron" size={17} /></>}</button>
        </form>
        <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to MedBunny?'} <button onClick={onSwitch}>{isSignup ? 'Log in' : 'Create an account'}</button></p>
        <p className="auth-demo"><Icon name="shield" size={14} />Your account and your family’s routine stay private.</p>
      </div>
    </section>
  </main>
}

type GardenFlower = 'pink' | 'purple' | 'yellow' | 'blue'

const GARDEN_FLOWERS: { id: GardenFlower; label: string; flowerImage: string; plotImage: string }[] = [
  { id: 'pink', label: 'Pink flower', flowerImage: '/assets/bunga pink.png', plotImage: '/assets/garden-pink.png' },
  { id: 'purple', label: 'Purple flower', flowerImage: '/assets/bunga ungu.png', plotImage: '/assets/garden-purple.png' },
  { id: 'yellow', label: 'Yellow flower', flowerImage: '/assets/bunga kuning.png', plotImage: '/assets/garden-yellow.png' },
  { id: 'blue', label: 'Blue flower', flowerImage: '/assets/bunga biru.png', plotImage: '/assets/garden-blue.png' },
]

function KidsGarden({ onBack }: { onBack: () => void }) {
  const [plots, setPlots] = useState<(GardenFlower | null)[]>(Array(16).fill(null))
  const [selectedFlower, setSelectedFlower] = useState<GardenFlower>('pink')
  const [dragging, setDragging] = useState<{ flower: GardenFlower; x: number; y: number } | null>(null)

  function plantFlower(index: number, flower = selectedFlower) {
    setPlots(current => current.map((value, plotIndex) => plotIndex === index ? flower : value))
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, flower: GardenFlower) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedFlower(flower)
    setDragging({ flower, x: event.clientX, y: event.clientY })
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragging) setDragging(current => current && ({ ...current, x: event.clientX, y: event.clientY }))
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    const plot = target?.closest<HTMLElement>('[data-garden-plot]')
    if (plot) plantFlower(Number(plot.dataset.gardenPlot), dragging.flower)
    setDragging(null)
  }

  return <section
    className={`kids-garden${dragging ? ' is-dragging' : ''}`}
    aria-labelledby="garden-title"
    onPointerMove={moveDrag}
    onPointerUp={finishDrag}
    onPointerCancel={() => setDragging(null)}
  >
    <button className="garden-back" onClick={onBack} aria-label="Back to games"><Icon name="chevron" size={20} /></button>
    <div className="garden-heading">
      <h1 id="garden-title">Bunny’s Garden</h1>
      <p>Drag a flower to a garden patch</p>
    </div>

    <div className="garden-play-area">
      <img className="garden-butterfly butterfly-one" src="/assets/kupu ungu.png" alt="" />
      <img className="garden-butterfly butterfly-two" src="/assets/kupu biru.png" alt="" />
      <img className="garden-butterfly butterfly-three" src="/assets/kupu ungu.png" alt="" />
      <div className="garden-grid" aria-label="Garden patches">
        {plots.map((flower, index) => {
          const plantedFlower = GARDEN_FLOWERS.find(option => option.id === flower)
          return <button
            className={`garden-plot${flower ? ' planted' : ''}`}
            data-garden-plot={index}
            key={index}
            aria-label={flower ? `Garden patch ${index + 1}, planted with ${plantedFlower?.label}` : `Empty garden patch ${index + 1}. Plant selected flower`}
            onClick={() => plantFlower(index)}
          >
            <img src={plantedFlower?.plotImage ?? '/assets/petak rumput.png'} alt="" draggable={false} />
          </button>
        })}
      </div>
    </div>

    <div className="garden-picker">
      <p>Choose your flower</p>
      <div className="garden-flower-options" role="group" aria-label="Flowers to drag">
        {GARDEN_FLOWERS.map(flower => <button
          className={selectedFlower === flower.id ? 'selected' : ''}
          key={flower.id}
          aria-label={`${flower.label}. Drag to a garden patch`}
          aria-pressed={selectedFlower === flower.id}
          onPointerDown={event => startDrag(event, flower.id)}
          onClick={() => setSelectedFlower(flower.id)}
        >
          <img src={flower.flowerImage} alt="" draggable={false} />
        </button>)}
      </div>
    </div>

    <img className="garden-bunny" src="/assets/schedule-bunny.png" alt="MedBunny sitting beside the flower garden" />
    {dragging && <img
      className="garden-drag-preview"
      src={GARDEN_FLOWERS.find(flower => flower.id === dragging.flower)?.flowerImage}
      alt=""
      style={{ left: dragging.x, top: dragging.y }}
    />}
  </section>
}

const MATCH_UP_CARDS = [
  { id: 'star-one', pair: 'star', label: 'Happy star', image: '/assets/kartu star.png' },
  { id: 'heart-one', pair: 'heart', label: 'Medicine heart', image: '/assets/kartu hati.png' },
  { id: 'flower-one', pair: 'flower', label: 'Blue flower', image: '/assets/kartu bunga.png' },
  { id: 'heart-two', pair: 'heart', label: 'Medicine heart', image: '/assets/kartu hati.png' },
  { id: 'flower-two', pair: 'flower', label: 'Blue flower', image: '/assets/kartu bunga.png' },
  { id: 'star-two', pair: 'star', label: 'Happy star', image: '/assets/kartu star.png' },
]

function KidsMatchUp({ onBack }: { onBack: () => void }) {
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const checkTimer = useRef<number | null>(null)
  const complete = matched.length === 3

  useEffect(() => () => {
    if (checkTimer.current) window.clearTimeout(checkTimer.current)
  }, [])

  function chooseCard(index: number) {
    const card = MATCH_UP_CARDS[index]
    if (!card || checking || flipped.includes(index) || matched.includes(card.pair)) return

    const nextFlipped = [...flipped, index]
    setFlipped(nextFlipped)
    if (nextFlipped.length < 2) return

    const firstCard = MATCH_UP_CARDS[nextFlipped[0]]
    const isMatch = firstCard.pair === card.pair
    setChecking(true)
    checkTimer.current = window.setTimeout(() => {
      if (isMatch) setMatched(current => [...current, card.pair])
      setFlipped([])
      setChecking(false)
    }, isMatch ? 450 : 850)
  }

  function restartGame() {
    if (checkTimer.current) window.clearTimeout(checkTimer.current)
    setFlipped([])
    setMatched([])
    setChecking(false)
  }

  return <section className="kids-match-up" aria-labelledby="match-up-title">
    <button className="match-up-back" onClick={onBack} aria-label="Back to games"><Icon name="chevron" size={20} /></button>
    <div className="match-up-heading">
      <h1 id="match-up-title">Bunny’s Match-Up</h1>
      <p>Click 2 cards with the same image</p>
    </div>
    <div className="match-up-grid" aria-label="Memory matching cards">
      {MATCH_UP_CARDS.map((card, index) => {
        const isRevealed = flipped.includes(index) || matched.includes(card.pair)
        const isMatched = matched.includes(card.pair)
        return <button
          className={`match-up-card${isRevealed ? ' revealed' : ''}${isMatched ? ' matched' : ''}`}
          key={card.id}
          onClick={() => chooseCard(index)}
          disabled={checking || isMatched}
          aria-label={isRevealed ? `${card.label}${isMatched ? ', matched' : ''}` : `Hidden card ${index + 1}`}
        >
          <img src={isRevealed ? card.image : '/assets/kartu bunny.png'} alt="" draggable={false} />
        </button>
      })}
    </div>
    <img className="match-up-bunny" src="/assets/bunny-peeking.png" alt="MedBunny cheering beside the cards" />
    {complete && <div className="match-up-complete" role="status">
      <span><Icon name="star" size={19} /></span>
      <strong>All pairs found!</strong>
      <button onClick={restartGame}>Play again</button>
    </div>}
  </section>
}

const DRESS_UP_CATEGORIES = [
  {
    title: 'Head',
    items: [
      { label: 'Baseball cap', image: '/assets/topi biasa.png' },
      { label: 'Sun hat', image: '/assets/topi.png' },
      { label: 'Crown', image: '/assets/mahkota.png' },
    ],
  },
  {
    title: 'Eyes',
    items: [
      { label: 'Classic glasses', image: '/assets/kacamata.png' },
      { label: 'Round glasses', image: '/assets/kacamata bulat.png' },
      { label: 'Sunglasses', image: '/assets/kacamata hitam.png' },
    ],
  },
  {
    title: 'Neck',
    items: [
      { label: 'Red bow', image: '/assets/dasi.png' },
      { label: 'Flower necklace', image: '/assets/kalung.png' },
      { label: 'MedBunny scarf', image: '/assets/scarf.png' },
    ],
  },
]

function KidsDressUp({ onBack }: { onBack: () => void }) {
  return <section className="kids-dress-up" aria-labelledby="dress-up-title">
    <button className="dress-up-back" onClick={onBack} aria-label="Back to games"><Icon name="chevron" size={20} /></button>
    <div className="dress-up-heading">
      <h1 id="dress-up-title">Bunny’s Style</h1>
      <p>Choose your accessories</p>
    </div>
    <div className="dress-up-stage">
      <div className="dress-up-bunny-wrap">
        <span className="dress-up-spark spark-left" aria-hidden="true">✦</span>
        <img src="/assets/bunny tegak.png" alt="MedBunny ready to dress up" />
        <span className="dress-up-spark spark-right" aria-hidden="true">✦</span>
      </div>
      <div className="accessory-panel" aria-label="Accessory choices coming soon">
        {DRESS_UP_CATEGORIES.map(category => <section className="accessory-column" key={category.title} aria-labelledby={`accessory-${category.title.toLowerCase()}`}>
          <h2 id={`accessory-${category.title.toLowerCase()}`}>{category.title}</h2>
          <div className="accessory-list">
            {category.items.map(item => <div className="accessory-item" key={item.label}>
              <img src={item.image} alt={item.label} />
            </div>)}
          </div>
        </section>)}
      </div>
    </div>
    <span className="dress-up-coming-soon">Bunny’s Style play is coming soon</span>
  </section>
}

type HuntColor = 'yellow' | 'purple' | 'pink' | 'blue'

const COLOR_HUNT_TARGETS: { id: HuntColor; label: string; boxImage: string }[] = [
  { id: 'yellow', label: 'Yellow', boxImage: '/assets/color-hunt-yellow-box.png' },
  { id: 'purple', label: 'Purple', boxImage: '/assets/color-hunt-purple-box.png' },
  { id: 'pink', label: 'Pink', boxImage: '/assets/color-hunt-pink-box.png' },
  { id: 'blue', label: 'Blue', boxImage: '/assets/color-hunt-blue-box.png' },
]

const COLOR_HUNT_FLOWERS: { id: string; color: HuntColor; image: string; position: string }[] = [
  { id: 'pink-small', color: 'pink', image: '/assets/color-hunt-pink-flower.png', position: 'flower-pink-small' },
  { id: 'blue-tall', color: 'blue', image: '/assets/color-hunt-blue-flower.png', position: 'flower-blue-tall' },
  { id: 'yellow-left', color: 'yellow', image: '/assets/color-hunt-yellow-flower.png', position: 'flower-yellow-left' },
  { id: 'yellow-center', color: 'yellow', image: '/assets/color-hunt-yellow-flower.png', position: 'flower-yellow-center' },
  { id: 'blue-small', color: 'blue', image: '/assets/color-hunt-blue-flower.png', position: 'flower-blue-small' },
  { id: 'pink-tall', color: 'pink', image: '/assets/color-hunt-pink-flower.png', position: 'flower-pink-tall' },
  { id: 'purple-tall', color: 'purple', image: '/assets/color-hunt-purple-flower.png', position: 'flower-purple-tall' },
]

function KidsColorHunt({ onBack }: { onBack: () => void }) {
  const [targetIndex, setTargetIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ flowerId: string; type: 'correct' | 'wrong' } | null>(null)
  const [locked, setLocked] = useState(false)
  const [complete, setComplete] = useState(false)
  const feedbackTimer = useRef<number | null>(null)
  const target = COLOR_HUNT_TARGETS[targetIndex]

  useEffect(() => () => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current)
  }, [])

  function chooseFlower(flower: (typeof COLOR_HUNT_FLOWERS)[number]) {
    if (locked || complete) return
    const isCorrect = flower.color === target.id
    setFeedback({ flowerId: flower.id, type: isCorrect ? 'correct' : 'wrong' })
    setLocked(true)
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback(null)
      setLocked(false)
      if (!isCorrect) return
      if (targetIndex === COLOR_HUNT_TARGETS.length - 1) {
        setComplete(true)
      } else {
        setTargetIndex(index => index + 1)
      }
    }, isCorrect ? 850 : 520)
  }

  function restartHunt() {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current)
    setTargetIndex(0)
    setFeedback(null)
    setLocked(false)
    setComplete(false)
  }

  return <section className="kids-color-hunt" aria-labelledby="color-hunt-title">
    <button className="color-hunt-back" onClick={onBack} aria-label="Back to games"><Icon name="chevron" size={20} /></button>
    <div className="color-hunt-heading">
      <h1 id="color-hunt-title">Bunny’s Color Hunt</h1>
      <p>Choose flowers with the same color as the box</p>
    </div>

    <div className="color-hunt-target" key={target.id} aria-live="polite">
      <img src={target.boxImage} alt={`${target.label} color box`} />
      <strong>{target.label}</strong>
      <div className="color-hunt-progress" aria-label={`Color ${targetIndex + 1} of ${COLOR_HUNT_TARGETS.length}`}>
        {COLOR_HUNT_TARGETS.map((color, index) => <i className={index <= targetIndex ? 'active' : ''} key={color.id} />)}
      </div>
    </div>

    <div className="color-hunt-meadow">
      <img className="color-hunt-bush" src="/assets/color-hunt-bush.png" alt="" />
      {COLOR_HUNT_FLOWERS.map(flower => <button
        className={`color-hunt-flower ${flower.position}${feedback?.flowerId === flower.id ? ` ${feedback.type}` : ''}`}
        key={flower.id}
        onClick={() => chooseFlower(flower)}
        disabled={locked || complete}
        aria-label={`${flower.color} flower`}
      >
        <img src={flower.image} alt="" draggable={false} />
      </button>)}
    </div>

    {complete && <div className="color-hunt-complete" role="status">
      <span><Icon name="star" size={20} /></span>
      <div><strong>Color hunt complete!</strong><p>You found every color.</p></div>
      <button onClick={restartHunt}>Play again</button>
    </div>}
  </section>
}

function KidsDashboard({ name, balance, onOpenGarden, onOpenMatchUp, onOpenDressUp, onOpenColorHunt }: { name: string; balance: number; onOpenGarden: () => void; onOpenMatchUp: () => void; onOpenDressUp: () => void; onOpenColorHunt: () => void }) {
  const games = [
    { title: 'Bunny’s Garden', description: 'Grow a happy little garden', image: '/assets/schedule-bunny.png', tone: 'garden' },
    { title: 'Bunny’s Style', description: 'Pick a cute accessories for Bunny', image: '/assets/kids-dress-up.png', tone: 'dress-up' },
    { title: 'Bunny’s Match-Up', description: 'Find all the matching pairs', image: '/assets/kids-match-up.png', tone: 'match-up' },
    { title: 'Bunny’s Color Hunt', description: 'Spot colors in the garden', image: '/assets/kids-color-hunt.png', tone: 'color-hunt' },
  ]

  return <section className="kids-dashboard" aria-labelledby="kids-title">
    <div className="kids-top-grid">
      <div className="kids-welcome-card">
        <div>
          <span className="kids-kicker">LET’S PLAY TOGETHER</span>
          <h1 id="kids-title">Hi, {name}!</h1>
          <p>What do you want to play?</p>
        </div>
        <img src="/assets/bunny-peeking.png" alt="MedBunny popping in to say hello" />
        <span className="kids-spark kids-spark-one" aria-hidden="true">✦</span>
        <span className="kids-spark kids-spark-two" aria-hidden="true">✦</span>
      </div>

      <div className="kids-stars-card" aria-label={`${balance} stars collected`}>
        <img src="/assets/happy-star.png" alt="" />
        <div><strong>{balance}</strong><span>stars collected</span></div>
      </div>
    </div>

    <div className="kids-games-heading">
      <div>
        <span className="kids-kicker">PICK AN ADVENTURE</span>
        <h2>Choose your favorite game</h2>
      </div>
      <p>Play, explore, and have fun with Bunny.</p>
    </div>

    <div className="kids-games-grid">
      {games.map(game => <button className={`kids-game-card ${game.tone}`} key={game.title} onClick={game.tone === 'garden' ? onOpenGarden : game.tone === 'match-up' ? onOpenMatchUp : game.tone === 'dress-up' ? onOpenDressUp : onOpenColorHunt}>
        <span className="kids-game-decor" aria-hidden="true">✦</span>
        <img src={game.image} alt="" />
        <div>
          <h3>{game.title}</h3>
          <p>{game.description}</p>
          <span className="kids-play-label">Play now <Icon name="chevron" size={15} /></span>
        </div>
      </button>)}
    </div>
  </section>
}

export default function App() {
  const [screen, setScreen] = useState<PublicScreen>('landing')
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [page, setPage] = useState('Home')
  const [previousPage, setPreviousPage] = useState('Home')
  const [mode, setMode] = useState('Parent mode')
  const [kidsScreen, setKidsScreen] = useState<'dashboard' | 'garden' | 'match-up' | 'dress-up' | 'color-hunt'>('dashboard')
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [now, setNow] = useState(new Date())
  const [proofOpen, setProofOpen] = useState(false)
  const [proof, setProof] = useState('')
  const [proofName, setProofName] = useState('')
  const [proofError, setProofError] = useState('')
  const [activeDose, setActiveDose] = useState<DoseLog | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [homeRefresh, setHomeRefresh] = useState(0)
  const [homeData, setHomeData] = useState<{ weekDoses: DoseLog[]; balance: number }>({ weekDoses: [], balance: 0 })
  const [homeLoading, setHomeLoading] = useState(true)
  const [homeError, setHomeError] = useState('')

  const child = session?.children[0]

  useEffect(() => {
    let cancelled = false
    api.me()
      .then(result => {
        if (cancelled) return
        setSession(result)
        setScreen('app')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null)
      setScreen('login')
    }
    window.addEventListener('medbunny:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('medbunny:unauthorized', handleUnauthorized)
  }, [])

  useEffect(() => {
    if (!modeMenuOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && !target.closest('.mode-menu-wrap')) setModeMenuOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModeMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [modeMenuOpen])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!child) return
    let cancelled = false
    const weekStart = startOfWeek(new Date())
    const weekEnd = addDays(weekStart, 6)

    setHomeLoading(true)
    setHomeError('')

    Promise.all([
      api.listDoses(child.id, { from: formatApiDate(weekStart), to: formatApiDate(weekEnd) }),
      api.getStars(child.id),
    ])
      .then(([weekDoses, stars]) => {
        if (cancelled) return
        setHomeData({ weekDoses, balance: stars.balance })
      })
      .catch(error => {
        if (!cancelled) setHomeError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setHomeLoading(false)
      })

    return () => { cancelled = true }
  }, [child?.id, homeRefresh])

  async function handleAuthSubmit(input: { name: string; email: string; password: string }) {
    const result = screen === 'signup'
      ? await api.signup(input)
      : await api.login({ email: input.email, password: input.password })

    setSession(result)
    setPage('Home')
    setScreen('app')
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // Tetap bersihkan sesi lokal kalau server tidak bisa dihubungi.
    }
    setSession(null)
    setPage('Home')
    setScreen('landing')
  }

  function openProof(dose: DoseLog) {
    setActiveDose(dose)
    setProof('')
    setProofName('')
    setProofError('')
    setConfirmError('')
    setProofOpen(true)
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!activeDose) return

    setConfirming(true)
    setConfirmError('')
    try {
      await api.confirmDose(activeDose.id)
      setProofOpen(false)
      setActiveDose(null)
      setProof('')
      setProofName('')
      setHomeRefresh(value => value + 1)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ALREADY_CONFIRMED') {
        setProofOpen(false)
        setActiveDose(null)
        setHomeRefresh(value => value + 1)
      } else {
        setConfirmError(errorMessage(error))
      }
    } finally {
      setConfirming(false)
    }
  }

  if (checkingSession) {
    return <div className="app-loading"><img src="/assets/bunny-sleeping.png" alt="" /><p>Getting your routine ready…</p></div>
  }

  if (screen === 'garden-preview') return <div className="app kids-active garden-preview-app">
    <aside className="sidebar">
      <button className="logo garden-preview-logo" aria-label="Back to MedBunny" onClick={() => setScreen('landing')}><img src="/assets/logo.png" alt="MedBunny rabbit logo" /></button>
    </aside>
    <main className="kids-main">
      <header><button className="mode garden-preview-mode" onClick={() => setScreen('landing')}><Icon name="chevron" size={15} />Kids mode preview</button></header>
      <div className="page-content kids-page-content">
        {kidsScreen === 'garden' ? <KidsGarden onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'match-up' ? <KidsMatchUp onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'dress-up' ? <KidsDressUp onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'color-hunt' ? <KidsColorHunt onBack={() => setKidsScreen('dashboard')} /> : <KidsDashboard name="Bunny" balance={0} onOpenGarden={() => setKidsScreen('garden')} onOpenMatchUp={() => setKidsScreen('match-up')} onOpenDressUp={() => setKidsScreen('dress-up')} onOpenColorHunt={() => setKidsScreen('color-hunt')} />}
      </div>
    </main>
  </div>
  if (screen === 'landing') return <LandingPage onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} />
  if (screen === 'login' || screen === 'signup') return <AuthPage mode={screen} onBack={() => setScreen('landing')} onSwitch={() => setScreen(screen === 'login' ? 'signup' : 'login')} onSubmit={handleAuthSubmit} />

  if (!session) return <LandingPage onLogin={() => setScreen('login')} onSignup={() => setScreen('signup')} />
  if (!child) return <div className="app-loading"><img src="/assets/bunny-sleeping.png" alt="" /><p>No child profile found for this account.</p></div>

  const todayKey = formatApiDate(now)
  const todayDoses = homeData.weekDoses
    .filter(dose => formatApiDate(new Date(dose.scheduledAt)) === todayKey)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const takenCount = todayDoses.filter(dose => dose.confirmedAt).length
  const allDone = todayDoses.length > 0 && takenCount === todayDoses.length
  const nextDose = todayDoses.find(dose => !dose.confirmedAt) ?? null
  const progressPercent = todayDoses.length ? Math.round((takenCount / todayDoses.length) * 100) : 0
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    const key = formatApiDate(day)
    return {
      label: WEEKDAY_LABELS[day.getDay()],
      date: day.getDate(),
      key,
      isToday: key === todayKey,
      hasDose: homeData.weekDoses.some(dose => formatApiDate(new Date(dose.scheduledAt)) === key),
    }
  })
  const groupedDoses = ['Morning', 'Afternoon', 'Evening']
    .map(name => ({ name, doses: todayDoses.filter(dose => doseBucket(dose.scheduledAt) === name) }))
    .filter(group => group.doses.length > 0)
  const nextDoseTime = nextDose ? timeLabel(nextDose.scheduledAt).split(' ') : []
  const avatarLetter = session.user.name.trim().charAt(0).toUpperCase() || 'P'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const clockTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).split(' ')

  function closePinDialog() {
    setPinOpen(false)
    setPin('')
  }

  function handlePinSubmit(event: FormEvent) {
    event.preventDefault()
    if (pin.length !== 4) return
    setMode('Kids mode')
    setKidsScreen('dashboard')
    setPage('Home')
    closePinDialog()
  }

  const isKidsMode = mode === 'Kids mode'
  const childName = child.nickname?.trim() || session.user.name.split(' ')[0] || 'kiddo'

  return <div className={`app ${isKidsMode ? 'kids-active' : ''}`}>
    <aside className="sidebar">
      <a className="logo" href="#" aria-label="MedBunny home" onClick={() => { setPage('Home'); setKidsScreen('dashboard') }}><img src="/assets/logo.png" alt="MedBunny rabbit logo" /></a>
      {!isKidsMode && <nav>{['Home', 'Schedule', 'History'].map(item => <button key={item} className={`nav-item ${page === item ? 'active' : ''}`} onClick={() => { setPage(item); if (item !== 'Home') setPreviousPage(item) }}><Icon name={item.toLowerCase()} /><span>{item}</span></button>)}</nav>}
      {!isKidsMode && <div className="sidebar-bottom"><span className="little-heart"><Icon name="heart" size={21} /></span><span>A little care,<br />every day.</span></div>}
    </aside>
    <main className={isKidsMode ? 'kids-main' : undefined}>
      <header><div className="mode-menu-wrap">
          <button
            className="mode"
            aria-expanded={modeMenuOpen}
            aria-haspopup="menu"
            onClick={() => setModeMenuOpen(open => !open)}
          >
            {mode}
            <span className={`mode-chevron ${modeMenuOpen ? 'open' : ''}`}>
              <Icon name="down" size={16} />
            </span>
          </button>

          {modeMenuOpen && (
            <div className="mode-dropdown" role="menu">
              <button
                role="menuitem"
                onClick={() => {
                  setModeMenuOpen(false)

                  if (mode === 'Parent mode') {
                    setPin('')
                    setPinOpen(true)
                  } else {
                    setMode('Parent mode')
                    setKidsScreen('dashboard')
                  }
                }}
              >
                {mode === 'Parent mode'
                  ? 'Switch to kids mode'
                  : 'Switch to parent mode'}

                <Icon name="chevron" size={15} />
              </button>
            </div>
          )}
        </div>
        <button className="avatar" aria-label={isKidsMode ? `${childName}'s profile` : 'Open profile'} aria-current={page === 'Profile' ? 'page' : undefined} onClick={() => { if (!isKidsMode && page !== 'Profile') { setPreviousPage(page); setPage('Profile') } }}>{isKidsMode ? childName.charAt(0).toUpperCase() : avatarLetter}</button></header>
      <div className={`page-content ${isKidsMode ? 'kids-page-content' : ''}`}>
        {isKidsMode ? kidsScreen === 'garden' ? <KidsGarden onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'match-up' ? <KidsMatchUp onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'dress-up' ? <KidsDressUp onBack={() => setKidsScreen('dashboard')} /> : kidsScreen === 'color-hunt' ? <KidsColorHunt onBack={() => setKidsScreen('dashboard')} /> : <KidsDashboard name={childName} balance={homeData.balance} onOpenGarden={() => setKidsScreen('garden')} onOpenMatchUp={() => setKidsScreen('match-up')} onOpenDressUp={() => setKidsScreen('dress-up')} onOpenColorHunt={() => setKidsScreen('color-hunt')} /> : page === 'Profile' ? <ProfilePage user={session.user} child={child} onBack={() => setPage(previousPage)} onLogout={() => void handleLogout()} /> : page === 'Schedule' ? <MedicationSchedule childId={child.id} onChanged={() => setHomeRefresh(value => value + 1)} /> : page === 'History' ? <MedicationHistory childId={child.id} /> : <>
          <div className="greeting"><div><div className="eyebrow">A LITTLE CARE GOES A LONG WAY</div><h1>{greeting}, {session.user.name.split(' ')[0]}!<span className="greeting-sun"><Icon name="sun" size={30} /></span></h1><p>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} <span>·</span> Let's make today a healthy one.</p></div><div className="greeting-clock"><span>LOCAL TIME</span><time dateTime={now.toTimeString().slice(0, 5)}>{clockTime[0]} <small>{clockTime[1]}</small></time></div></div>
          <section className="top-grid">
            <div className="week-card"><div className="section-heading"><h2>Your week at a glance</h2><span className="week-month"><span className="week-month-text">{now.toLocaleDateString('en-US', { month: 'long' })}</span></span></div><div className="week" aria-label={`Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>{weekDays.map(day => <div key={day.key} className={`week-day${day.isToday ? ' selected' : ''}`} aria-current={day.isToday ? 'date' : undefined}><span>{day.label}</span><strong>{day.date}</strong><i className={day.hasDose ? 'has-dose' : ''} /></div>)}</div></div>
            <div className={`dose-card ${allDone ? 'dose-done' : ''}`}><div className="dose-content"><span className="dose-label">{allDone ? 'ALL DONE FOR TODAY' : nextDose ? 'NEXT DOSE' : 'TODAY'}</span><h2>{allDone ? 'Wonderful!' : nextDose && nextDoseTime.length ? <>{nextDoseTime[0]}<small>{nextDoseTime[1]}</small></> : 'All clear'}</h2><strong>{allDone ? 'A little healthier, together.' : nextDose ? nextDose.medicationName : 'No doses scheduled'}</strong><p>{allDone ? 'Every little dose is a big step.' : nextDose ? nextDose.dose : 'Add a medication to start your routine.'}</p><button className="take-button" disabled={allDone || !nextDose || homeLoading} onClick={() => nextDose && openProof(nextDose)}><Icon name={allDone ? 'check' : 'pill'} size={18} />{allDone ? 'Dose completed' : nextDose ? 'Mark as taken' : 'Nothing due'}{!allDone && nextDose && <Icon name="chevron" size={15} />}</button></div><img className="mascot" src={allDone ? "/assets/bunny.png" : "/assets/bunny-sleeping.png"} alt={allDone ? "MedBunny rabbit holding a happy yellow star" : "MedBunny rabbit sleeping while hugging a star"} /><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div>
          </section>
          {homeError && <p className="home-error" role="alert">{homeError}</p>}
          <section className="lower-grid"><div className="schedule-card"><div className="section-heading"><div><h2>Today’s schedule</h2><p className="schedule-subtitle">A small routine. A big difference.</p></div><button className="text-button" onClick={() => setPage('Schedule')}>View schedule<Icon name="chevron" size={15} /></button></div>
            {homeLoading ? <div className="history-empty"><p>Loading today’s schedule…</p></div> : groupedDoses.length ? groupedDoses.map(group => <div key={group.name}><div className="time-heading"><Icon name="sun" size={18} /><strong>{group.name}</strong><span>{timeLabel(group.doses[0]?.scheduledAt ?? '')}</span><div /></div>{group.doses.map((dose, index) => <div className="medicine" key={dose.id}><span className={`medicine-icon ${['coral', 'yellow', 'blue'][index % 3]}`}><img className="medicine-illustration" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /></span><div className="medicine-info"><strong>{dose.medicationName} <span>{dose.dose}</span></strong><p>{timeLabel(dose.scheduledAt)}{dose.status === 'missed' ? ' · Missed' : dose.status === 'awaiting' ? ' · Due now' : dose.status === 'upcoming' ? ' · Upcoming' : ''}</p></div>{dose.confirmedAt ? <span className="completed"><Icon name="check" size={14} />Taken <small>{timeLabel(dose.confirmedAt)}</small></span> : <button className="upcoming take-now" onClick={() => openProof(dose)}>Take now<Icon name="chevron" size={14} /></button>}</div>)}</div>) : <div className="history-empty"><Icon name="pill" size={33} /><h3>No doses today</h3><p>Your schedule is clear. Add a medication if you need one.</p></div>}
            <div className="schedule-footer"><Icon name="heart" size={15} /> You're doing a wonderful job caring for your little one.</div></div>
          <div className="right-column"><div className="progress-card"><div className="section-heading"><h2>Little wins, big smiles</h2></div><div className="progress-content"><div className={`progress-ring ${progressPercent === 100 ? 'full' : ''}`}><div><strong>{takenCount}<span>/{todayDoses.length}</span></strong><small>doses taken</small></div></div><div><h3>{progressPercent === 100 ? 'You did it!' : todayDoses.length ? 'One more little step.' : 'A fresh start.'}</h3><p>{progressPercent === 100 ? 'All today’s doses are complete.' : todayDoses.length ? 'A healthy habit starts with a little consistency.' : 'Add a medication and your progress will appear here.'}</p></div></div><div className="progress-track">{[0, 1, 2].map(index => <i key={index} className={index < Math.round((progressPercent / 100) * 3) ? 'done' : ''} />)}</div><div className="progress-caption"><span>Today's progress</span><strong>{progressPercent}%</strong></div></div><div className="kind-card"><span className="plant-art"><i /><i /><i /><b /></span><div><span>A GENTLE REMINDER</span><h3>Small routines,<br />bright futures.</h3><p>A little love and care, every single day.</p></div><Icon name="heart" size={20} /></div></div></section>
        </>}
        <footer><img className="footer-wordmark" src="/assets/medbunny-wordmark.png" alt="MedBunny" /><span>Made for little ones. Here for you.</span><span className="footer-heart"><Icon name="heart" size={14} /> Growing healthier, together.</span></footer>
      </div>
    </main>
    {pinOpen && <dialog className="pin-dialog" ref={node => { if (node && !node.open) { node.showModal(); node.querySelector('input')?.focus() } }} onCancel={closePinDialog} onClick={event => { if (event.target === event.currentTarget) closePinDialog() }} aria-labelledby="pin-title" aria-describedby="pin-description">
      <form className="pin-form" onSubmit={handlePinSubmit}>
        <div className="pin-top"><span className="pin-symbol"><Icon name="shield" size={28} /></span><button className="pin-close" type="button" aria-label="Close PIN dialog" onClick={closePinDialog}><Icon name="close" size={18} /></button></div>
        <h2 id="pin-title">Enter parent PIN</h2>
        <p id="pin-description">Enter your 4-digit PIN to switch to kids mode.</p>
        <label className="pin-label" htmlFor="parent-pin">Parent PIN</label>
        <div className="pin-field">
          <span className="pin-dots" aria-hidden="true">{[0, 1, 2, 3].map(index => <i key={index} className={index < pin.length ? 'filled' : ''} />)}</span>
          <input id="parent-pin" className="pin-input" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus aria-label="Parent PIN, 4 digits" />
        </div>
        <button className="pin-submit" type="submit" disabled={pin.length !== 4}>Switch to kids mode <Icon name="chevron" size={17} /></button>
        <p className="pin-hint">Demo only — enter any 4 digits.</p>
      </form>
    </dialog>}
    {proofOpen && activeDose && <dialog className="proof-dialog" ref={node => { if (node && !node.open) node.showModal() }} onCancel={() => setProofOpen(false)} aria-labelledby="proof-title" aria-describedby="proof-description">
      <form onSubmit={event => void handleConfirm(event)}>
        <span className="proof-symbol"><Icon name="pill" size={26} /></span>
        <h2 id="proof-title">Have you taken your medicine?</h2>
        <p id="proof-description">Confirm your {activeDose.medicationName} dose. A photo is optional and stays on this device.<br />Ask a parent or caregiver to help.</p>
        <label className="proof-label" htmlFor="medicine-proof">Add a photo (optional)</label>
        <label className={`proof-upload ${proof ? 'has-image' : ''}`} htmlFor="medicine-proof">
          {proof ? <><img src={proof} alt="Selected medication proof" /><span>{proofName} · Click to replace</span></> : <><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg><strong>Choose an image</strong><span>JPG, PNG or WebP · Up to 5 MB</span></>}
          <input id="medicine-proof" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
            const file = event.target.files?.[0]
            setProofError('')
            setProof('')
            setProofName('')
            if (!file) return
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
              setProofError('Please choose a JPG, PNG or WebP image under 5 MB.')
              event.target.value = ''
              return
            }
            const reader = new FileReader()
            reader.onload = () => { setProof(String(reader.result)); setProofName(file.name) }
            reader.onerror = () => setProofError('Unable to read this image. Please try another file.')
            reader.readAsDataURL(file)
          }} />
        </label>
        {proofError && <p className="proof-error" role="alert">{proofError}</p>}
        <p className="proof-local-note">Preview only — your image is not sent or saved.</p>
        {confirmError && <p className="proof-error" role="alert">{confirmError}</p>}
        <div className="proof-actions"><button className="proof-done" type="submit" disabled={confirming}>{confirming ? 'Saving…' : <><Icon name="check" size={18} />Done</>}</button><button className="proof-cancel" type="button" disabled={confirming} onClick={() => setProofOpen(false)}>Cancel</button></div>
      </form>
    </dialog>}
  </div>
}
