# 🕳️ Singularität

Ein Idle-Clicker fürs iPhone, gebaut als Web-App (PWA): Du bist ein winziges Schwarzes Loch und verschlingst das Universum.

**Spielen:** https://richardbarbat.github.io/sternenstaub/

## So spielt es sich

- **Tippen** saugt Materie an. Manche Tipps sind **kritische Treffer** (×10).
- **Schnell tippen** füllt die Hunger-Leiste – ist sie voll, folgt ein **Fressrausch** (alles ×5).
- **Beute** fliegt vorbei: Gesteinsbrocken, Kometen, Satelliten, goldene Kometen mit Effekten und Kapseln.
- Himmelskörper im **Orbit** kreisen ums Loch und füttern es weiter – auch offline.
- **Ereignisse:** Asteroidenschwarm, Großbeute (rechtzeitig zerreißen) und ein Rivale, der Masse absaugt.
- **Fähigkeiten:** Sog, Jet und Zeitdehnung, mit Abklingzeit.
- **Kapseln** und die **Tagesbeute** bringen Masse, Boni, Himmelskörper und Dunkle Materie.
- Das Loch **wächst** in 15 Stufen; ein **Urknall** startet neu mit Dunkler Materie, die im **Labor** dauerhafte Forschung bezahlt.
- **Tagesziele** bringen jeden Tag Kapseln. Ein Tipp auf den offenen Reiter blendet das Menü aus.

## Auf dem iPhone installieren

1. Die Adresse oben in **Safari** öffnen.
2. Auf **Teilen** tippen, dann auf **„Zum Home-Bildschirm“**.
3. Singularität vom Home-Bildschirm starten – ab jetzt läuft es auch ganz ohne Internet.

Der Spielstand wird auf dem Gerät gespeichert. Unter **Mehr → Exportieren** lässt er sich als Code sichern.

## Entwicklung

Reines HTML/CSS/JavaScript ohne Build-Schritt:

- `js/data.js` – Zahlen, Himmelskörper, Upgrades, Erfolge, Stufen, Beute, Kapseln
- `js/fx.js` – Grafik (Schwarzes Loch, Scheibe, Orbit, Effekte), Töne, Vibration
- `js/action.js` – Beute, Krits, Fressrausch, Ereignisse, Fähigkeiten, Kapseln, Tagesbeute
- `js/game.js` – Spielstand, Wirtschaft, Oberfläche, Spielschleife, Updates

Lokal starten:

```bash
python -m http.server 8765
```

Bei jeder Änderung die Version erhöhen, damit installierte Apps das Update laden:

```bash
node version.mjs 3.0
```

Das Skript setzt die Version in `js/game.js`, `sw.js`, `version.json` und in den `?v=`-Angaben der `index.html`.
Die App lädt online immer zuerst vom Netz (Offline-Kopie nur als Rückfall) und prüft beim Start und bei jeder
Rückkehr in den Vordergrund `version.json`.
