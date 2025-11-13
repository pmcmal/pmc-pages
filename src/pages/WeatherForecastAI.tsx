"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudSun, Search, MapPin, Thermometer, Droplet, Wind, Gauge, LineChart, CalendarDays, Lightbulb, Clock, Sun, Cloud, CloudRain } from 'lucide-react';

const WeatherForecastAI = () => {
    const [cityInput, setCityInput] = useState<string>('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<string>('');

    // Symulowane dane pogodowe (do zastąpienia prawdziwym API)
    const getSimulatedWeather = (city: string) => {
        const data = {
            'Warszawa': {
                temp: 15, feels: 13, humidity: 65, wind: 12, pressure: 1013,
                description: 'częściowe zachmurzenie', icon: 'CloudSun'
            },
            'Kraków': {
                temp: 18, feels: 17, humidity: 55, wind: 8, pressure: 1015,
                description: 'słonecznie', icon: 'Sun'
            },
            'Gdańsk': {
                temp: 12, feels: 10, humidity: 75, wind: 18, pressure: 1010,
                description: 'deszczowo', icon: 'CloudRain'
            }
        };

        if (data[city as keyof typeof data]) {
            return data[city as keyof typeof data];
        } else {
            // Generuj losowe dane dla nieznanych miejscowości
            const randomTemp = Math.floor(Math.random() * 25) + 5;
            const randomDesc = ['słonecznie', 'częściowe zachmurzenie', 'pochmurno', 'deszczowo'][Math.floor(Math.random() * 4)];
            const randomIcon = ['Sun', 'CloudSun', 'Cloud', 'CloudRain'][Math.floor(Math.random() * 4)];
            return {
                temp: randomTemp,
                feels: randomTemp - 2,
                humidity: Math.floor(Math.random() * 40) + 40,
                wind: Math.floor(Math.random() * 20) + 5,
                pressure: Math.floor(Math.random() * 20) + 1000,
                description: randomDesc,
                icon: randomIcon
            };
        }
    };

    const getWeather = () => {
        if (!cityInput.trim()) {
            setError('Proszę wpisać nazwę miejscowości');
            setWeatherData(null);
            return;
        }

        setError('');
        setLoading(true);
        setWeatherData(null); // Wyczyść poprzednie dane

        // Symulacja opóźnienia API
        setTimeout(() => {
            const weather = getSimulatedWeather(cityInput.trim());
            setWeatherData({ city: cityInput.trim(), ...weather });
            setLoading(false);
        }, 1000);
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('pl-PL'));
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const renderWeatherIcon = (iconName: string) => {
        const IconComponent = {
            CloudSun, Sun, Cloud, CloudRain,
        }[iconName as keyof typeof import('lucide-react')];

        return IconComponent ? <IconComponent className="text-yellow-300" size={64} /> : null;
    };

    const renderAnalysis = () => {
        if (!weatherData) return null;
        const analysis = [];

        if (weatherData.temp < 10) {
            analysis.push('🌡️ <strong>Niska temperatura</strong> - Ubierz się ciepło, zalecana kurtka i czapka.');
        } else if (weatherData.temp > 25) {
            analysis.push('🌡️ <strong>Wysoka temperatura</strong> - Pamiętaj o nawodnieniu i ochronie przed słońcem.');
        } else {
            analysis.push('🌡️ <strong>Przyjemna temperatura</strong> - Idealne warunki do spacerów i aktywności na świeżym powietrzu.');
        }

        if (weatherData.humidity > 70) {
            analysis.push('💧 <strong>Wysoka wilgotność</strong> - Powietrze jest ciężkie, może zwiększać uczucie gorąca.');
        } else if (weatherData.humidity < 30) {
            analysis.push('💧 <strong>Niska wilgotność</strong> - Powietrze jest suche, zalecane nawilżanie skóry.');
        }

        if (weatherData.wind > 20) {
            analysis.push('💨 <strong>Silny wiatr</strong> - Uważaj podczas jazdy na rowerze, trzymaj się mocno parasola.');
        }

        if (weatherData.pressure < 1000) {
            analysis.push('📊 <strong>Niskie ciśnienie</strong> - Mogą wystąpić bóle głowy u osób wrażliwych.');
        } else if (weatherData.pressure > 1020) {
            analysis.push('📊 <strong>Wysokie ciśnienie</strong> - Dobre warunki dla sportowców.');
        }

        return (
            <div className="glass-effect rounded-2xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                    <LineChart className="inline-block mr-2" size={24} />
                    Inteligentna Analiza Pogody
                </h3>
                <div className="text-purple-100 space-y-3" dangerouslySetInnerHTML={{ __html: analysis.join('<br>') }}></div>
            </div>
        );
    };

    const renderForecast = () => {
        if (!weatherData) return null;
        const forecastCards = [];
        const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
        const icons = ['Sun', 'CloudSun', 'Cloud', 'CloudRain', 'CloudSun']; // Nazwy ikon Lucide

        for (let i = 0; i < 5; i++) {
            const temp = Math.floor(Math.random() * 15) + 10;
            const IconComponent = { Sun, CloudSun, Cloud, CloudRain }[icons[i] as keyof typeof import('lucide-react')];
            forecastCards.push(
                <div key={i} className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition-colors">
                    <p className="text-purple-200 font-semibold mb-2">{days[i]}</p>
                    <div className="text-3xl mb-2">
                        {IconComponent ? <IconComponent className="text-yellow-300 mx-auto" size={32} /> : null}
                    </div>
                    <p className="text-2xl font-bold text-white">{temp}°C</p>
                    <p className="text-sm text-purple-200 mt-1">{Math.floor(Math.random() * 30) + 40}%</p>
                </div>
            );
        }

        return (
            <div className="glass-effect rounded-2xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                    <CalendarDays className="inline-block mr-2" size={24} />
                    Prognoza 5-dniowa
                </h3>
                <div id="forecastCards" className="grid grid-cols-1 md:grid-cols-5 gap-4">{forecastCards}</div>
            </div>
        );
    };

    const renderRecommendations = () => {
        if (!weatherData) return null;
        const recommendations = [];

        let clothing = '';
        if (weatherData.temp < 5) {
            clothing = '🧥 Gruba kurtka, czapka, szalik, rękawiczki';
        } else if (weatherData.temp < 15) {
            clothing = '🧥 Lekka kurtka lub sweter';
        } else if (weatherData.temp < 25) {
            clothing = '👕 T-shirt i lekka bluza';
        } else {
            clothing = '👕 Lekkie ubranie, krótkie rękawy';
        }
        recommendations.push(<div key="clothing" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">👔 Ubranie</h4><p className="text-purple-100">{clothing}</p></div>);

        let activities = '';
        if (weatherData.description.includes('deszcz')) {
            activities = '🏠 Lepiej zostać w domu lub wybrać aktywności wewnętrzne';
        } else if (weatherData.wind > 15) {
            activities = '🏃 Dobry dzień na bieganie, unikaj roweru';
        } else {
            activities = '🚴 Idealny dzień na spacery, jazdę na rowerze, sporty na świeżym powietrzu';
        }
        recommendations.push(<div key="activities" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">🎯 Aktywności</h4><p className="text-purple-100">{activities}</p></div>);

        let health = '';
        if (weatherData.humidity > 70) {
            health = '💊 Pamiętaj o nawodnieniu, unikaj przegrzania';
        } else if (weatherData.temp < 10) {
            health = '🤧 Wzmocnij odporność, witamina C';
        } else {
            health = '😊 Dobre warunki dla zdrowia';
        }
        recommendations.push(<div key="health" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">💪 Zdrowie</h4><p className="text-purple-100">{health}</p></div>);

        let travel = '';
        if (weatherData.wind > 20 || weatherData.description.includes('deszcz')) {
            travel = '⚠️ Ostrożnie na drodze, możliwe utrudnienia';
        } else {
            travel = '✅ Dobre warunki do podróży';
        }
        recommendations.push(<div key="travel" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">🚗 Podróż</h4><p className="text-purple-100">{travel}</p></div>);

        return (
            <div className="glass-effect rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                    <Lightbulb className="inline-block mr-2" size={24} />
                    Rekomendacje
                </h3>
                <div className="grid md:grid-cols-2 gap-4">{recommendations}</div>
            </div>
        );
    };

    return (
        <div className="min-h-screen gradient-bg">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                        <CloudSun className="float-animation" size={48} />
                        Inteligentna Pogoda
                    </h1>
                    <p className="text-xl text-purple-100">Analiza i prognozy pogodowe dla każdej miejscowości</p>
                </header>

                {/* Search Section */}
                <section className="mb-8">
                    <div className="glass-effect rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    type="text"
                                    id="cityInput"
                                    placeholder="Wpisz nazwę miejscowości..."
                                    className="w-full px-6 py-4 rounded-xl text-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none transition-colors bg-transparent text-white placeholder-purple-200"
                                    value={cityInput}
                                    onChange={(e) => setCityInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && getWeather()}
                                />
                            </div>
                            <Button
                                onClick={getWeather}
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                            >
                                <Search className="mr-2 inline-block" size={20} />
                                Sprawdź pogodę
                            </Button>
                        </div>
                        {error && <div className="mt-4 text-red-300">{error}</div>}
                    </div>
                </section>

                {/* Loading Indicator */}
                {loading && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        <p className="text-white mt-4">Pobieranie danych pogodowych...</p>
                    </div>
                )}

                {/* Current Weather */}
                {weatherData && (
                    <section className="mb-8">
                        <div className="glass-effect rounded-2xl p-8 weather-card">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-4">
                                        <MapPin className="inline-block mr-2" size={24} />
                                        <span>{weatherData.city}</span>
                                    </h2>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="text-6xl">
                                            {renderWeatherIcon(weatherData.icon)}
                                        </div>
                                        <div>
                                            <div className="text-5xl font-bold text-white">{weatherData.temp}°C</div>
                                            <div className="text-xl text-purple-200">{weatherData.description}</div>
                                        </div>
                                    </div>
                                    <div className="text-purple-200">
                                        <p><CalendarDays className="inline-block mr-2" size={16} />{new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p><Clock className="inline-block mr-2" size={16} />{currentTime}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Thermometer className="text-2xl text-orange-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Odczuwalna</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.feels}°C</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Droplet className="text-2xl text-blue-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Wilgotność</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.humidity}%</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Wind className="text-2xl text-gray-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Wiatr</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.wind} km/h</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Gauge className="text-2xl text-purple-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Ciśnienie</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.pressure} hPa</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Weather Analysis */}
                {weatherData && renderAnalysis()}

                {/* 5-Day Forecast */}
                {weatherData && renderForecast()}

                {/* Recommendations */}
                {weatherData && renderRecommendations()}
            </div>
        </div>
    );
};

export default WeatherForecastAI;