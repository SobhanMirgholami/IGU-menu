// Records a demo of the LIVE IGU Café site with two windows side by side:
// a student's phone and the café dashboard (manager account).
//
//   npm install
//   npm run login:student   -> sign in with a student account, the session is saved
//   npm run login:manager   -> sign in with a manager account
//   npm run record          -> plays the demo and saves frames to out/
//
// Sessions are saved in .auth/ (they contain login tokens: never commit them).
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = process.env.SITE || 'https://igu-menu-iqcg.vercel.app'
const DIR = path.dirname(fileURLToPath(import.meta.url))
const AUTH = path.join(DIR, '.auth')
const OUT = path.join(DIR, 'out')

const DEVICES = {
  student: { viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true },
  manager: { viewport: { width: 1100, height: 892 }, deviceScaleFactor: 1.6 },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launch(headless) {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel, headless })
    } catch {}
  }
  throw new Error('Could not start Chrome or Edge. Install Google Chrome and try again.')
}

// ---------- login: save a signed-in session ----------
async function login(role) {
  if (!DEVICES[role]) throw new Error('Use: node record.mjs login student|manager')
  const browser = await launch(false)
  const ctx = await browser.newContext({ ...DEVICES[role], locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(SITE)
  console.log(`\nSign in with your ${role.toUpperCase()} account in the browser window that opened.`)
  console.log('I will save the session as soon as you are in. (No time limit.)\n')

  await page.waitForFunction(
    () => Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)),
    null,
    { timeout: 0, polling: 1000 }
  )

  const check =
    role === 'manager'
      ? page.getByRole('button', { name: /^(Reports|Raporlar|التقارير)$/ })
      : page.locator('button[aria-label*=":"]').first()
  try {
    await check.waitFor({ timeout: 20000 })
  } catch {
    console.log(`\n⚠️  This account doesn't look like a ${role} account. The demo may not work with it.`)
  }

  fs.mkdirSync(AUTH, { recursive: true })
  await ctx.storageState({ path: path.join(AUTH, `${role}.json`) })
  console.log(`✅ Saved the ${role} session to .auth/${role}.json`)
  await browser.close()
}

// ---------- overlay: cursor, tap ripple, receipt preview ----------
function overlay({ touch }) {
  try {
    if (!sessionStorage.getItem('vid-init')) {
      localStorage.setItem('i18nextLng', 'en')
      sessionStorage.setItem('vid-init', '1')
    }
  } catch {}
  window.print = () => {}
  const add = () => {
    if (document.getElementById('vcur')) return
    const css = document.createElement('style')
    css.textContent = `
      #vcur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition:transform .55s cubic-bezier(.45,.05,.25,1);transform:translate(-80px,-80px)}
      #vcur.touch{width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:99px;background:rgba(255,255,255,.55);border:3px solid #0E1630;box-shadow:0 2px 8px rgba(0,0,0,.3)}
      #vcur svg{width:30px;height:30px;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))}
      .vrip{position:fixed;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:99px;border:4px solid #FFC93C;z-index:2147483646;pointer-events:none;animation:vrip .5s ease-out forwards}
      @keyframes vrip{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}
      html.vreceipt #receipt{visibility:visible!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%) scale(1.35);z-index:2147483645;box-shadow:0 0 0 200vmax rgba(5,12,30,.6),8px 8px 0 #000}
      html.vreceipt #receipt *{visibility:visible!important}`
    document.head.appendChild(css)
    const c = document.createElement('div')
    c.id = 'vcur'
    if (touch) c.className = 'touch'
    else c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 2l16 10.5-7 1.3 4 7.2-3 1.6-4-7.3-5.5 4.7z" fill="#fff" stroke="#0E1630" stroke-width="1.8" stroke-linejoin="round"/></svg>'
    document.body.appendChild(c)
    window.__v = {
      move: (x, y) => (c.style.transform = touch ? `translate(${x}px,${y}px)` : `translate(${x - 4}px,${y - 3}px)`),
      rip: (x, y) => {
        const r = document.createElement('div')
        r.className = 'vrip'
        r.style.left = x + 'px'
        r.style.top = y + 'px'
        document.body.appendChild(r)
        setTimeout(() => r.remove(), 600)
      },
    }
  }
  if (document.body) add()
  else document.addEventListener('DOMContentLoaded', add)
}

// ---------- screencast: save every frame with its timestamp ----------
async function startCast(page, name) {
  const dir = path.join(OUT, 'frames', name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', (ev) => {
    const file = `f${String(frames.length).padStart(5, '0')}.jpg`
    fs.writeFileSync(path.join(dir, file), Buffer.from(ev.data, 'base64'))
    frames.push([file, ev.metadata.timestamp])
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 2200, maxHeight: 2300, everyNthFrame: 1 })
  return async () => {
    await cdp.send('Page.stopScreencast').catch(() => {})
    return frames
  }
}

