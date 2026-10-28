import { useState } from 'react'

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
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sun}</svg>
}

const medicines = [
  { name: 'Lisinopril', dose: '10 mg', instruction: 'After a meal', time: '8:00 AM', color: 'coral' },
  { name: 'Vitamin D3', dose: '15ml', instruction: 'After a meal', time: '8:00 AM', color: 'yellow' },
  { name: 'Ibuprofen', dose: '400 mg', instruction: 'After a meal', time: '2:00 PM', color: 'blue' },
]

type Medication = { id: number; name: string; dose: string; note: string; time: string; startDate: string; frequency: string; times: string[]; meal: string; days: string[] }

function AddMedication({ onBack, initial, onSave }: { onBack: () => void; initial?: Medication; onSave: (medication: Medication) => void }) {
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
  function backToEdit() { setReviewing(false) }
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
      <p className="review-demo-note">Changes are kept in this demo only, not saved permanently.</p>
      <div className="review-actions"><button className="review-save" onClick={() => onSave({ id: initial?.id ?? Date.now(), name: name.trim(), dose: dose.trim(), startDate, note: note.trim(), frequency, times: frequency === 'As needed' ? [] : times, time: frequency === 'As needed' ? '' : times[0], meal, days: frequency === 'Some days' ? days : [] })}><Icon name="check" size={18} />Save</button><button className="review-back" onClick={backToEdit}>Back to edit</button></div>
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

function MedicationHistory({ taken }: { taken: boolean }) {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('All')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('All')
  const rows = [
    { id: 1, name: 'Lisinopril', dose: '10 mg', date: '2026-10-27', time: '08:04 AM', status: 'Recorded', color: 'coral' },
    { id: 2, name: 'Vitamin D3', dose: '15ml', date: '2026-10-27', time: '08:04 AM', status: 'Recorded', color: 'yellow' },
    { id: 3, name: 'Ibuprofen', dose: '400 mg', date: '2026-10-27', time: '02:00 PM', status: taken ? 'Recorded' : 'Awaiting', color: 'blue' },
    { id: 4, name: 'Lisinopril', dose: '10 mg', date: '2026-10-26', time: '08:02 AM', status: 'Recorded', color: 'coral' },
    { id: 5, name: 'Vitamin D3', dose: '15ml', date: '2026-10-26', time: '08:00 AM', status: 'Missed', color: 'yellow' },
    { id: 6, name: 'Ibuprofen', dose: '400 mg', date: '2026-10-26', time: '02:06 PM', status: 'Recorded', color: 'blue' },
  ]
  const filtered = rows.filter(row => row.name.toLowerCase().includes(query.trim().toLowerCase()) && (period !== 'Today' || row.date === '2026-10-27') && (!date || row.date === date) && (status === 'All' || row.status === status))
  const hasFilters = query || date || period !== 'All' || status !== 'All'
  function resetFilters() { setQuery(''); setDate(''); setPeriod('All'); setStatus('All') }
  return <section className="history-page" aria-labelledby="history-title">
    <div className="history-page-heading"><div><div className="eyebrow">EVERY LITTLE STEP COUNTS</div><h1 id="history-title">Your report</h1></div><span className="history-demo-badge">Demo history</span></div>
    <div className="history-hero"><img src="/assets/history-bunny.png" alt="A happy MedBunny celebrating with a smiling star" /><div className="history-hero-copy"><span className="history-hero-label">GROWING HEALTHIER, TOGETHER</span><h2>You’re making progress!</h2><p>Every record helps you keep track of the routine.</p><div className="history-stars"><img className="happy-star-icon" src="/assets/happy-star.png" width={23} height={23} alt="" /><strong>{taken ? 25 : 24}</strong><span>stars collected</span></div></div><div className="history-hero-decoration" aria-hidden="true"><img className="happy-star-icon" src="/assets/happy-star.png" width={44} height={44} alt="" /><img className="happy-star-icon" src="/assets/happy-star.png" width={23} height={23} alt="" /></div></div>
    <div className="history-record-heading"><div><h2>Medication history</h2><p>A little care, one dose at a time.</p></div><span>October 2026</span></div>
    <div className="history-filters">
      <label className="history-period"><span className="sr-only">Time period</span><select value={period} onChange={event => setPeriod(event.target.value)}><option>All</option><option>Today</option></select></label>
      <label className="history-search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg><span className="sr-only">Search medication name</span><input type="search" placeholder="Search medication name" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="history-date"><span>Date</span><input type="date" aria-label="Filter by date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="history-status"><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="All">Status</option><option>Recorded</option><option>Awaiting</option><option>Missed</option><option>Upcoming</option></select></label>
    </div>
    <div className="history-result-info" aria-live="polite"><span>{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span>{hasFilters && <button onClick={resetFilters}>Clear filters</button>}</div>
    <div className="history-records">
      <div className="history-table-heading" aria-hidden="true"><span>MEDICATION</span><span>DATE</span><span>TIME</span><span>STATUS</span></div>
      {filtered.map(row => <article className="history-record" key={row.id}><div className="history-medication"><span className={`medicine-icon ${row.color}`}><Icon name="pill" size={21} /></span><div><h3>{row.name}</h3><p>{row.dose}</p></div></div><time className="history-record-date" dateTime={row.date}>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time><span className="history-record-time">{row.time}</span><span className={`history-record-status ${row.status.toLowerCase().split(' ')[0]}`}><Icon name={row.status === 'Recorded' ? 'check' : 'history'} size={14} />{row.status}</span></article>)}
      {!filtered.length && <div className="history-empty"><Icon name="history" size={33} /><h3>No records found</h3><p>Try another medication name, date, or status.</p><button onClick={resetFilters}>Clear filters</button></div>}
    </div>
    <p className="history-note"><Icon name="heart" size={14} />Sample records for this demo. Your care and consistency make a difference.</p>
  </section>
}

function MedicationSchedule() {
  const [items, setItems] = useState<Medication[]>([
    { id: 1, name: 'Amoxicillin', dose: '500 mg', note: '', time: '08:00', startDate: '2026-10-27', frequency: 'Every day', times: ['08:00'], meal: 'Anytime', days: [] },
    { id: 2, name: 'Amoxicillin', dose: '500 mg', note: '', time: '20:00', startDate: '2026-10-27', frequency: 'Every day', times: ['20:00'], meal: 'Anytime', days: [] },
  ])
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  function saveMedication(medication: Medication) {
    setItems(previous => editing === 'new' ? [...previous, medication] : previous.map(item => item.id === editing ? medication : item))
    setNotice(editing === 'new' ? 'Medication added to your schedule.' : 'Medication updated.')
    setEditing(null)
  }
  const current = items.find(item => item.id === editing)
  if (editing !== null) return <AddMedication initial={current} onBack={() => setEditing(null)} onSave={saveMedication} />
  return <section className="medication-page" aria-labelledby="medications-title">
    <div className="medication-page-heading">
      <div><div className="eyebrow">LITTLE DOSES, LOVING CARE</div><h1 id="medications-title">Your Medication</h1><p>Keep every little dose in one happy place.</p></div>
      <button className="add-medication" onClick={() => setEditing('new')}>Add medication <span aria-hidden="true">+</span></button>
    </div>
    <div className="medication-page-meta"><Icon name="schedule" size={16} /><span>{items.length} scheduled doses</span><span className="medication-parent-note">Managed by a parent or caregiver</span></div>
    <div className="medication-list">{items.map((item, index) => <article className={`medication-entry medication-entry-${index % 3}`} key={item.id}>
      <span className="medication-entry-icon"><img className="medicine-illustration" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /></span>
      <div className="medication-entry-copy"><h2>{item.name} <span>{item.dose}</span></h2><span className="medication-time">{item.meal} · {item.frequency === 'As needed' ? 'As needed' : `${item.times.length} ${item.times.length === 1 ? 'time' : 'times'} a day`}{item.frequency === 'Some days' && ` · ${item.days.join(', ')}`}</span></div>
      <button className="edit-medication" onClick={() => setEditing(item.id)} aria-label={`Edit ${item.name} at ${item.time}`}>Edit<Icon name="chevron" size={15} /></button>
    </article>)}</div>
    <p className="medication-notice" role="status">{notice}</p>
    <div className="schedule-mascot"><img src="/assets/schedule-bunny.png" alt="MedBunny holding a star in a flower garden" /><p>Small routines,<br /><strong>bright futures.</strong></p></div>

  </section>
}

export default function App() {
  const [page, setPage] = useState('Home')
  const [taken, setTaken] = useState(false)
  const [profile, setProfile] = useState(false)
  const [mode, setMode] = useState('Parent mode')
  const [proofOpen, setProofOpen] = useState(false)
  const [proof, setProof] = useState('')
  const [proofName, setProofName] = useState('')
  const [proofError, setProofError] = useState('')
  function openProof() {
    setProof('')
    setProofName('')
    setProofError('')
    setProofOpen(true)
  }
  return <div className="app">
    <aside className="sidebar">
      <a className="logo" href="#" aria-label="MedBunny home" onClick={() => setPage('Home')}><img src="/assets/logo.png" alt="MedBunny rabbit logo" /></a>
      <nav>{['Home', 'Schedule', 'History'].map(item => <button key={item} className={`nav-item ${page === item ? 'active' : ''}`} onClick={() => setPage(item)}><Icon name={item.toLowerCase()} /><span>{item}</span></button>)}</nav>
      <div className="sidebar-bottom"><span className="little-heart"><Icon name="heart" size={21} /></span><span>A little care,<br />every day.</span></div>
    </aside>
    <main>
      <header><button className="mode" onClick={() => setMode(mode === 'Parent mode' ? 'Child mode' : 'Parent mode')}>{mode}<Icon name="down" size={16} /></button><button className="avatar" aria-label="Open profile" onClick={() => setProfile(!profile)}>A</button>{profile && <div className="profile-popover"><strong>Alex's family</strong><p>Parent profile</p><button onClick={() => setProfile(false)}>Close profile</button></div>}</header>
      <div className="page-content">
        {page === 'Schedule' ? <MedicationSchedule /> : page === 'History' ? <MedicationHistory taken={taken} /> : <>
        <div className="greeting"><div><div className="eyebrow">A LITTLE CARE GOES A LONG WAY</div><h1>{page === 'Home' ? 'Good morning, Parent!' : page === 'Schedule' ? 'A healthy day, all planned.' : 'Little steps, lovely progress.'}<span className="greeting-sun"><Icon name="sun" size={30} /></span></h1><p>Tuesday, October 27 <span>·</span> Let's make today a healthy one.</p></div><div className="greeting-clock"><span>LOCAL TIME</span><time dateTime="14:00">02.00 <small>PM</small></time></div></div>
        <section className="top-grid">
          <div className="week-card"><div className="section-heading"><h2>Your week at a glance</h2><span className="week-month"><span className="week-month-text">October</span></span></div><div className="week" aria-label="Week of October 25–31, 2026">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <div key={day} className={`week-day${i === 2 ? ' selected' : ''}`} aria-current={i === 2 ? 'date' : undefined}><span>{day}</span><strong>{i + 25}</strong><i className={i < 3 ? 'has-dose' : ''} /></div>)}</div></div>
          <div className={`dose-card ${taken ? 'dose-done' : ''}`}><div className="dose-content"><span className="dose-label">{taken ? 'ALL DONE FOR TODAY' : 'NEXT DOSE'}</span><h2>{taken ? 'Wonderful!' : '2:00'}{!taken && <small>PM</small>}</h2><strong>{taken ? 'A little healthier, together.' : 'Ibuprofen'}</strong><p>{taken ? 'Every little dose is a big step.' : '400 mg · After a meal'}</p><button className="take-button" disabled={taken} onClick={openProof}><Icon name={taken ? 'check' : 'pill'} size={18} />{taken ? 'Dose completed' : 'Mark as taken'}{!taken && <Icon name="chevron" size={15} />}</button></div><img className="mascot" src={taken ? "/assets/bunny.png" : "/assets/bunny-sleeping.png"} alt={taken ? "MedBunny rabbit holding a happy yellow star" : "MedBunny rabbit sleeping while hugging a star"} /><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div>
        </section>
        <section className="lower-grid"><div className="schedule-card"><div className="section-heading"><div><h2>{page === 'History' ? 'Your medication history' : 'Today’s schedule'}</h2><p className="schedule-subtitle">A small routine. A big difference.</p></div><button className="text-button" onClick={() => setPage(page === 'Schedule' ? 'Home' : 'Schedule')}>{page === 'Schedule' ? 'Back home' : 'View schedule'}<Icon name="chevron" size={15} /></button></div><div className="time-heading"><Icon name="sun" size={18} /><strong>Morning</strong><span>8:00 AM</span><div /></div>{medicines.slice(0, 2).map(m => <div className="medicine" key={m.name}><span className={`medicine-icon ${m.color}`}><img className="medicine-illustration" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /></span><div className="medicine-info"><strong>{m.name} <span>{m.dose}</span></strong><p>{m.instruction}</p></div><span className="completed"><Icon name="check" size={14} />Taken <small>8:04 AM</small></span></div>)}<div className="time-heading afternoon"><Icon name="sun" size={18} /><strong>Afternoon</strong><span>2:00 PM</span><div /></div><div className="medicine"><span className="medicine-icon blue"><img className="medicine-illustration" src="/assets/Kawaii_Heart_Medicine_Bottle.png" alt="" /></span><div className="medicine-info"><strong>Ibuprofen <span>400 mg</span></strong><p>After a meal</p></div>{taken ? <span className="completed"><Icon name="check" size={14} />Taken</span> : <button className="upcoming take-now" onClick={openProof}>Take now<Icon name="chevron" size={14} /></button>}</div><div className="schedule-footer"><Icon name="heart" size={15} /> You're doing a wonderful job caring for your little one.</div></div>
        <div className="right-column"><div className="progress-card"><div className="section-heading"><h2>Little wins, big smiles</h2></div><div className="progress-content"><div className={`progress-ring ${taken ? 'full' : ''}`}><div><strong>{taken ? '3' : '2'}<span>/3</span></strong><small>doses taken</small></div></div><div><h3>{taken ? 'You did it!' : 'One more little step.'}</h3><p>{taken ? 'All today’s doses are complete.' : 'A healthy habit starts with a little consistency.'}</p></div></div><div className="progress-track"><i className="done" /><i className="done" /><i className={taken ? 'done' : ''} /></div><div className="progress-caption"><span>Today's progress</span><strong>{taken ? '100' : '67'}%</strong></div></div><div className="kind-card"><span className="plant-art"><i /><i /><i /><b /></span><div><span>A GENTLE REMINDER</span><h3>Small routines,<br />bright futures.</h3><p>A little love and care, every single day.</p></div><Icon name="heart" size={20} /></div></div></section>
        </>}
        <footer><img className="footer-wordmark" src="/assets/medbunny-wordmark.png" alt="MedBunny" /><span>Made for little ones. Here for you.</span><span className="footer-heart"><Icon name="heart" size={14} /> Growing healthier, together.</span></footer>
      </div>
    </main>
    {proofOpen && <dialog className="proof-dialog" ref={node => { if (node && !node.open) node.showModal() }} onCancel={() => setProofOpen(false)} aria-labelledby="proof-title" aria-describedby="proof-description">
      <form onSubmit={event => { event.preventDefault(); if (proof) { setTaken(true); setProofOpen(false) } }}>
        <span className="proof-symbol"><Icon name="pill" size={26} /></span>
        <h2 id="proof-title">Have you taken your medicine?</h2>
        <p id="proof-description">Upload proof to confirm your Ibuprofen dose.<br />Ask a parent or caregiver to help.</p>
        <label className="proof-label" htmlFor="medicine-proof">Upload proof</label>
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
        <div className="proof-actions"><button className="proof-done" type="submit" disabled={!proof}><Icon name="check" size={18} />Done</button><button className="proof-cancel" type="button" onClick={() => setProofOpen(false)}>Cancel</button></div>
      </form>
    </dialog>}
  </div>
}
