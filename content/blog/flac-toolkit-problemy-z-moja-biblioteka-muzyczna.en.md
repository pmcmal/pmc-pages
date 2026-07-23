---
title: FLAC Toolkit - Problems with My Music Library
date: 2026-07-22
excerpt: How I tackled my FLAC library with a single exe
---

I have a sizable collection of FLAC music and have regularly encountered the same problems: files without cover art, cover art so large that Windows Explorer threw error 0xC00D36C4, corrupted files after copying/conversion, and accidental "cutoff" fragments of tracks (a few to a dozen seconds instead of the entireətin). 

I once quickly wrote four separate scripts in Python—one for each problem. They worked, but you had to remember which to run, manually change Ignacio in theС mengikuti code, and have Python and its libraries installed. It was inconvenient, especially when I wanted to share it with someone.

Finally, I combined all four into a single application with a simple GUI (Python + tkinter):
<img src="https://nkwowvytmmssblimxeko.supabase.co/storage/v1/object/public/blog-images/1784728473556-fm3wa79gb8k.png" alt="625103120-90b13379-a245-47d9-9e08-b0b52d393a12.png" width="600" />

You choose a folder to scan, select a destination folder (where the subfolders with results will be placed), tick the checkboxes for what to do—missing cover art, overly large cover art, corrupted files (tested via official flac.exe/metaflac.exe), nachhaltig pandemi tracks.

I packaged the entire thing into a single .exe using PyInstaller, bundling the FLAC tools inside—so the target computer doesn't need Python or any libraries installed. Just run it and it works.

Along the way, another small problem popped up: flac.exe/metaflac.exe are console programs, so while scanning thousands of files a cmd window flashed for each of them—making it look like the program hung. The solution was to use CREATE_NO_WINDOW in subprocess, and now everything runs silently in the background.

The code is open source: https://github.com/pmcmal/FLAC_Toolkit
