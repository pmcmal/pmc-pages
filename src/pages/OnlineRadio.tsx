"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Station {
  id: string;
  name: string;
  description: string;
  genre: string;
  url: string;
  bitrate: string;
  color: string;
}

const stations: Station[] = [
  {
    id: 'chillout',
    name: 'Chillout Lounge',
    description: 'Spokojny chillout do relaksu i nocnego słuchania',
    genre: 'Chillout / Lounge',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    bitrate: '128 kbps',
    color: 'from-emerald-400/40 to-sky-400/40',
  },
  // Możesz dodać więcej stacji tutaj
];

const OnlineRadio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const lastVolumeBeforeMute = useRef(0.8);
  const [statusText, setStatusText] = useState('offline');
  const [statusColor, setStatusColor] = useState('text-slate-400');
  const [statusDotColor, setStatusDotColor] = useState('bg-slate-500');

  const updateStatus = useCallback((text: string, color: string, dotColor: string) => {
    setStatusText(text);
    setStatusColor(color);
    setStatusDotColor(dotColor);
  }, []);

  const updateVolumeIcon = useCallback(() => {
    const v = audioRef.current?.volume || 0;
    if (v === 0) return VolumeX;
    if (v < 0.4) return Volume1;
    return Volume2;
  }, []);

  const playStream = useCallback(() => {
    if (!currentStation || !audioRef.current) return;

    setIsBuffering(true);
    updateStatus('łączenie...', 'text-amber-300', 'bg-amber-300');

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        updateStatus('online', 'text-emerald-300', 'bg-emerald-400');
      })
      .catch((err) => {
        console.error('Błąd odtwarzania:', err);
        setIsPlaying(false);
        setIsBuffering(false);
        updateStatus('błąd odtwarzania', 'text-rose-300', 'bg-rose-400');
      });
  }, [currentStation, updateStatus]);

  const pauseStream = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      updateStatus('wstrzymane', 'text-slate-400', 'bg-slate-500');
    }
  }, [updateStatus]);

  const selectStation = useCallback(
    (id: string) => {
      const station = stations.find((s) => s.id === id);
      if (!station) return;

      const isSameStation = currentStation && currentStation.id === station.id;
      const shouldAutoplay = !isSameStation || !isPlaying;

      setCurrentStation(station);

      if (audioRef.current) {
        audioRef.current.src = station.url;
        audioRef.current.load();
      }

      if (shouldAutoplay) {
        playStream();
      }
    },
    [currentStation, isPlaying, playStream],
  );

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.preload = 'none';
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleWaiting = () => {
      if (!audio.paused) {
        setIsBuffering(true);
        updateStatus('buforowanie...', 'text-amber-300', 'bg-amber-300');
      }
    };
    const handlePlaying = () => {
      setIsBuffering(false);
      updateStatus('online', 'text-emerald-300', 'bg-emerald-400');
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (!audio.ended) {
        setIsBuffering(false);
        updateStatus('wstrzymane', 'text-slate-400', 'bg-slate-500');
        setIsPlaying(false);
      }
    };
    const handleError = () => {
      setIsBuffering(false);
      updateStatus('błąd / offline', 'text-rose-300', 'bg-rose-400');
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      updateStatus('zakończone', 'text-slate-400', 'bg-slate-500');
    };

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = ''; // Clear src to stop loading
    };
  }, [volume, updateStatus]);

  const handlePlayPauseClick = () => {
    if (!currentStation) {
      selectStation(stations[0].id);
      return;
    }
    if (audioRef.current?.paused) {
      playStream();
    } else {
      pauseStream();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setVolume(newValue);
    if (audioRef.current) {
      audioRef.current.volume = newValue;
    }
    if (newValue > 0) {
      lastVolumeBeforeMute.current = newValue;
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      if (audioRef.current.volume === 0) {
        audioRef.current.volume = lastVolumeBeforeMute.current || 0.8;
        setVolume(audioRef.current.volume);
      } else {
        lastVolumeBeforeMute.current = audioRef.current.volume || 0.8;
        audioRef.current.volume = 0;
        setVolume(0);
      }
    }
  };

  const VolumeIconComponent = updateVolumeIcon();

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-xl w-full py-10">
        <header className="mb-8 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.25em] uppercase text-slate-400 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            live stream
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50 tracking-tight mb-2">
            PMC&nbsp;Radio <span className="text-sky-400">Online</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Wybierz stację, wciśnij play i słuchaj bez przerwy w eleganckim, ciemnym stylu.
          </p>
        </header>

        <main className="glass rounded-3xl px-6 sm:px-8 py-7 sm:py-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 w-52 h-52 rounded-full bg-sky-500/10 blur-3xl"></div>
          <div className="pointer-events-none absolute -left-24 -bottom-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"></div>

          <section className="relative z-10 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400 mb-1">teraz gra</p>
                <h2 id="station-name" className="text-xl sm:text-2xl font-semibold text-slate-50 mb-1">
                  {currentStation ? currentStation.name : 'Wybierz stację'}
                </h2>
                <p id="station-genre" className="text-xs text-slate-400">
                  {currentStation ? `${currentStation.genre} • ${currentStation.description}` : 'Kliknij jedną ze stacji poniżej.'}
                </p>
              </div>
              <div className="flex flex-col items-end text-right text-[0.65rem] text-slate-400 mt-1">
                <span id="status-indicator" className={`inline-flex items-center gap-1 ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`}></span>
                  {statusText}
                </span>
                {isBuffering && <span id="buffering-indicator" className="text-amber-300 mt-1">buforowanie...</span>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-center gap-4">
                <Button
                  id="play-pause-btn"
                  onClick={handlePlayPauseClick}
                  className="btn-main relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/90 border border-slate-600/80 shadow-lg shadow-emerald-500/20 text-slate-50 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" id="pause-icon" />
                  ) : (
                    <Play className="w-7 h-7" id="play-icon" />
                  )}
                  {isPlaying && <span id="pulse-ring" className="pulse-ring"></span>}
                </Button>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">głośność</p>
                  <div className="flex items-center gap-2">
                    <Button id="mute-btn" onClick={handleMuteToggle} variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100 transition-colors">
                      <VolumeIconComponent className="w-5 h-5" id="volume-icon" />
                    </Button>
                    <input
                      id="volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="slider w-32 sm:w-40"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Jakość <span className="text-slate-200 font-medium">AAC / MP3</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span id="bitrate-label">{currentStation ? currentStation.bitrate : '0 kbps'}</span>
                </div>
              </div>
            </div>

            <section className="mt-2 space-y-3">
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">stacje</p>
              <div id="station-list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stations.map((station) => (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => selectStation(station.id)}
                    className={`group relative flex flex-col items-start gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-left transition-all
                      hover:border-sky-400/80 hover:bg-slate-900/90 hover:shadow-md hover:shadow-sky-500/20
                      ${currentStation?.id === station.id ? 'station-active' : ''}`}
                  >
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${station.color} opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none`}></div>
                    <div className="relative flex items-center justify-between w-full gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-100 flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/70 bg-slate-950 text-[0.6rem] text-slate-300">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(74,222,128,0.9)]"></span>
                          </span>
                          {station.name}
                        </p>
                        <p className="text-[0.68rem] text-slate-400 mt-0.5">{station.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-600/70">
                          {station.genre}
                        </span>
                        <span className="text-[0.65rem] text-slate-500">{station.bitrate}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <footer className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[0.7rem] text-slate-500">
              <span>
                Uwaga: niektóre stacje mogą być chwilowo niedostępne.
              </span>
              <span className="text-slate-500/90">Stworzone przez Paweł Malec.</span>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
};

export default OnlineRadio;