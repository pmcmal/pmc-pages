"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudSun, Search, MapPin, Thermometer, Droplet, Wind, Gauge, LineChart, CalendarDays, Lightbulb, Clock, Sun, Cloud, CloudRain, Moon, CloudMoon, Zap, Snowflake, CloudFog, HelpCircle, LocateFixed, AirVent } from 'lucide-react';
import { toast } from "sonner";

// Stałe API
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Konwersja ikon OpenWeatherMap na Lucide React
const getWeatherIconComponent = (iconCode: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
        '01d': Sun, '01n': Moon,
        '02d': CloudSun, '02n': CloudMoon,
        '03d': Cloud, '03n': Cloud,
        '04d': Cloud, '04n': Cloud,
        '09d': CloudRain, '09n': CloudRain,
        '10d': CloudRain, '10n': CloudRain,
        '11d': Zap, '11n': Zap,
        '13d': Snowflake, '13n': Snowflake,
        '50d': CloudFog, '50n': CloudFog
    };
    return iconMap[iconCode] || HelpCircle;
};

// Mapowanie AQI (Air Quality Index)
const aqiMap: { [key: number]: { label: string, color: string } } = {
    1: { label: "Dobra", color: "text-green-500" },
    2: { label: "Umiarkowana", color: "text-yellow-500" },
    3: { label: "Niezdrowa dla wrażliwych", color: "text-orange-500" },
    4: { label: "Niezdrowa", color: "text-red-500" },
    5: { label: "Bardzo niezdrowa", color: "text-purple-500" },
};

