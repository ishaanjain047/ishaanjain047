import { NavLink } from 'react-router-dom'

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
      {children}
    </svg>
  )
}

const icons = {
  treasury: (
    <Icon>
      <path d="M10 2l7 3.5v1H3v-1L10 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4 7v7M8 7v7M12 7v7M16 7v7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 17h15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Icon>
  ),
  models: (
    <Icon>
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 8.5h14M7.5 8.5V16" stroke="currentColor" strokeWidth="1.3" />
    </Icon>
  ),
  forecasting: (
    <Icon>
      <path d="M3 15l4-5 3 2.5L16 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  database: (
    <Icon>
      <ellipse cx="10" cy="5" rx="6" ry="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" stroke="currentColor" strokeWidth="1.3" />
    </Icon>
  ),
  drivers: (
    <Icon>
      <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7.5" cy="6" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13" cy="14" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.3" />
    </Icon>
  ),
}

const NAV = [
  { to: '/treasury', label: 'Treasury', icon: icons.treasury },
  { to: '/models', label: 'Cash Flow Models', icon: icons.models },
  { to: '/forecasts', label: 'Cash Forecasting', icon: icons.forecasting },
  { to: '/receivables', label: 'Account Receivables', icon: icons.database },
  { to: '/drivers', label: 'Driver Registry', icon: icons.drivers },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-sm font-semibold text-white">
          C
        </div>
        <span className="font-serif text-base text-ink-primary">ChargePoint</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-page text-ink-primary' : 'text-ink-secondary hover:bg-page/70 hover:text-ink-primary'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-ink-muted">Ishaan Jain</div>
    </aside>
  )
}
