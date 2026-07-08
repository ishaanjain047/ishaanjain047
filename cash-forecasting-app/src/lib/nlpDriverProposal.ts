// Deliberately simple pattern-matcher standing in for the agent's NLP recognition
// (Section 5 of the incremental spec). Recognizes prompts describing a line item as a
// percentage — or percentage range — of another driver applied over time, and proposes
// the two-driver pattern: a Manual Series base driver plus a Collection Curve driver
// referencing it. This is a deliberate default per Section 5.2, not a fallback for lack
// of information.

export interface PercentOfProposal {
  lineItemName: string
  baseDriverName: string
  percentageLow: number
  percentageHigh: number
}

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const STOPWORDS_AFTER_BASE = /\b(that|which|over|each|every|this|per|,|\.).*$/i

export function parsePercentOfPrompt(text: string): PercentOfProposal | null {
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*%\s+of\s+(?:the\s+)?([a-z][a-z\s]*)/i)
  const singleMatch = !rangeMatch ? text.match(/(\d+(?:\.\d+)?)\s*%\s+of\s+(?:the\s+)?([a-z][a-z\s]*)/i) : null
  const match = rangeMatch ?? singleMatch
  if (!match) return null

  const low = parseFloat(match[1])
  const high = rangeMatch ? parseFloat(match[2]) : low
  const rawBaseName = (rangeMatch ? rangeMatch[3] : singleMatch![2]).replace(STOPWORDS_AFTER_BASE, '')
  const baseDriverName = titleCase(rawBaseName || 'Base Value')

  const aboutMatch = text.match(/\babout\s+([a-z][a-z\s]*?)(?:,|\bthat\b|\bwill\b|\bis\b|$)/i)
  const lineItemName = aboutMatch ? titleCase(aboutMatch[1]) : titleCase(baseDriverName) + ' Collections'

  return { lineItemName, baseDriverName, percentageLow: low, percentageHigh: high }
}

export function inferCategory(text: string): 'receipts' | 'disbursements' {
  const disbursementWords = /\b(payment|expense|outflow|disbursement|payable|cost|payroll)\b/i
  return disbursementWords.test(text) ? 'disbursements' : 'receipts'
}
