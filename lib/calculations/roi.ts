// ROI model for the marketing calculator demo. All assumptions are visible in the
// UI and adjustable; outputs are projections for a sample team, not promises.

export interface RoiInput {
  teamSize: number // engineers affected
  hourlyCostUsd: number // fully-loaded average cost per hour
  planningHoursPerWeek: number // hours/week lost to estimation churn, replanning, firefighting
  overrunRate: number // 0-1, share of sprints that historically overrun
  recoveryShare: number // 0-0.4, conservative share of lost time JiraVision can recover
  pricePerUserMonth: number // plan seat price, monthly billing
}

export interface RoiResult {
  currentLossUsd: number // annual cost of lost hours
  recoverableUsd: number // annual gross savings at the chosen recovery assumption
  overrunSavingsUsd: number // additional savings from fewer overruns (slipped-launch proxy)
  annualToolingUsd: number // JiraVision cost, monthly billing
  annualToolingUsdAnnual: number // JiraVision cost, annual billing (20% off)
  netSavingsUsd: number // recoverable + overrun − annual tooling (annual billing)
  multiple: number // savings ÷ cost
  paybackWeeks: number
}

const WEEKS_PER_YEAR = 46 // ~52 minus holidays/sick leave
const ANNUAL_DISCOUNT = 0.2
// Proxy: a lost sprint-week of an overrun sprint costs the team's weekly capacity.
const OVERRUN_WEEK_LOST_PER_YEAR = 4 // assume 4 slip-weeks/yr worth of delivery at risk

export function roiProjection(input: RoiInput): RoiResult {
  const seats = Math.max(1, Math.round(input.teamSize))
  const rate = Math.max(0, input.hourlyCostUsd)
  const lostHoursYear = Math.max(0, input.planningHoursPerWeek) * WEEKS_PER_YEAR * seats
  const currentLossUsd = lostHoursYear * rate

  const recovery = Math.min(0.4, Math.max(0, input.recoveryShare))
  const recoverableUsd = currentLossUsd * recovery

  const overrun = Math.min(1, Math.max(0, input.overrunRate))
  const overrunSavingsUsd = OVERRUN_WEEK_LOST_PER_YEAR * overrun * seats * 40 * rate

  const monthly = Math.max(0, input.pricePerUserMonth)
  const annualToolingUsd = seats * monthly * 12
  const annualToolingUsdAnnual = annualToolingUsd * (1 - ANNUAL_DISCOUNT)

  const grossSavings = recoverableUsd + overrunSavingsUsd
  const netSavingsUsd = grossSavings - annualToolingUsdAnnual
  const multiple = annualToolingUsdAnnual > 0 ? grossSavings / annualToolingUsdAnnual : 0
  const weeklyNet = grossSavings / WEEKS_PER_YEAR - annualToolingUsdAnnual / WEEKS_PER_YEAR
  const paybackWeeks = weeklyNet > 0 ? Math.max(1, Math.round(annualToolingUsdAnnual / weeklyNet)) : 0

  return {
    currentLossUsd,
    recoverableUsd,
    overrunSavingsUsd,
    annualToolingUsd,
    annualToolingUsdAnnual,
    netSavingsUsd,
    multiple,
    paybackWeeks,
  }
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}
