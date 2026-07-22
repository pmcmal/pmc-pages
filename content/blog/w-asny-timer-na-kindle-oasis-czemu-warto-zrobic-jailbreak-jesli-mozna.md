---
title: Własny timer na Kindle Oasis (czemu warto zrobić jailbreak jeśli można)
date: 2026-07-22
excerpt: Jak zrobiłem swój własny timer na Kindle'u (i czemu warto go odblokować)
---

Miałem prosty problem: w pracy chciałem widzieć, ile mi zostało do końca zmiany, bez odpalania telefonu i bez powiadomień, które przy okazji zawsze mnie rozpraszają na 20 minut. E-ink Kindle'a wydawał się idealny — nic nie miga, bateria trzyma tygodniami, ekran czytelny w każdym świetle. Jedyny problem: to czytnik, a nie kalkulator zmian.

Rozwiązanie: odblokowany Kindle (jailbreak) daje dostęp do systemu pod spodem i pozwala instalować własne aplikacje obok czytnika e-booków. Amazon oficjalnie tego nie przewiduje, ale społeczność (polecam kindlemodding.org) rozpracowała to od dawna — na Oasisie 10. generacji, na którym testowałem, działa to bez problemu.

Jak to zbudowałem:
Kindle ma swój mechanizm na apki webowe zwany Mesquite — w skrócie: strona HTML/JS/CSS opakowana tak, żeby system traktował ją jak pełnoprawną aplikację (własna ikona, własny pasek na górze, można ją "zarejestrować" w bazie urządzenia). Więc moja appka to zwykły index.html + main.js + main.css — wpisujesz godzinę startu zmiany, appka liczy 8h do przodu i pokazuje na żywo ile zostało (albo "koniec, możesz iść!" 🙂).

Do tego mały skrypt shellowy, który przy każdym uruchomieniu:

kopiuje appkę do świeżego, ostemplowanego czasem folderu (żeby WebKit na Kindle'u nie serwował starej wersji z cache — koszmar przy iterowaniu),
rejestruje ją w bazie appreg.db przez sqlite3,
sprząta stare kopie,
i od razu odpala apkę przez lipc-set-prop.
Całość działa lokalnie, offline, bez żadnych kont ani chmury — dokładnie tak, jak chciałem.

Czemu warto odblokować Kindle'a: bo wtedy to nie jest już tylko czytnik narzucony przez producenta, tylko mały, energooszczędny komputerek z ekranem, na którym da się zrobić dosłownie cokolwiek — timer, quizy do nauki (jak wspomniane KAnki/KWordle, na których się wzorowałem), dashboard, cokolwiek. E-ink + tydzień na baterii + zero powiadomień to kombinacja, której próżno szukać gdzie indziej.

Kod jest open source, jakby ktoś chciał się pobawić albo dostosować pod swoją zmianę: github.com/pmcmal/kindle-work-timer
