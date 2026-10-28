import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import legacyDom from './engine/legacy-dom.html?raw'
import { preloadModels } from './engine/preload'
import { useGame } from './store'
import { soundscape } from './audio/soundscape'
import { lanClient } from './multiplayer/client'
import { LanMenu, LanLobby, LanResults, LanLost, lanTime } from './multiplayer/LanScreens'
import './styles/legacy.css'
import './styles/app.css'

const act = (fn) => useGame.getState().engine?.[fn]
const money = (n) => new Intl.NumberFormat('ru-RU').format(n || 0)
const time = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

function EngineHost() {
  return <div id="legacy-host" dangerouslySetInnerHTML={{ __html: legacyDom }} />
}

function LoadingScreen({ retry }) {
  const progress = useGame((s) => s.loading)
  const error = useGame((s) => s.error)
  return <div className="screen loading-screen">
    <div className="loading-streaks" aria-hidden="true" />
    <div className="load-inner">
      <div className="eyebrow">MIDNIGHT HIGHWAY · EDITION 2026</div>
      <h1 className="racing-title">NIGHT<br /><span>OVERTAKE</span> 3D</h1>
      <div className="tach" aria-hidden="true"><span>RPM</span><b>{progress.percent ?? '···'}</b></div>
      {error ? <><p role="alert" className="error">{error}</p><button className="primary" onClick={retry}>Повторить загрузку</button></> :
        <><p>Загрузка: {progress.name || 'подготовка трассы'} · {progress.loaded}/{progress.total} моделей</p>
          <div className="load-track"><i style={{ width: progress.percent === null ? '32%' : `${progress.percent}%` }} className={progress.percent === null ? 'indeterminate' : ''} /></div>
          <small>{progress.percent === null ? 'Размер загрузки неизвестен' : `${progress.percent}%`} · WASD / стрелки — руль, Shift — нитро</small></>}
    </div>
  </div>
}

function Header({ title, back }) {
  return <header className="topbar"><button className="back-button" onClick={back} aria-label="Назад">← <span>НАЗАД</span></button><div className="top-title">{title}</div><div className="brand-mini">N/O <span>3D</span></div></header>
}

function MainMenu() {
  const state = useGame((s) => s.state)
  const setScreen = useGame((s) => s.setScreen)
  const car = useGame((s) => s.engine?.cars.find((c) => c.id === state?.selected))
  return <div className="screen menu-screen">
    <div className="menu-meta"><span className="brand-mini">NIGHT / OVERTAKE <em>3D</em></span><span>RACING // 01</span></div>
    <div className="menu-hub">
      <div className="hub-rings" aria-hidden="true"><div className="hub-needle" /></div>
      <div className="hub-content">
        <div className="eyebrow">OWN THE NIGHT</div>
        <h1 className="racing-title">NIGHT<br /><span>OVERTAKE</span> 3D</h1>
        <p>Ночной поток. Точная траектория. Каждый обгон имеет цену.</p>
        <nav aria-label="Главное меню">
          <button className="hub-link main" onClick={() => setScreen('race')}><span>01</span><b>ГОНКА / ПОЕХАЛИ</b><i>↗</i></button>
          <button className="hub-link" onClick={() => { act('garage')?.(); setScreen('garage') }}><span>02</span><b>ГАРАЖ</b><i>↗</i></button>
          <button className="hub-link" onClick={() => setScreen('settings')}><span>03</span><b>НАСТРОЙКИ</b><i>↗</i></button>
          <button className="hub-link lan-entry" onClick={() => setScreen('lanMenu')}><span>04</span><b>LAN MULTIPLAYER</b><i>◎</i></button>
        </nav>
      </div>
    </div>
    <div className="menu-foot"><div><small>ВАША МАШИНА</small><strong>{car ? `${car.brand} ${car.name}` : 'BMW M4'}</strong></div><div><small>МОНЕТЫ</small><strong className="amber">◈ {money(state?.total)}</strong></div><div><small>РЕКОРД</small><strong>{money(state?.best)}</strong></div></div>
  </div>
}

