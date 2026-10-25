import { APP_NAME } from './config'
import './App.css'

// Platzhalter, bis in Schritt 3 die echten Screens Start, Analyse und Ergebnis kommen.
export default function App() {
  return (
    <main className="seite">
      <header className="kopf">
        <p className="app-name">{APP_NAME}</p>
      </header>

      <h1 className="titel">Wohin geht dein Geld?</h1>
      <p className="einleitung">
        Das Grundgerüst steht. Die Screens Start, Analyse und Ergebnis kommen als Nächstes.
      </p>

      <section className="karte">
        <p className="label">Stand</p>
        <p className="gut">✓ Vite, React und TypeScript laufen</p>
        <p className="gut">✓ Schriften und Farben aus dem Design</p>
        <p className="gut">✓ Installierbar und offline nutzbar</p>
      </section>
    </main>
  )
}
