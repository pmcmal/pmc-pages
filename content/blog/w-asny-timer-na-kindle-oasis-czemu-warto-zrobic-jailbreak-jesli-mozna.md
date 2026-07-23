---
title: Własny timer na Kindle Oasis (czemu warto zrobić jailbreak jeśli jeszcze możesz)
date: 2026-07-22
excerpt: Jak zrobiłem swój własny timer na Kindle'u (i czemu warto go odblokować)
---

Zawsze lubiłem grzebać w swoim sprzęcie — Linux, kod, małe projekty.
Więc kiedy przyszło do Kindle'a, nie mogłem się oprzeć.

Chciałem czytać PDF-y i EPUB-y bez ograniczeń. Jailbreak Kindle'a daje dostęp 
do systemu — możesz instalować własne aplikacje obok czytnika. 
Społeczność (kindlemodding.org) rozpracowała to od lat, na Oasisie 10. gen działa bez problemu.

Jak to działa:
Kindle ma mechanizm na aplikacje webowe zwany Mesquite — bierze HTML, JS, CSS 
i opakuje to tak, żeby system widział to jako pełnoprawną apkę (ikona, pasek, 
rejestracja w bazie).

Zacząłem eksperymentować. Napisałem sobie timer do zmiany — od dawna go chciałem.
Wpisujesz godzinę startu, aplikacja liczy 8 godzin do przodu i pokazuje na żywo 
ile zostało.

Do tego shell script, który:
- kopuje appkę do nowego folderu (żeby WebKit nie serwował starej z cache)
- rejestruje ją w bazie appreg.db
- sprząta stare kopie
- odpala ją

Całość działa offline, bez konta, bez chmury. Ekran e-ink, tydzień baterii, 
zero powiadomień — dokładnie to chciałem mieć.

Czy będę go używać na co dzień? Nie wiem. Ale pokazałem sobie, że się da.

Kod jest open source, jakby ktoś chciał się pobawić albo dostosować pod swoją zmianę: github.com/pmcmal/kindle-work-timer<img src="https://nkwowvytmmssblimxeko.supabase.co/storage/v1/object/public/blog-images/1784728409372-bz6cp5425u5.jpg" alt="625103575-5096d133-3f7e-4001-8945-e8457c5e304b.jpg" width="600" />
#Kindle #Linux #OpenSource #DIY
