import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PlanPanel } from '../app/routes/[id]/PlanPanel'
import { buildPlan } from './engine'
const input = { date: '2026-07-15', timezone: 'America/Los_Angeles', lat: 37, lng: -118, elevM: 3000,
  segments: [], partySize: 2, stormCutoffMin: 840, marginMin: 60 }
const noop = () => {}
function render(ready: boolean) {
  return renderToStaticMarkup(createElement(PlanPanel, { ...input, ready, plan: buildPlan(input),
    onDate: noop, onPartySize: noop, onStormCutoff: noop, onMargin: noop }))
}
it('does not recommend departure or a checkpoint for an incomplete route', () => {
  const html = render(false)
  expect(html).toContain('complete their measurements')
  expect(html).not.toContain('Start route')
  expect(html).not.toContain('Checkpoint deadline')
  expect(html).not.toContain('Storm-bound')
})
it('uses route-neutral wording when a plan is ready', () => {
  const html = render(true)
  expect(html).toContain('Start route')
  expect(html).toContain('Checkpoint deadline')
  expect(html).toContain('Total route time')
  expect(html).not.toContain('Leave the car')
})
