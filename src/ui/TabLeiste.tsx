import { IconHeute, IconPrognose, IconSchritte } from './Bausteine'

export type Tab = 'heute' | 'schritte' | 'prognose'

/** Untere Leiste wie im Design. Weitere Tabs (Budgets, Daten) kommen in späteren Phasen. */
const TABS: { id: Tab; name: string; Icon: () => React.JSX.Element }[] = [
  { id: 'heute', name: 'Heute', Icon: IconHeute },
  { id: 'schritte', name: 'Schritte', Icon: IconSchritte },
  { id: 'prognose', name: 'Prognose', Icon: IconPrognose },
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
