# ✨ Sternenstaub

Ein gemütlicher Idle-Clicker unter den Sternen, gebaut als Web-App (PWA) fürs iPhone.

**Spielen:** https://richardbarbat.github.io/sternenstaub/

## Auf dem iPhone installieren

1. Die Adresse oben in **Safari** öffnen.
2. Auf **Teilen** tippen, dann auf **„Zum Home-Bildschirm“**.
3. Sternenstaub vom Home-Bildschirm starten – ab jetzt läuft es auch ganz ohne Internet.

Der Spielstand wird auf dem Gerät gespeichert. Unter **Mehr → Exportieren** lässt er sich als Code sichern.

## Entwicklung

Reines HTML/CSS/JavaScript ohne Build-Schritt. Lokal starten:

```bash
python -m http.server 8765
```

Bei jeder Änderung die Version erhöhen, damit installierte Apps das Update laden:

```bash
node version.mjs 1.3
```

Das Skript setzt die Version in `js/game.js`, `sw.js`, `version.json` und in den `?v=`-Angaben der `index.html`.
Die App lädt online immer zuerst vom Netz (Offline-Kopie nur als Rückfall) und prüft beim Start und bei jeder
Rückkehr in den Vordergrund `version.json`.
