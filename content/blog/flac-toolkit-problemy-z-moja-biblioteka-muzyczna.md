---
title: FLAC Toolkit - problemy z moją biblioteką muzyczną
date: 2026-07-22
excerpt: Jak ogarnąłem swoją bibliotekę FLAC jednym exe
---

Mam sporą kolekcję muzyki w FLAC i regularnie łapałem w niej te same problemy: pliki bez okładki, okładki tak duże, że Windows Explorer rzucał błędem 0xC00D36C4, uszkodzone pliki po kopiowaniu/konwersji oraz przypadkowe "urwane" fragmenty utworów (kilka-kilkanaście sekund zamiast całej piosenki).

Napisałem sobie kiedyś na szybko cztery osobne skrypty w Pythonie — każdy do jednego problemu. Działały, ale trzeba było pamiętać, który uruchomić, ręcznie zmieniać ścieżki w kodzie i mieć zainstalowanego Pythona z bibliotekami. Niewygodne, zwłaszcza jak chciałem to komuś podesłać.

W końcu połączyłem wszystkie cztery w jedną aplikację z prostym GUI (Python + tkinter):
<img src="https://nkwowvytmmssblimxeko.supabase.co/storage/v1/object/public/blog-images/1784728473556-fm3wa79gb8k.png" alt="625103120-90b13379-a245-47d9-9e08-b0b52d393a12.png" width="600" />


wybierasz folder do przeskanowania,
wybierasz folder docelowy (tam lądują podfoldery z wynikami),
zaznaczasz checkboxy, co ma zrobić — brak okładki, zbyt duże okładki, uszkodzone pliki (test przez oficjalne flac.exe/metaflac.exe), zbyt krótkie utwory.
Całość spakowałem PyInstallerem do jednego pliku .exe, razem z narzędziami FLAC-a wbudowanymi w środek — więc na docelowym komputerze nie trzeba instalować ani Pythona, ani żadnych bibliotek. Odpalasz i działa.

Po drodze wyszedł jeszcze jeden mały problem: flac.exe/metaflac.exe to programy konsolowe, więc przy skanowaniu tysięcy plików na ekranie migało okno cmd dla każdego z nich — wyglądało to, jakby program się zawiesił. Rozwiązanie: CREATE_NO_WINDOW w subprocess, i już wszystko chodzi w tle bez migania.

Kod jest open source: github.com/pmcmal/FLAC_Toolkit