const modes = [
  { id: 'classic', no: '01', title: 'КЛАССИКА', sub: 'Обгоняйте трафик, собирайте серии и монеты. Заезд заканчивается при столкновении.', tag: 'БЕСКОНЕЧНЫЙ ЗАЕЗД' },
  { id: 'drift', no: '02', title: 'ДРИФТ', sub: '90 секунд. Набирайте очки за реальное скольжение на скорости; столкновение обрывает серию.', tag: '90 СЕКУНД' },
  { id: 'chase', no: '03', title: 'ДОГОНЯЛКИ', sub: 'За 3 минуты догоните двух соперников. Держитесь рядом или коснитесь бампером.', tag: '03:00 · 2 СОПЕРНИКА' },
  { id: 'extreme', no: '04', title: 'ЭКСТРИМ', sub: 'Плотный поток, быстрые встречные машины и внезапные перестроения. За рискованные обгоны — двойные монеты.', tag: '2× ТРАФИК · 2× НАГРАДА' },
]

function RaceMenu() {
  const setScreen = useGame((s) => s.setScreen)
  return <div className="screen panel-screen"><Header title="ВЫБОР ЗАЕЗДА" back={() => setScreen('menu')} />
    <div className="mode-grid">{modes.map((m) => <button key={m.id} className={`mode-card glass${m.id === 'extreme' ? ' extreme' : ''}`} onClick={() => { act('start')?.(m.id); setScreen('play') }}>
      <span className="mode-number">{m.no} / 04</span><span className="mode-art">{m.id === 'classic' ? '↗' : m.id === 'drift' ? '⤴' : m.id === 'extreme' ? '⚡' : '◎'}</span>
      <span className="mode-tag">{m.tag}</span><strong>{m.title}</strong><span className="mode-description">{m.sub}</span><span className="mode-go">ПОЕХАЛИ <b>↗</b></span>
    </button>)}</div>
  </div>
}

