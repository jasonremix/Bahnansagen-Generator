# -*- coding: utf-8 -*-
"""Sprechertext für das jasonremix.de-Motion-Graphic.

Jede Szene besteht aus Sätzen. `say` ist die Lautschrift für die Stimme
(englische Begriffe werden eingedeutscht, damit Piper sie richtig spricht),
`text` ist der Satz, wie er in den Untertiteln steht.
"""

BPM = 150
FPS = 30

SCENES = [
    {"id": "intro", "label": "Intro", "lead": 2.4, "tail": 0.9, "lines": [
        ("Dschejsen Riemix.", "Jason Remix."),
        ("Hardtekno DJ. Musikproduzent. Künstler.", "Hardtechno DJ. Musikproduzent. Künstler."),
    ]},
    {"id": "tagline", "label": "Sound", "lead": 0.5, "tail": 0.8, "lines": [
        ("Energiegeladene Beats.", "Energiegeladene Beats."),
        ("Moderne Hardtekno-Saunds.", "Moderne Hardtechno-Sounds."),
        ("Unvergessliche Leif-Auftritte.", "Unvergessliche Live-Performances."),
    ]},
    {"id": "about", "label": "Über", "lead": 0.5, "tail": 0.9, "lines": [
        ("Hinter Dschejsen Riemix steht Dschejsen Bürger aus Brandenburg an der Hafel.",
         "Hinter Jason Remix steht Jason Bürger aus Brandenburg an der Havel."),
        ("Mit zwölf Jahren begann er, eigene Musik zu produzieren.",
         "Mit zwölf Jahren begann er, eigene Musik zu produzieren."),
        ("Seit zweitausenddreiundzwanzig veröffentlicht er professionell.",
         "Seit 2023 veröffentlicht er professionell."),
    ]},
    {"id": "why", "label": "Warum", "lead": 0.5, "tail": 0.9, "lines": [
        ("Mehr als nur ein DJ: ein unvergessliches Musikerlebnis.",
         "Mehr als nur ein DJ: ein unvergessliches Musikerlebnis."),
        ("Professionelle Leif-Auftritte. Eigene Produktionen. Moderner Hardtekno-Saund.",
         "Professionelle Live-Auftritte. Eigene Produktionen. Moderner Hardtechno-Sound."),
        ("Buchbar für jedes Iwent.", "Buchbar für jedes Event."),
    ]},
    {"id": "music", "label": "Musik", "lead": 0.5, "tail": 0.9, "lines": [
        ("Seine Tracks laufen auf Spottifai, Äppel Musik, Juhtjuhb, Saundklaud, Tiktok und Ämmasonn Musik.",
         "Seine Tracks laufen auf Spotify, Apple Music, YouTube, SoundCloud, TikTok und Amazon Music."),
        ("Darunter Wolke sieben, Distanz, Monster, Papa Pinguin und der Riemix von Saund of Sailens.",
         "Darunter Wolke 7, Distanz, Monster, Papa Pinguin und der Remix von Sound of Silence."),
    ]},
    {"id": "preview", "label": "Preview", "lead": 0.5, "tail": 0.9, "lines": [
        ("Und es kommt noch mehr.", "Und es kommt noch mehr."),
        ("Märchenland. Liebe. Herzschlag von mir. Bäcksiet. Und drei Tage wach.",
         "Märchenland. Liebe. Herzschlag von mir. Backseat. Und 3 Tage Wach."),
        ("Mehr Musik ist bereits in Arbeit.", "Mehr Musik ist bereits in Arbeit."),
    ]},
    {"id": "booking", "label": "Booking", "lead": 0.5, "tail": 0.9, "lines": [
        ("Dschejsen Riemix für Ihr Iwent.", "Jason Remix für Ihr Event."),
        ("Festivals, Clubs, Diskotheken, Firmen-Iwents, Ohpen-Ähr, private Feiern und exklusive Iwents.",
         "Festivals, Clubs, Diskotheken, Firmenevents, Open-Air, private Feiern und exklusive Events."),
        ("In Deutschland und ganz Europa.", "In Deutschland und ganz Europa."),
    ]},
    {"id": "coop", "label": "Kooperationen", "lead": 0.5, "tail": 0.9, "lines": [
        ("Gemeinsam mehr erreichen.", "Gemeinsam mehr erreichen."),
        ("Offen für Kooperationen mit Marken, Leebels, Festivalveranstaltern, Clubs, Agenturen und Unternehmen.",
         "Offen für Kooperationen mit Marken, Labels, Festivalveranstaltern, Clubs, Agenturen und Unternehmen."),
        ("Und offizieller Partner von Nord V P N.", "Und offizieller Partner von NordVPN."),
    ]},
    {"id": "community", "label": "Community", "lead": 0.5, "tail": 0.9, "lines": [
        ("Werde Teil der Kommjuniti.", "Werde Teil der Community."),
        ("Hundert Prozent Leidenschaft. Unendliche Kreativität. Eine Kommjuniti.",
         "100 % Leidenschaft. Unendliche Kreativität. Eine Community."),
    ]},
    {"id": "cta", "label": "Kontakt", "lead": 0.5, "tail": 5.0, "lines": [
        ("Bereit für das nächste unvergessliche Iwent?", "Bereit für das nächste unvergessliche Event?"),
        ("Jetzt buchen auf Dschejsenriemix punkt de.", "Jetzt buchen auf jasonremix.de."),
        ("Antwort innerhalb von vierundzwanzig bis achtundvierzig Stunden.",
         "Antwort innerhalb von 24 bis 48 Stunden."),
    ]},
]
