export interface FormulaCheckResult {
  valid: boolean
  error?: string
  tokens: string[]
}

const IDENTIFIER_RE = /[A-Za-z_][A-Za-z0-9_]*/g

export function checkFormula(formula: string, knownIds: Set<string>): FormulaCheckResult {
  const trimmed = formula.trim()
  if (!trimmed) return { valid: false, error: 'Formula is empty', tokens: [] }

  const openCount = (trimmed.match(/\(/g) ?? []).length
  const closeCount = (trimmed.match(/\)/g) ?? []).length
  if (openCount !== closeCount) {
    return { valid: false, error: 'Unbalanced parentheses', tokens: [] }
  }

  const tokens = trimmed.match(IDENTIFIER_RE) ?? []
  const unknown = tokens.filter((t) => !knownIds.has(t))
  if (unknown.length > 0) {
    return { valid: false, error: `Unknown reference: ${unknown.join(', ')}`, tokens }
  }
  if (tokens.length === 0) {
    return { valid: false, error: 'Formula must reference at least one driver or line item', tokens }
  }
  return { valid: true, tokens }
}

export function substituteNames(formula: string, idToName: Record<string, string>): string {
  return formula.replace(IDENTIFIER_RE, (tok) => idToName[tok] ?? tok)
}
