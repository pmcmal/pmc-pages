---
title: DNAnalizator: dlaczego zbudowałem własne narzędzie do analizy DNA
date: 2026-07-22
excerpt: Zamiast wysyłać dane DNA rodziców do kolejnego serwisu w chmurze, napisałem własny, w pełni lokalny analizator — z prostym raportem, który realnie zachęca do zmiany nawyków, i szczegółowym, dla tych, którzy chcą zobaczyć źródła.
---

Zrobiliśmy z kolegą testy AncestryDNA i dostaliśmy surowe dane — pełny genotyp.

Pomyślałem: czemu nie wyciągnąć z tego czegoś więcej?

Problem: gotowe narzędzia albo są płatne, albo każą wgrać dane DNA na czyjś serwer.
To dane zdrowotne konkretnej osoby. Nie chciałem, żeby wyjeżdżały z dysku.

Zbudowałem własne narzędzie. Założenia były proste:
- Wszystko offline, lokalnie. Zero wysyłania danych gdziekolwiek.
- Tylko wyniki potwierdzone w literaturze naukowej. Nie mieszam dobrze zbadanego genu ryzyka z ciekawostką.
- Dwa raporty: szczegółowy (z nazwami genów, źródłami) i prosty (bez żargonu, z zachętą do zmian, nie tylko do strachu).

Po drodze odkryłem, że da się "dojść" do wyników, których test wprost nie mierzy — 
sprawdzając dobrze udokumentowane markery w pobliżu na genomie.

Kod jest otwarty. Jeśli komuś przyda się dla swoich testów — tym lepiej.
DNA i raporty oczywiście zostają poza repozytorium.

github.com/pmcmal/DNAnalizator

#DNA #Privacy #OpenSource #HealthTech
<img src="https://nkwowvytmmssblimxeko.supabase.co/storage/v1/object/public/blog-images/1784728506608-xll4uqtnps.png" alt="625117825-2506f16e-ed3f-44cf-baea-447276493dbe.png" width="600" />
