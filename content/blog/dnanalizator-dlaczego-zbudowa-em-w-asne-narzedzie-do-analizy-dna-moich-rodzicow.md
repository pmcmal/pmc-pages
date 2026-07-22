---
title: DNAnalizator: dlaczego zbudowałem własne narzędzie do analizy DNA moich rodziców
date: 2026-07-22
excerpt: Zamiast wysyłać dane DNA rodziców do kolejnego serwisu w chmurze, napisałem własny, w pełni lokalny analizator — z prostym raportem, który realnie zachęca do zmiany nawyków, i szczegółowym, dla tych, którzy chcą zobaczyć źródła.
---

Moi rodzice zrobili test AncestryDNA — z ciekawości, głównie pod kątem pochodzenia. Ale gdy dostali surowe dane, pomyślałem: skoro to jest w zasadzie ich pełny genotyp, dlaczego nie wyciągnąć z tego czegoś więcej niż procent szkockiej krwi?

Problem w tym, że gotowe narzędzia do tego (Promethease już nie działa, inne usługi albo każą płacić za subskrypcję, albo — co gorsza — każą wgrać dane DNA rodzica na czyjś serwer). A to nie jest byle plik. To dane zdrowotne konkretnej, żyjącej osoby, i to takiej, która mi ufa. Nie chciałem, żeby to gdziekolwiek wyjeżdżało z mojego dysku.

Więc zbudowałem własne narzędzie. Założenia były proste:

Wszystko lokalnie. Zero wysyłania danych gdziekolwiek. Analiza działa offline, na Twoim komputerze.
Tylko to, co potwierdzone w literaturze. Każdy wariant w bazie ma przypisaną siłę dowodów — nie miesza się dobrze zbadanego genu ryzyka zakrzepicy z ciekawostką o kolorze oczu, którą traktuje się z taką samą powagą.
Dwa raporty, bo to nie jest ta sama grupa odbiorców. Szczegółowy — z nazwami genów, źródłami, dla kogoś kto chce zweryfikować każdy wynik. I prosty — bez żargonu, w dużej czcionce, napisany tak, żeby realnie zachęcić do zmiany nawyku, a nie tylko postraszyć diagnozą, której i tak nikt nie postawi na podstawie samego DNA.
Po drodze wyszło więcej niż się spodziewałem — m.in. że da się częściowo "dojść" do wyników, których dany test wprost nie mierzy (np. Alzheimer/APOE), sprawdzając dobrze udokumentowane w nauce markery leżące w pobliżu na genomie, zamiast po prostu machnąć ręką, że "tego nie ma".

Kod jest open source — jeśli komuś przyda się do własnej rodziny, tym lepiej. Dane DNA i wygenerowane raporty oczywiście zostają poza repozytorium.

👉 github.com/pmcmal/DNAnalizator