function Garage() {
  const engine = useGame((s) => s.engine)
  const state = useGame((s) => s.state)
  const setScreen = useGame((s) => s.setScreen)
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')
  const car = engine?.cars.find((c) => c.id === state?.garageCar)
  if (!car || !state) return null
  const owned = state.owned.includes(car.id)
  const light = state.lights[car.id] || { color: '#fff4dc', intensity: 1.7 }
  const paint = state.colors[car.id] ?? (car.id === 'm4' ? 8 : car.id === 'g63' ? 5 : car.id === '911' ? 1 : 0)
  const select = () => { if (engine.selectCar(car.id)) setNotice('Машина выбрана') }
  const buy = () => { setConfirm(false); setNotice(engine.buyCar(car.id) ? 'Машина куплена' : 'Недостаточно монет') }
  return <div className="screen garage-screen"><Header title="ГАРАЖ" back={() => { engine.menu(); setScreen('menu') }} />
    <div className="garage-nav"><button onClick={() => { engine.nextCar(-1); setConfirm(false) }} aria-label="Предыдущая машина">‹</button><div>{state.garageIndex + 1} / {engine.cars.length}</div><button onClick={() => { engine.nextCar(1); setConfirm(false) }} aria-label="Следующая машина">›</button></div>
    <div className="garage-controls"><button onClick={() => engine.orbit(-0.25, 0)}>↶</button><button onClick={() => engine.orbit(0.25, 0)}>↷</button><button onClick={() => engine.orbit(0, -0.12)}>＋</button><button onClick={() => engine.orbit(0, 0.12)}>－</button></div>
    <aside className="garage-sheet glass">
      <div className="garage-scroll">
        <div className="eyebrow">{car.brand} · {owned ? 'В ГАРАЖЕ' : `◈ ${money(car.price)}`}</div><h2>{car.name}</h2><p>{car.gen}</p>
        <div className="spec-grid"><div><small>МОЩНОСТЬ</small><b>{car.hp} л.с.</b></div><div><small>0–100 КМ/Ч</small><b>{String(car.t100).replace('.', ',')} с</b></div><div><small>МАКС. СКОРОСТЬ</small><b>{car.vmax} км/ч</b></div><div><small>МАССА</small><b>{money(car.kg)} кг</b></div><div><small>МОМЕНТ</small><b>{car.nm} Н·м</b></div><div><small>ПРИВОД</small><b>{car.drive}</b></div></div>
        <div className="custom-section"><h3>КУЗОВ</h3>{car.fixedPaint ? <small>Заводская окраска</small> : <div className="swatches">{engine.paints.map((p, i) => <button key={i} title={p.name} aria-label={p.name} aria-pressed={paint === i} style={{ background: p.color }} onClick={() => engine.paint(car.id, i)} />)}</div>}
          <div className="seg-row"><button className={!state.matte[car.id] ? 'selected' : ''} onClick={() => engine.matte(car.id, false)}>Металлик</button><button className={state.matte[car.id] ? 'selected' : ''} onClick={() => engine.matte(car.id, true)}>Матовый</button></div></div>
        <div className="custom-section"><h3>СВЕТ</h3><div className="swatches">{['#fff4dc', '#ffffff', '#cceaff', '#ffe08a', '#5eb7ff'].map((c) => <button key={c} style={{ background: c }} aria-label={c} aria-pressed={light.color === c} onClick={() => engine.lights(car.id, c, light.intensity)} />)}<label className="color-picker" title="Свой цвет фары"><input type="color" value={light.color} onChange={(e) => engine.lights(car.id, e.target.value, light.intensity)} /></label></div><label className="range-label">Яркость фар <input type="range" min=".2" max="4" step=".1" value={light.intensity} onChange={(e) => engine.lights(car.id, light.color, e.target.value)} /></label></div>
        <div className="custom-section"><h3>ПОДСВЕТКА ДНИЩА</h3><div className="swatches">{['#000000', '#2d8cff', '#ffb020', '#e9458f', '#42e2a3'].map((c) => <button key={c} style={{ background: c }} aria-label={c === '#000000' ? 'Выключить' : c} aria-pressed={(state.neon[car.id] || '#000000') === c} onClick={() => engine.neon(car.id, c)} />)}</div></div>
        <div className="custom-section"><h3>ДИСКИ</h3><div className="swatches">{['#aeb8c8', '#151a22', '#f6f6f6', '#d29b39', '#4989d5'].map((c) => <button key={c} style={{ background: c }} aria-label={c} aria-pressed={(state.rims[car.id] || '#aeb8c8') === c} onClick={() => engine.rims(car.id, c)} />)}</div></div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>
      <div className="garage-actions">{owned ? <button className="primary" disabled={state.selected === car.id} onClick={select}>{state.selected === car.id ? 'ВЫБРАНА' : 'ВЫБРАТЬ'}</button> : <button className="primary" onClick={() => setConfirm(true)}>КУПИТЬ · ◈ {money(car.price)}</button>}<button className="secondary" onClick={() => { engine.testDrive(car.id); setScreen('play') }}>ТЕСТ-ДРАЙВ</button></div>
    </aside>
    {confirm && <div className="modal-shade"><div className="dialog glass"><h3>Купить {car.name}?</h3><p>Стоимость: ◈ {money(car.price)}. На счету: ◈ {money(state.total)}.</p><div className="dialog-actions"><button className="secondary" onClick={() => setConfirm(false)}>ОТМЕНА</button><button className="primary" onClick={buy} disabled={state.total < car.price}>ПОДТВЕРДИТЬ</button></div>{state.total < car.price && <small className="error">Недостаточно монет</small>}</div></div>}
  </div>
}