const WeatherForecastAI = () => {
    const [cityInput, setCityInput] = useState<string>('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [forecastData, setForecastData] = useState<any>(null);
    const [airQualityData, setAirQualityData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<string>('');

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('pl-PL'));
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!API_KEY) {
            setError("Brak klucza API. Proszę ustawić zmienną środowiskową VITE_OPENWEATHER_API_KEY.");
            toast.error("Brak klucza API. Funkcjonalność pogody jest zablokowana.");
        }
    }, []);

    const fetchAirQuality = async (lat: number, lon: number) => {
        if (!API_KEY) return;
        try {
            const response = await fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
            if (!response.ok) {
                throw new Error("Błąd pobierania jakości powietrza.");
            }
            const data = await response.json();
            setAirQualityData(data.list[0]);
        } catch (err) {
            console.error("Error fetching air quality:", err);
            setAirQualityData(null);
        }
    };

    const fetchData = async (lat?: number, lon?: number, city?: string) => {
        if (!API_KEY) {
            setError("Brak klucza API. Proszę ustawić zmienną środowiskową VITE_OPENWEATHER_API_KEY.");
            return;
        }

        setLoading(true);
        setError('');
        setWeatherData(null);
        setForecastData(null);
        setAirQualityData(null);

        try {
            let currentLat = lat;
            let currentLon = lon;

            if (city) {
                // 1. Pobierz koordynaty dla miasta
                const geoResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=pl`);
                if (!geoResponse.ok) {
                    throw new Error(`Nie znaleziono miejscowości: ${city}`);
                }
                const geoData = await geoResponse.json();
                currentLat = geoData.coord.lat;
                currentLon = geoData.coord.lon;
                setWeatherData(geoData); // Używamy tego samego endpointu do pobrania aktualnej pogody
            } else if (lat === undefined || lon === undefined) {
                throw new Error('Proszę wpisać nazwę miejscowości lub użyć geolokalizacji.');
            }

            if (currentLat !== undefined && currentLon !== undefined) {
                // 2. Pobierz prognozę 5-dniową
                const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${currentLat}&lon=${currentLon}&appid=${API_KEY}&units=metric&lang=pl`);
                if (!forecastResponse.ok) {
                    throw new Error("Błąd pobierania prognozy.");
                }
                const forecastData = await forecastResponse.json();
                setForecastData(forecastData);

                // 3. Pobierz jakość powietrza
                await fetchAirQuality(currentLat, currentLon);
            }

            toast.success(`Pobrano prognozę dla ${city || 'Twojej lokalizacji'}`);

        } catch (err: any) {
            console.error("Error fetching weather:", err);
            setError(err.message || 'Wystąpił błąd podczas pobierania danych pogodowych.');
            setWeatherData(null);
            setForecastData(null);
            setAirQualityData(null);
        } finally {
            setLoading(false);
        }
    };

    const getWeatherByCity = () => {
        if (!cityInput.trim()) {
            setError('Proszę wpisać nazwę miejscowości');
            return;
        }
        fetchData(undefined, undefined, cityInput.trim());
    };

    const getWeatherByLocation = () => {
        if (!API_KEY) {
            setError("Brak klucza API. Proszę ustawić zmienną środowiskową VITE_OPENWEATHER_API_KEY.");
            return;
        }
        
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchData(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setError("Nie udało się pobrać Twojej lokalizacji. Upewnij się, że masz włączoną geolokalizację.");
                    setLoading(false);
                }
            );
        } else {
            setError("Twoja przeglądarka nie obsługuje geolokalizacji.");
        }
    };

    const renderAirQuality = () => {
        if (!airQualityData) return null;

        const aqi = airQualityData.main.aqi;
        const aqiInfo = aqiMap[aqi] || { label: "Nieznana", color: "text-gray-500" };

        return (
            <div className="bg-white/10 rounded-xl p-4 col-span-2 md:col-span-1">
                <AirVent className="text-2xl text-cyan-300 mb-2" size={24} />
                <p className="text-purple-200 text-sm">Jakość Powietrza (AQI)</p>
                <p className={`text-2xl font-bold ${aqiInfo.color}`}>{aqiInfo.label}</p>
                <p className="text-xs text-purple-300 mt-1">PM2.5: {airQualityData.components.pm2_5.toFixed(1)} µg/m³</p>
            </div>
        );
    };

    const renderAnalysis = () => {
        if (!weatherData) return null;
        const analysis = [];
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const wind = weatherData.wind.speed;
        const pressure = weatherData.main.pressure;
        const description = weatherData.weather[0].description;
        
        if (temp < 10) {
            analysis.push('🌡️ <strong>Niska temperatura</strong> - Ubierz się ciepło, zalecana kurtka i czapka.');
        } else if (temp > 25) {
            analysis.push('🌡️ <strong>Wysoka temperatura</strong> - Pamiętaj o nawodnieniu i ochronie przed słońcem.');
        } else {
            analysis.push('🌡️ <strong>Przyjemna temperatura</strong> - Idealne warunki do spacerów i aktywności na świeżym powietrzu.');
        }

        if (humidity > 70) {
            analysis.push('💧 <strong>Wysoka wilgotność</strong> - Powietrze jest ciężkie, może zwiększać uczucie gorąca.');
        } else if (humidity < 30) {
            analysis.push('💧 <strong>Niska wilgotność</strong> - Powietrze jest suche, zalecane nawilżanie skóry.');
        }

        if (wind > 10) {
            analysis.push('💨 <strong>Silny wiatr</strong> - Uważaj podczas jazdy na rowerze, trzymaj się mocno parasola.');
        }

        if (pressure < 1000) {
            analysis.push('📊 <strong>Niskie ciśnienie</strong> - Mogą wystąpić bóle głowy u osób wrażliwych.');
        } else if (pressure > 1020) {
            analysis.push('📊 <strong>Wysokie ciśnienie</strong> - Dobre warunki dla sportowców.');
        }

        if (description.includes('deszcz')) {
            analysis.push('🌧️ <strong>Opady deszczu</strong> - Weź parasol lub pelerynę.');
        }
        if (description.includes('śnieg')) {
            analysis.push('❄️ <strong>Opady śniegu</strong> - Ostrożnie na chodnikach, mogą być śliskie.');
        }
        if (description.includes('burza')) {
            analysis.push('⛈️ <strong>Burza</strong> - Znajdź schronienie, unikaj otwartych przestrzeni.');
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
        if (!forecastData || !forecastData.list) return null;
        const dailyForecasts: { [key: string]: { temps: number[], humidity: number, icon: string, description: string } } = {};
        const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        
        forecastData.list.forEach((item: any) => {
            const date = new Date(item.dt * 1000);
            const dayName = days[date.getDay()];
            
            // Używamy tylko jednej prognozy na dzień (np. południe)
            if (!dailyForecasts[dayName]) {
                dailyForecasts[dayName] = {
                    temps: [],
                    humidity: item.main.humidity,
                    icon: item.weather[0].icon,
                    description: item.weather[0].description
                };
            }
            dailyForecasts[dayName].temps.push(item.main.temp);
        });
        
        const forecastCards = [];
        let count = 0;
        const today = new Date().getDay();

        for (let i = 0; i < 7; i++) {
            const dayIndex = (today + i) % 7;
            const dayName = days[dayIndex];

            if (dailyForecasts[dayName] && count < 5) {
                const data = dailyForecasts[dayName];
                const minTemp = Math.min(...data.temps);
                const maxTemp = Math.max(...data.temps);
                const avgTemp = Math.round((minTemp + maxTemp) / 2);
                const IconComponent = getWeatherIconComponent(data.icon);

                forecastCards.push(
                    <div key={dayName} className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition-colors">
                        <p className="text-purple-200 font-semibold mb-2">{i === 0 ? 'Dziś' : dayName}</p>
                        <div className="text-3xl mb-2">
                            <IconComponent className="text-yellow-300 mx-auto" size={32} />
                        </div>
                        <p className="text-2xl font-bold text-white">{avgTemp}°C</p>
                        <p className="text-sm text-purple-200 mt-1">{Math.round(minTemp)}° / {Math.round(maxTemp)}°</p>
                        <p className="text-xs text-purple-300 mt-1">{data.humidity}%</p>
                    </div>
                );
                count++;
            }
        }

        return (
            <div className="glass-effect rounded-2xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                    <CalendarDays className="inline-block mr-2" size={24} />
                    Prognoza 5-dniowa
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{forecastCards}</div>
            </div>
        );
    };

    const renderRecommendations = () => {
        if (!weatherData) return null;
        const recommendations = [];
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const wind = weatherData.wind.speed;
        const description = weatherData.weather[0].description;
        
        let clothing = '';
        if (temp < 5) {
            clothing = '🧥 Gruba kurtka, czapka, szalik, rękawiczki';
        } else if (temp < 15) {
            clothing = '🧥 Lekka kurtka lub sweter';
        } else if (temp < 25) {
            clothing = '👕 T-shirt i lekka bluza';
        } else {
            clothing = '👕 Lekkie ubranie, krótkie rękawy';
        }
        recommendations.push(<div key="clothing" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">👔 Ubranie</h4><p className="text-purple-100">{clothing}</p></div>);

        let activities = '';
        if (description.includes('deszcz')) {
            activities = '🏠 Lepiej zostać w domu lub wybrać aktywności wewnętrzne';
        } else if (wind > 10) {
            activities = '🏃 Dobry dzień na bieganie, unikaj roweru';
        } else {
            activities = '🚴 Idealny dzień na spacery, jazdę na rowerze, sporty na świeżym powietrzu';
        }
        recommendations.push(<div key="activities" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">🎯 Aktywności</h4><p className="text-purple-100">{activities}</p></div>);

        let health = '';
        if (humidity > 70) {
            health = '💊 Pamiętaj o nawodnieniu, unikaj przegrzania';
        } else if (temp < 10) {
            health = '🤧 Wzmocnij odporność, witamina C';
        } else {
            health = '😊 Dobre warunki dla zdrowia';
        }
        recommendations.push(<div key="health" className="bg-white/10 rounded-xl p-4"><h4 className="font-bold text-white mb-2">💪 Zdrowie</h4><p className="text-purple-100">{health}</p></div>);

        let travel = '';
        if (wind > 15 || description.includes('deszcz')) {
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
                                    onKeyPress={(e) => e.key === 'Enter' && getWeatherByCity()}
                                    disabled={!API_KEY}
                                />
                            </div>
                            <Button
                                onClick={getWeatherByCity}
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                                disabled={!API_KEY || loading}
                            >
                                <Search className="mr-2 inline-block" size={20} />
                                Sprawdź pogodę
                            </Button>
                            <Button
                                onClick={getWeatherByLocation}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                                disabled={!API_KEY || loading}
                            >
                                <LocateFixed className="mr-2 inline-block" size={20} />
                                Moja lokalizacja
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
                                        <span>{weatherData.name}, {weatherData.sys.country}</span>
                                    </h2>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="text-6xl">
                                            {React.createElement(getWeatherIconComponent(weatherData.weather[0].icon), { className: "text-yellow-300", size: 64 })}
                                        </div>
                                        <div>
                                            <div className="text-5xl font-bold text-white">{Math.round(weatherData.main.temp)}°C</div>
                                            <div className="text-xl text-purple-200">{weatherData.weather[0].description}</div>
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
                                        <p className="text-2xl font-bold text-white">{Math.round(weatherData.main.feels_like)}°C</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Droplet className="text-2xl text-blue-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Wilgotność</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.main.humidity}%</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Wind className="text-2xl text-gray-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Wiatr</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.wind.speed} m/s</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4">
                                        <Gauge className="text-2xl text-purple-300 mb-2" size={24} />
                                        <p className="text-purple-200 text-sm">Ciśnienie</p>
                                        <p className="text-2xl font-bold text-white">{weatherData.main.pressure} hPa</p>
                                    </div>
                                    {renderAirQuality()}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Weather Analysis */}
                {weatherData && renderAnalysis()}

                {/* 5-Day Forecast */}
                {forecastData && renderForecast()}

                {/* Recommendations */}
                {weatherData && renderRecommendations()}
            </div>
        </div>
    );
};

export default WeatherForecastAI;