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

Bei Änderungen die Versionsnummer `CACHE` in `sw.js` erhöhen, damit installierte Apps das Update laden.
