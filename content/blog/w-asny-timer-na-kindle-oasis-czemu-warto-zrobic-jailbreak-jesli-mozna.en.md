---
title: Custom Timer on Kindle Oasis (Why It's Worth Jailbreaking If You Still Can)
date: 2026-07-22
excerpt: How I Built My Own Timer on Kindle (And Why You Should Unlock It)
---

I've always liked tinkering with my gear — Linux, code, small projects.
So when it came to my Kindle, I couldn't resist.

I wanted to read PDFs and EPUBs without restrictions. Jailbreaking the Kindle gives you system access — you can install your own apps alongside the reader. The community (kindlemodding.org) has been working on this for years, and on the 10th gen Oasis it works flawlessly.

How it works:
Kindle has a mechanism for web apps called Mesquite — it takes HTML, JS, CSS and wraps them so the system sees it as a full-fledged app (icon, bar, registration in the database).

I started experimenting. I wrote myself a work timer — wanted one for ages. You enter a start time, the app counts 8 hours forward and shows live how much is left.

Plus a shell script that:
- copies the app to a new folder (so WebKit doesn't serve the old one from cache)
- registers it in the appreg.db database
- cleans up old copies
- launches it

It all works offline, no account, no cloud. E-ink screen, week of battery, zero notifications — exactly what I wanted.

Will I use it daily? Don't know. But I proved to myself it's possible.

Code is open source if anyone wants to play with it or adapt for their shift: github.com/pmcmal/kindle-work-timer<img src="https://nkwowvytmmssblimxeko.supabase.co/storage/v1/object/public/blog-images/1784728409372-bz6cp5425u5.jpg" alt="625103575-5096d133-3f7e-4001-8945-e8457c5e304b.jpg" width="600" />
#Kindle #Linux #OpenSource #DIY
