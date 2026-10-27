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
  { name: 'Lisinopril', dose: '10 mg', instruction: '1 tablet · After breakfast', time: '8:00 AM', color: 'coral' },
  { name: 'Vitamin D3', dose: '2000 IU', instruction: '1 softgel · After breakfast', time: '8:00 AM', color: 'yellow' },
  { name: 'Ibuprofen', dose: '400 mg', instruction: '1 tablet · After lunch', time: '2:00 PM', color: 'blue' },
]

export default function App() {
  const [page, setPage] = useState('Home')
  const [selected, setSelected] = useState(27)
  const [taken, setTaken] = useState(false)
  const [profile, setProfile] = useState(false)
  const [mode, setMode] = useState('Parent mode')
  return <div className="app">
    <aside className="sidebar">
      <a className="logo" href="#" aria-label="MedBunny home" onClick={() => setPage('Home')}><img src="/assets/logo.png" alt="MedBunny rabbit logo" /></a>
      <nav>{['Home', 'Schedule', 'History'].map(item => <button key={item} className={`nav-item ${page === item ? 'active' : ''}`} onClick={() => setPage(item)}><Icon name={item.toLowerCase()} /><span>{item}</span></button>)}</nav>
      <div className="sidebar-bottom"><span className="little-heart"><Icon name="heart" size={21} /></span><span>A little care,<br />every day.</span></div>
    </aside>
    <main>
      <header><button className="mode" onClick={() => setMode(mode === 'Parent mode' ? 'Child mode' : 'Parent mode')}>{mode}<Icon name="down" size={16} /></button><button className="avatar" aria-label="Open profile" onClick={() => setProfile(!profile)}>A</button>{profile && <div className="profile-popover"><strong>Alex's family</strong><p>Parent profile</p><button onClick={() => setProfile(false)}>Close profile</button></div>}</header>
      <div className="page-content">
        <div className="greeting"><div><div className="eyebrow">A LITTLE CARE GOES A LONG WAY</div><h1>{page === 'Home' ? 'Good morning, Parent!' : page === 'Schedule' ? 'A healthy day, all planned.' : 'Little steps, lovely progress.'}<span className="greeting-sun"><Icon name="sun" size={30} /></span></h1><p>Tuesday, October 27 <span>·</span> Let's make today a healthy one.</p></div><div className="date-label"><Icon name="schedule" size={17} /> October 2026</div></div>
        <section className="top-grid">
          <div className="week-card"><div className="section-heading"><h2>Your week at a glance</h2><span>October <Icon name="down" size={14} /></span></div><div className="week">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <button key={day} className={selected === i + 25 ? 'selected' : ''} onClick={() => setSelected(i + 25)}><span>{day}</span><strong>{i + 25}</strong><i className={i < 3 ? 'has-dose' : ''} /></button>)}</div></div>
          <div className={`dose-card ${taken ? 'dose-done' : ''}`}><div className="dose-content"><span className="dose-label">{taken ? 'ALL DONE FOR TODAY' : 'NEXT DOSE'}</span><h2>{taken ? 'Wonderful!' : '2:00'}{!taken && <small>PM</small>}</h2><strong>{taken ? 'A little healthier, together.' : 'Ibuprofen'}</strong><p>{taken ? 'Every little dose is a big step.' : '400 mg · Take after lunch'}</p><button className="take-button" onClick={() => setTaken(!taken)}><Icon name={taken ? 'check' : 'pill'} size={18} />{taken ? 'Dose completed' : 'Mark as taken'}{!taken && <Icon name="chevron" size={15} />}</button></div><img className="mascot" src="/assets/bunny.png" alt="MedBunny rabbit holding a happy yellow star" /><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div>
        </section>
        <section className="lower-grid"><div className="schedule-card"><div className="section-heading"><div><h2>{page === 'History' ? 'Your medication history' : 'Today’s schedule'}</h2><p>A small routine. A big difference.</p></div><button className="text-button" onClick={() => setPage(page === 'Schedule' ? 'Home' : 'Schedule')}>{page === 'Schedule' ? 'Back home' : 'View schedule'}<Icon name="chevron" size={15} /></button></div><div className="time-heading"><Icon name="sun" size={18} /><strong>Morning</strong><span>8:00 AM</span><div /></div>{medicines.slice(0, 2).map(m => <div className="medicine" key={m.name}><span className={`medicine-icon ${m.color}`}><Icon name="pill" /></span><div className="medicine-info"><strong>{m.name} <span>{m.dose}</span></strong><p>{m.instruction}</p></div><span className="completed"><Icon name="check" size={14} />Taken <small>8:04 AM</small></span></div>)}<div className="time-heading afternoon"><Icon name="sun" size={18} /><strong>Afternoon</strong><span>2:00 PM</span><div /></div><div className="medicine"><span className="medicine-icon blue"><Icon name="pill" /></span><div className="medicine-info"><strong>Ibuprofen <span>400 mg</span></strong><p>1 tablet · After lunch</p></div><span className={taken ? 'completed' : 'upcoming'}>{taken && <Icon name="check" size={14} />}{taken ? 'Taken' : 'Upcoming'}</span></div><div className="schedule-footer"><Icon name="heart" size={15} /> You're doing a wonderful job caring for your little one.</div></div>
        <div className="right-column"><div className="progress-card"><div className="section-heading"><h2>Little wins, big smiles</h2><span className="star-badge"><Icon name="star" size={19} /></span></div><div className="progress-content"><div className={`progress-ring ${taken ? 'full' : ''}`}><div><strong>{taken ? '3' : '2'}<span>/3</span></strong><small>doses taken</small></div></div><div><span className="pill-label">Looking good!</span><h3>{taken ? 'You did it!' : 'One more little step.'}</h3><p>{taken ? 'All today’s doses are complete.' : 'A healthy habit starts with a little consistency.'}</p></div></div><div className="progress-track"><i className="done" /><i className="done" /><i className={taken ? 'done' : ''} /></div><div className="progress-caption"><span>Today's progress</span><strong>{taken ? '100' : '67'}%</strong></div></div><div className="kind-card"><span className="plant-art"><i /><i /><i /><b /></span><div><span>A GENTLE REMINDER</span><h3>Small routines,<br />bright futures.</h3><p>A little love and care, every single day.</p></div><Icon name="heart" size={20} /></div></div></section>
        <footer><img className="footer-wordmark" src="/assets/medbunny-wordmark.png" alt="MedBunny" /><span>Made for little ones. Here for you.</span><span className="footer-heart"><Icon name="heart" size={14} /> Growing healthier, together.</span></footer>
      </div>
    </main>
  </div>
}