function Settings() {
  const engine = useGame((s) => s.engine)
  const state = useGame((s) => s.state)
  const setScreen = useGame((s) => s.setScreen)
  const [font, setFont] = useState(localStorage.getItem('night-font') || 'racing')
  if (!engine || !state) return null
  const changeFont = (v) => { setFont(v); localStorage.setItem('night-font', v); document.documentElement.dataset.font = v }
  const update = (method, ...args) => { engine[method](...args); useGame.getState().setState(engine.snapshot()) }
  return <div className="screen panel-screen settings-screen"><Header title="НАСТРОЙКИ" back={() => setScreen('menu')} />
    <div className="settings-grid">
      <section className="glass"><h2>УПРАВЛЕНИЕ</h2><label>Мобильное управление<select value={state.control} onChange={(e) => update('control', e.target.value)}><option value="arrows">Кнопки</option><option value="wheel">Виртуальный руль</option><option value="tilt">Наклон устройства</option></select></label><label className="range-label">Чувствительность руля <span>{state.steerSensitivity.toFixed(1)}×</span><input type="range" min=".5" max="1.7" step=".1" value={state.steerSensitivity} onChange={(e) => update('steering', e.target.value)} /></label><p>WASD / стрелки — руль и газ · Space — ручник · Shift — нитро · Esc — пауза.</p></section>
      <section className="glass">
        <h2>ГРАФИКА</h2>
        <label>Качество<select value={state.quality} onChange={(e) => update('quality', e.target.value)}>{['auto', 'low', 'medium', 'high', 'ultra'].map((v) => <option key={v} value={v}>{({ auto: 'Авто', low: 'Низкое', medium: 'Среднее', high: 'Высокое', ultra: 'Ультра' })[v]}</option>)}</select></label>
        <small>Фактическое качество: {state.actualQuality}</small>
        <label className="range-label">Разрешение <span>{Math.round(state.graphics.resolution * 100)}%</span><input type="range" min=".65" max="1.25" step=".05" value={state.graphics.resolution} onChange={(e) => update('graphics', 'resolution', e.target.value)} /></label>
        <label className="range-label">Лимит плотности пикселей <span>{state.graphics.pixelRatioCap.toFixed(1)}×</span><input type="range" min=".75" max="3" step=".25" value={state.graphics.pixelRatioCap} onChange={(e) => update('graphics', 'pixelRatioCap', e.target.value)} /></label>
        <label className="range-label">Частицы <span>{Math.round(state.graphics.particles * 100)}%</span><input type="range" min=".25" max="1" step=".05" value={state.graphics.particles} onChange={(e) => update('graphics', 'particles', e.target.value)} /></label>
        <label className="range-label">Дальность прорисовки <span>{state.graphics.drawDistance} м</span><input type="range" min="300" max="1500" step="100" value={state.graphics.drawDistance} onChange={(e) => update('graphics', 'drawDistance', e.target.value)} /></label>
        <label className="range-label">Плотность потока <span>{Math.round(state.graphics.traffic * 100)}%</span><input type="range" min=".8" max="1.8" step=".05" value={state.graphics.traffic} onChange={(e) => update('graphics', 'traffic', e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={state.graphics.lighting} onChange={(e) => update('graphics', 'lighting', e.target.checked)} /> Световые эффекты</label>
        <label className="check"><input type="checkbox" checked={state.graphics.antialias} onChange={(e) => update('graphics', 'antialias', e.target.checked)} /> Сглаживание · перезапускает игру</label>
        <label>Тени<select value={state.graphics.shadows} onChange={(e) => update('graphics', 'shadows', e.target.value)}><option value="off">Выкл. · максимум FPS</option><option value="low">Низкие</option><option value="high">Высокие</option></select></label>
        <label>Ограничение FPS<select value={state.fpsCap} onChange={(e) => update('fpsCap', Number(e.target.value))}><option value="0">Авто</option><option value="30">30</option><option value="60">60</option></select></label>
        <label>Трасса<select value={state.track} onChange={(e) => update('track', e.target.value)}>{engine.tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      </section>
      <section className="glass"><h2>ЗВУК</h2><label className="check"><input type="checkbox" checked={state.sound} onChange={(e) => update('sound', e.target.checked)} /> Включить звук</label>{[['master', 'Общая'], ['engine', 'Двигатель'], ['effects', 'Эффекты'], ['music', 'Музыка'], ['ui', 'Интерфейс']].map(([key, label]) => <label className="range-label" key={key}>{label}<span>{Math.round((state.audio[key] || 0) * 100)}%</span><input type="range" min="0" max="1" step=".01" value={state.audio[key]} onChange={(e) => update('audio', key, e.target.value)} /></label>)}</section>
      <section className="glass"><h2>ИНТЕРФЕЙС</h2><label>Шрифт заголовков<select value={font} onChange={(e) => changeFont(e.target.value)}><option value="racing">Racing</option><option value="modern">Modern</option><option value="system">System</option></select></label><p>Настройки и прогресс сохраняются в этом браузере.</p></section>
    </div>
  </div>
}

function HoldButton({ name, label, icon, className = '' }) {
  const pressed = useRef(false)
  const [down, setDown] = useState(false)
  const end = (e) => { if (!pressed.current) return; pressed.current = false; setDown(false); act('input')?.(name, false); try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {} }
  return <button className={`touch-button ${className} ${down ? 'pressed' : ''}`} aria-label={label}
    onPointerDown={(e) => { e.preventDefault(); pressed.current = true; setDown(true); e.currentTarget.setPointerCapture(e.pointerId); act('input')?.(name, true) }}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>{icon}<small>{label}</small></button>
}

function SteeringWheel() {
  const [angle, setAngle] = useState(0)
  const active = useRef(null)
  const update = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const value = Math.max(-1, Math.min(1, dx))
    setAngle(value * 95)
    act('input')?.('left', value < -0.15)
    act('input')?.('right', value > 0.15)
  }
  const end = () => { active.current = null; setAngle(0); act('input')?.('left', false); act('input')?.('right', false) }
  return <div className="steering-wheel" role="slider" aria-label="Руль" aria-valuenow={Math.round(angle)} tabIndex={0}
    onPointerDown={(e) => { e.preventDefault(); active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e) }}
    onPointerMove={(e) => { if (active.current === e.pointerId) update(e) }}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><div style={{ transform: `rotate(${angle}deg)` }}><span>◯</span><i /></div></div>
}

function TouchControls({ control }) {
  return <div className="touch-controls">
    <div className="touch-steer">{control === 'wheel' ? <SteeringWheel /> : control === 'tilt' ? <div className="tilt-hint">НАКЛОН<br />↔</div> : <><HoldButton name="left" label="ВЛЕВО" icon="◀" /><HoldButton name="right" label="ВПРАВО" icon="▶" /></>}</div>
    <div className="touch-pedals"><HoldButton name="handbrake" label="РУЧНИК" icon="P" /><HoldButton name="brake" label="ТОРМОЗ" icon="Ⅱ" /><HoldButton name="nitro" label="НИТРО" icon="⚡" className="nitro" /><HoldButton name="accelerate" label="ГАЗ" icon="↑" className="accelerate" /></div>
  </div>
}

function HUD() {
  const state = useGame((s) => s.state)
  const setScreen = useGame((s) => s.setScreen)
  if (!state) return null
  const title = state.gameType === 'chase' ? 'ДОГОНЯЛКИ' : state.gameType === 'drift' ? 'ДРИФТ' : state.gameType === 'extreme' ? 'ЭКСТРИМ' : state.gameType === 'test' ? 'ТЕСТ-ДРАЙВ' : 'КЛАССИКА'
  return <div className="screen hud-screen">
    <div className="hud-top"><div className="hud-mode"><small>РЕЖИМ ЗАЕЗДА</small><strong>{title}</strong></div><div className="hud-stats"><div><small>МОНЕТЫ</small><b>◈ {money(state.coins)}</b></div><div><small>ОБГОНЫ</small><b>{state.overtakes}</b></div>{state.combo > 1 && <div className="combo-pill">COMBO ×{state.combo}</div>}</div><button className="pause-button" onClick={() => act('pause')?.()} aria-label="Пауза">Ⅱ</button></div>
    {(state.gameType === 'chase' || state.gameType === 'drift' || state.gameType === 'test') && <div className="objective glass"><small>{state.gameType === 'chase' ? 'ОСТАЛОСЬ · ПОЙМАНО' : state.gameType === 'drift' ? 'ОСТАЛОСЬ · ОЧКИ' : 'ОСТАЛОСЬ'}</small><strong>{time(state.gameType === 'chase' ? state.chaseRemaining : state.gameType === 'drift' ? state.driftRemaining : state.testRemaining)}</strong>{state.gameType === 'chase' && <span>{state.catches} / {state.chaseNeed * 2}</span>}{state.gameType === 'drift' && <span>{money(state.driftScore)} ОЧКОВ</span>}</div>}
    <div className="hud-bottom"><div className="speed-dial"><div className="speed-number">{state.speed}</div><small>КМ/Ч</small><div className="gear">GEAR {state.gear}</div><div className="rpm-track"><i style={{ width: `${Math.min(100, state.rpm / 8000 * 100)}%` }} /></div></div><div className="nitro-meter"><small>NITRO</small><div><i style={{ width: `${Math.round(state.nitro * 100)}%` }} /></div><b>{Math.round(state.nitro * 100)}%</b></div></div>
    <button className="camera-button" onClick={() => act('camera')?.()}>КАМЕРА ◉</button>
    <TouchControls control={state.control} />
    {state.paused && <div className="modal-shade"><div className="pause-panel glass"><span className="eyebrow">ЗАЕЗД ПРИОСТАНОВЛЕН</span><h2>ПАУЗА</h2><button className="primary" onClick={() => act('resume')?.()}>ПРОДОЛЖИТЬ</button><button className="secondary" onClick={() => act('restart')?.()}>ЗАНОВО</button><button className="secondary" onClick={() => { act('menu')?.(); setScreen('menu') }}>В МЕНЮ</button></div></div>}
  </div>
}

function Results() {
  const state = useGame((s) => s.state)
  const setScreen = useGame((s) => s.setScreen)
  if (!state) return null
  const title = state.gameType === 'chase' ? (state.chaseWin ? 'ПОГОНЯ ЗАВЕРШЕНА' : 'ЦЕЛЬ УШЛА') : state.gameType === 'drift' ? 'ДРИФТ ЗАВЕРШЁН' : state.gameType === 'extreme' ? 'ЭКСТРИМ ЗАВЕРШЁН' : 'ЗАЕЗД ЗАВЕРШЁН'
  return <div className="screen results-screen"><div className="results-panel glass"><div className="eyebrow">NIGHT OVERTAKE 3D · РЕЗУЛЬТАТ</div><h1>{title}</h1><div className="results-grid"><div><small>МОНЕТЫ</small><b className="amber">◈ {money(state.coins)}</b></div><div><small>ОБГОНЫ</small><b>{state.overtakes}</b></div><div><small>ОБГОНЫ ВПРИТЫК</small><b>{state.nearMisses}</b></div><div><small>МАКС. СКОРОСТЬ</small><b>{state.maxSpeed} <small>км/ч</small></b></div><div><small>ДИСТАНЦИЯ</small><b>{(state.distance / 1000).toFixed(1)} <small>км</small></b></div>{state.gameType === 'drift' && <div><small>ОЧКИ ДРИФТА</small><b>{money(state.driftScore)}</b></div>}{state.gameType === 'chase' && <div><small>ПОЙМАНО</small><b>{state.catches}</b></div>}</div><div className="dialog-actions"><button className="primary" onClick={() => { act('restart')?.(); setScreen('play') }}>ЕЩЁ РАЗ</button><button className="secondary" onClick={() => { act('menu')?.(); setScreen('menu') }}>В МЕНЮ</button><button className="secondary" onClick={() => { act('garage')?.(); setScreen('garage') }}>ГАРАЖ</button></div></div></div>
}

function LanHUD() {
  const lan = useGame((s) => s.lan)
  const control = useGame((s) => s.state?.control)
  const [spectatorMenu, setSpectatorMenu] = useState(false)
  const match = lan.snapshot
  const me = match?.players.find((p) => p.id === lan.id)
  const observing = match?.players.find((p) => p.id === lan.spectatorId)
  useEffect(() => {
    if (me?.alive) return
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); lanClient.switchSpectator(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); lanClient.switchSpectator(1) }
      if (event.key === 'Escape') { event.preventDefault(); setSpectatorMenu((value) => !value) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [me?.alive])
  if (!match || !me) return null
  return <div className="screen hud-screen lan-hud"><div className="lan-hud-top glass"><div><small>LAN SURVIVAL · {me.nickname}</small><strong>{me.alive ? `${Math.round(me.speed)} КМ/Ч` : 'ВЫБЫЛ · НАБЛЮДАТЕЛЬ'}</strong></div><div><small>ВЫЖИВАНИЕ</small><strong>{lanTime(match.elapsed)}</strong></div><div><small>ОСТАЛОСЬ</small><strong>{match.survivors} / {match.players.length}</strong></div><div><small>ПОТОК</small><strong>УРОВЕНЬ {match.difficulty}</strong></div><div><small>СЕТЬ</small><strong>{lan.status === 'connected' ? `${lan.ping ?? '—'} МС` : 'НЕТ СВЯЗИ'}</strong><small>ПОТЕРЯ {lan.loss}%</small></div></div>
    <div className="lan-leaderboard glass">{match.players.map((p) => <div key={p.id}><span>{p.nickname}</span><b className={p.alive ? 'alive' : ''}>{p.alive ? 'В ГОНКЕ' : 'ВЫБЫЛ'}</b></div>)}</div>
    {lan.notice && <div className="lan-notice glass">{lan.notice}</div>}
    {me.alive ? <><div className="lan-nitro glass"><small>NITRO {Math.round(me.nitro * 100)}%</small><i style={{ width: `${Math.round(me.nitro * 100)}%` }} /></div><TouchControls control={control} /><button className="lan-exit" onClick={() => lanClient.leave()}>ПОКИНУТЬ КОМНАТУ</button></> : <div className="lan-spectator glass"><div className="eyebrow">ВЫ ВЫБЫЛИ · {lanTime(me.survival)}</div><strong>НАБЛЮДЕНИЕ: {observing?.nickname || 'ЗАВЕРШЕНИЕ ЗАЕЗДА'}</strong><div><button onClick={() => lanClient.switchSpectator(-1)}>← ПРЕДЫДУЩИЙ</button><button onClick={() => lanClient.switchSpectator(1)}>СЛЕДУЮЩИЙ →</button><button onClick={() => setSpectatorMenu(true)}>МЕНЮ</button></div></div>}
    {spectatorMenu && <div className="modal-shade"><div className="dialog glass"><h3>НАБЛЮДАТЕЛЬ</h3><button className="primary" onClick={() => setSpectatorMenu(false)}>ПРОДОЛЖИТЬ</button><button className="secondary" onClick={() => lanClient.leave()}>ВЫЙТИ ИЗ НАБЛЮДЕНИЯ</button></div></div>}
  </div>
}

function App() {
  const screen = useGame((s) => s.screen)
  const state = useGame((s) => s.state)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    document.documentElement.dataset.font = localStorage.getItem('night-font') || 'racing'
    let cancelled = false
    const start = async () => {
      useGame.getState().setError('')
      const resumeLan = localStorage.getItem('night-lan-inroom') === '1'
      if (resumeLan) lanClient.connect()
      try {
        const models = await preloadModels((v) => { if (!cancelled) useGame.getState().setLoading(v) })
        if (cancelled) return
        window.__preloadedModels = models
        await import('./engine/legacy.js')
        if (!window.__night) throw new Error('Не удалось запустить 3D-движок')
        window.__night.loadAllModels()
        const deadline = performance.now() + 120000
        useGame.getState().setLoading({ loaded: 4, total: 4, name: 'подготовка 3D-моделей', percent: 100 })
        while (!window.__night.modelsReady()) {
          if (cancelled) return
          if (performance.now() > deadline) throw new Error('Не удалось подготовить модели. Проверьте файлы и повторите загрузку.')
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        useGame.getState().setEngine(window.__night)
        if (resumeLan) lanClient.restoreView()
      } catch (error) { if (!cancelled) useGame.getState().setError(error.message || String(error)) }
    }
    start()
    return () => { cancelled = true }
  }, [attempt])
  useEffect(() => {
    const onPointerDown = (event) => {
      if (!event.target.closest('button')) return
      soundscape.activate()
      soundscape.click()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])
  useEffect(() => {
    const id = setInterval(() => {
      const engine = useGame.getState().engine
      if (!engine) return
      const snapshot = engine.snapshot()
      useGame.getState().setState(snapshot)
      soundscape.set({ sound: snapshot.sound, master: snapshot.audio.master, music: snapshot.audio.music, ui: snapshot.audio.ui })
      if (snapshot.resultVisible && useGame.getState().screen === 'play') useGame.getState().setScreen('results')
      if (snapshot.mode === 'garage' && useGame.getState().screen === 'play') useGame.getState().setScreen('garage')
    }, 150)
    return () => clearInterval(id)
  }, [])
  return <><EngineHost />{screen === 'loading' && <LoadingScreen retry={() => setAttempt((n) => n + 1)} />}{screen === 'menu' && <MainMenu />}{screen === 'race' && <RaceMenu />}{screen === 'garage' && <Garage />}{screen === 'settings' && <Settings />}{screen === 'play' && <HUD />}{screen === 'results' && <Results />}{screen === 'lanMenu' && <LanMenu />}{screen === 'lanRoom' && <LanLobby />}{screen === 'lanPlay' && <LanHUD />}{screen === 'lanResults' && <LanResults />}{screen === 'lanLost' && <LanLost />}</>
}

createRoot(document.getElementById('root')).render(<App />)