// ---------- helpers ----------
async function point(page, loc, pause = 650) {
  await loc.evaluate((el) => {
    const r = el.getBoundingClientRect()
    if (r.top < 70 || r.bottom > innerHeight - 90) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  await sleep(450)
  const b = await loc.boundingBox()
  const x = b.x + b.width / 2
  const y = b.y + b.height / 2
  await page.evaluate(([x, y]) => window.__v?.move(x, y), [x, y])
  await sleep(pause)
  return { x, y }
}

async function tap(page, loc, after = 900) {
  const { x, y } = await point(page, loc)
  await page.evaluate(([x, y]) => window.__v?.rip(x, y), [x, y])
  await loc.click()
  await sleep(after)
}

const scrollTo = (page, top) => page.evaluate((top) => scrollTo({ top, behavior: 'smooth' }), top)

async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    console.log(`⚠️  Skipped part of "${name}": ${e.message.split('\n')[0]}`)
  }
}

// ---------- the demo ----------
async function record() {
  for (const role of ['student', 'manager']) {
    if (!fs.existsSync(path.join(AUTH, `${role}.json`))) throw new Error(`Run "npm run login:${role}" first.`)
  }
  const headless = !process.argv.includes('--show')

  async function open(role) {
    const browser = await launch(headless)
    const ctx = await browser.newContext({
      ...DEVICES[role],
      storageState: path.join(AUTH, `${role}.json`),
      locale: 'en-US',
      colorScheme: 'light',
    })
    await ctx.addInitScript(overlay, { touch: role === 'student' })
    const page = await ctx.newPage()
    page.on('dialog', (d) => d.accept())
    await page.goto(SITE)
    return { browser, page }
  }

  console.log('Opening the live site...')
  const student = await open('student')
  const manager = await open('manager')
  const S = student.page
  const M = manager.page
  await S.locator('button[aria-label^="Add:"]').first().waitFor({ timeout: 30000 })
  await M.getByRole('button', { name: 'Reports', exact: true }).waitFor({ timeout: 30000 })

  // Start from a clean state: orders open
  const resume = M.getByRole('button', { name: 'Resume', exact: true })
  if (await resume.isVisible()) await resume.click()
  await sleep(1500)

  console.log('Recording... (about 2 minutes, keep this window open)')
  const stopS = await startCast(S, 'student')
  const stopM = await startCast(M, 'manager')
  const t0 = Date.now() / 1000
  const caps = []
  const cap = (step, text) => {
    caps.push({ t: Date.now() / 1000, step, text })
    console.log(`  ${step} · ${text}`)
  }

  await sleep(1500)
  let plainName = null
  let plainCat = 0
  let orderId = null
  const cats = S.locator('main section div.overflow-x-auto > button')

  await step('menu', async () => {
    cap(1, 'Students order from their phone: real menu, allergen tags')
    await scrollTo(S, 260)
    await sleep(1500)
    if ((await cats.count()) > 1) {
      await tap(S, cats.nth(1), 1400)
      await tap(S, cats.nth(0), 900)
    }
  })

  await step('options', async () => {
    cap(2, 'Drinks have options and the price updates as you pick')
    const withOptions = S.locator('button[aria-label^="Add:"][aria-expanded]').first()
    if (!(await withOptions.count())) return
    await tap(S, withOptions, 900)
    const groups = S.locator('main li fieldset')
    const n = Math.min(await groups.count(), 3)
    for (let i = 0; i < n; i++) {
      const opts = groups.nth(i).locator('button[aria-pressed]')
      if ((await opts.count()) > 1) await tap(S, opts.nth(1), 700)
    }
    await tap(S, S.getByRole('button', { name: /^Add · / }), 1100)
  })

  await step('second item', async () => {
    const total = await cats.count()
    for (let i = 0; i < Math.max(total, 1); i++) {
      if (total > 1) await tap(S, cats.nth(i), 700)
      const plain = S.locator('button[aria-label^="Add:"]:not([aria-expanded])').first()
      if (await plain.count()) {
        plainName = (await plain.getAttribute('aria-label')).replace(/^Add:\s*/, '')
        plainCat = i
        await tap(S, plain, 1100)
        return
      }
    }
  })

  await step('order', async () => {
    cap(3, 'Pick a pickup time and place the order, pay at the counter')
    await tap(S, S.getByRole('button', { name: /View order/ }), 1500)
    const slots = S.locator('#cart fieldset button:not([disabled])')
    if ((await slots.count()) > 1) await tap(S, slots.nth(1), 900)
    const agree = S.locator('#cart input[type=checkbox]')
    if (await agree.isVisible().catch(() => false)) await tap(S, agree, 700)
    await tap(S, S.getByRole('button', { name: 'Place order', exact: true }), 300)
    await S.getByText('Order placed!').waitFor({ timeout: 20000 })
    orderId = (await S.locator('#cart p.text-6xl').innerText()).replace(/\D/g, '')
    await sleep(2200)
  })
  if (!orderId) throw new Error('The order was not placed, so the rest of the demo cannot run. Check the student window with --show.')

  const card = M.locator('article').filter({ hasText: new RegExp(`#${orderId}(?!\\d)`) }).first()

  await step('dashboard', async () => {
    cap(4, `Order #${orderId} appears on the café dashboard instantly`)
    await card.waitFor({ timeout: 20000 })
    await point(M, card, 1600)
    await scrollTo(S, 0)
    await sleep(1600)
  })

  await step('status', async () => {
    cap(5, 'Staff update the status and the student sees it live')
    await tap(M, card.getByRole('button', { name: 'Mark paid', exact: true }), 1300)
    await tap(M, card.getByRole('button', { name: 'Start preparing', exact: true }), 2800)
  })

  await step('receipt', async () => {
    cap(6, '80mm receipt for the thermal printer')
    await tap(M, card.getByRole('button', { name: 'Print', exact: true }), 300)
    await M.evaluate(() => document.documentElement.classList.add('vreceipt'))
    await sleep(3800)
    await M.evaluate(() => document.documentElement.classList.remove('vreceipt'))
    await sleep(600)
  })

  await step('ready', async () => {
    cap(7, 'Ready: the student gets a big ticket to show at the counter')
    await tap(M, card.getByRole('button', { name: 'Ready', exact: true }), 3800)
    cap(7, 'Picked up only after payment, then it leaves the board')
    await tap(M, card.getByRole('button', { name: 'Picked up', exact: true }), 2600)
  })

  await step('pause', async () => {
    cap(8, 'Pause online orders with one tap when the café is busy')
    await scrollTo(M, 0)
    await scrollTo(S, 0)
    await tap(M, M.getByRole('button', { name: 'Pause', exact: true }), 3200)
    await tap(M, M.getByRole('button', { name: 'Resume', exact: true }), 1500)
  })

  await step('sold out', async () => {
    if (!plainName) return
    cap(9, `Mark items sold out from the menu editor`)
    await tap(M, M.getByRole('button', { name: 'Menu', exact: true }), 1600)
    const row = M.locator('li').filter({ has: M.getByText(plainName, { exact: true }) }).first()
    const toggle = row.locator('button[aria-pressed]')
    await tap(M, toggle, 900)
    await S.reload()
    await S.locator('main section div.overflow-x-auto > button').first().waitFor({ timeout: 20000 })
    await sleep(600)
    if ((await cats.count()) > plainCat && plainCat > 0) await tap(S, cats.nth(plainCat), 600)
    const badge = S.locator('main li').filter({ hasText: plainName }).getByText('Sold out', { exact: true })
    await point(S, badge.first(), 2200)
    await tap(M, toggle, 1000) // back to available
  })

  await step('reports', async () => {
    cap(10, 'Sales reports by date and hour, with Excel export')
    await tap(M, M.getByRole('button', { name: 'Reports', exact: true }), 2000)
    await tap(M, M.getByRole('button', { name: 'Last 7 days', exact: true }), 2000)
    await tap(M, M.getByRole('button', { name: 'This month', exact: true }), 1800)
    await scrollTo(M, 650)
    await sleep(2200)
    await scrollTo(M, 0)
    await sleep(900)
  })

  await step('languages', async () => {
    cap(11, 'Turkish, English and Arabic, with a right-to-left layout')
    await scrollTo(S, 0)
    for (const lang of ['tr', 'ar', 'en']) {
      for (const page of [S, M]) {
        await tap(page, page.locator('button[aria-haspopup="true"]').first(), 500)
        await tap(page, page.locator(`button[lang="${lang}"]`), 300)
      }
      await sleep(lang === 'en' ? 900 : 2200)
    }
  })

  await step('theme', async () => {
    cap(12, 'Light and dark themes')
    for (const page of [S, M]) await tap(page, page.getByRole('button', { name: 'Switch to dark mode' }), 400)
    await sleep(2600)
  })

  const end = Date.now() / 1000
  const timeline = {
    site: SITE,
    t0,
    end,
    caps,
    orderId,
    streams: {
      student: { viewport: DEVICES.student.viewport, frames: await stopS() },
      manager: { viewport: DEVICES.manager.viewport, frames: await stopM() },
    },
  }
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(timeline))
  await student.browser.close()
  await manager.browser.close()
  console.log(`\n✅ Done. Saved ${timeline.streams.student.frames.length + timeline.streams.manager.frames.length} frames to out/.`)
  console.log(`   Real order #${orderId} was placed and completed on the live site.`)
  console.log('   Now tell Claude in the chat that the recording is finished.')
}

const [mode, role] = process.argv.slice(2)
if (mode === 'login') await login(role)
else if (mode === 'record') await record()
else console.log('Use: npm run login:student | npm run login:manager | npm run record')
