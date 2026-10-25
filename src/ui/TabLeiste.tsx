import { IconBudgets, IconDaten, IconHeute, IconPrognose, IconSchritte } from './Bausteine'

export type Tab = 'heute' | 'schritte' | 'prognose' | 'budgets' | 'daten'

/** Untere Leiste wie im Design: alle fünf Tabs. */
const TABS: { id: Tab; name: string; Icon: () => React.JSX.Element }[] = [
  { id: 'heute', name: 'Heute', Icon: IconHeute },
  { id: 'schritte', name: 'Schritte', Icon: IconSchritte },
  { id: 'prognose', name: 'Prognose', Icon: IconPrognose },
  { id: 'budgets', name: 'Budgets', Icon: IconBudgets },
  { id: 'daten', name: 'Daten', Icon: IconDaten },
]

export function TabLeiste({ aktiv, onWechsel }: { aktiv: Tab; onWechsel: (tab: Tab) => void }) {
  return (
    <nav className="tableiste" aria-label="Hauptnavigation">
      {TABS.map(({ id, name, Icon }) => (
        <button
          key={id}
          type="button"
          className={id === aktiv ? 'tableiste__tab tableiste__tab--aktiv' : 'tableiste__tab'}
          aria-current={id === aktiv ? 'page' : undefined}
          onClick={() => onWechsel(id)}
        >
          <Icon />
          {name}
        </button>
      ))}
    </nav>
  )
}
