"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudSun, Search, MapPin, Thermometer, Droplet, Wind, Gauge, LineChart, CalendarDays, Lightbulb, LocateFixed, AirVent, Sun, Cloud, CloudRain, Snowflake, Zap, CloudFog, HelpCircle, ArrowUp, ArrowDown, CheckCircle, Info, TriangleAlert, Home, ShoppingCart, Utensils, HeartPulse, Car, Clock } from 'lucide-react';
import { toast } from "sonner";

// Stałe API
// UWAGA: Klucz API został wklejony bezpośrednio do kodu, zgodnie z życzeniem użytkownika.
const API_KEY = '5f472b7acba333cd8a035ea85a0d4d4c';
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Mapowanie ikon OpenWeatherMap na Lucide React
const getWeatherIconComponent = (iconCode: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
        '01d': Sun, '01n': Sun, // Uproszczone do Sun/Moon
        '02d': CloudSun, '02n': CloudSun,
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

// Symulowane dane AQI (dla fallbacku)
const getSimulatedAirQuality = () => {
    const aqi = Math.floor(Math.random() * 5) + 1;
    const info = aqiMap[aqi] || aqiMap[1];
    return {
        main: { aqi: aqi },
        components: {
            pm2_5: Math.floor(Math.random() * 50) + 10,
            pm10: Math.floor(Math.random() * 70) + 15,
            no2: Math.floor(Math.random() * 40) + 5
        },
        ...info
    };
};

// Symulowane dane pogodowe (dla fallbacku)
const getSimulatedWeatherData = (city: string) => {
    const temp = 15 + Math.random() * 10 - 5;
    const humidity = 60 + Math.random() * 20;
    const pressure = 1013 + Math.random() * 20 - 10;
    const wind = 5 + Math.random() * 10;
    const descriptions = ['bezchmurnie', 'częściowo zachmurzenie', 'lekkie opady deszczu', 'pochmurno'];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const iconCode = description.includes('deszcz') ? '10d' : description.includes('zachmurzenie') ? '02d' : '01d';

    return {
        name: city,
        sys: { country: 'PL' },
        main: { temp, humidity, pressure, feels_like: temp - 2 },
        wind: { speed: wind },
        weather: [{ main: 'Clouds', description: description, icon: iconCode }],
        coord: { lat: 52, lon: 21 } // Placeholder coords
    };
};

const getSimulatedForecastData = () => {
    const list = [];
    const now = Date.now() / 1000;
    for (let i = 1; i <= 5; i++) {
        const dt = now + i * 24 * 3600;
        const temp = 15 + Math.random() * 10 - 5;
        const humidity = 60 + Math.random() * 20;
        const wind = 5 + Math.random() * 10;
        const descriptions = ['bezchmurnie', 'częściowo zachmurzenie', 'lekkie opady deszczu', 'pochmurno'];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const iconCode = description.includes('deszcz') ? '10d' : description.includes('zachmurzenie') ? '02d' : '01d';

        list.push({
            dt: dt,
            main: { temp, humidity, temp_max: temp + 3, temp_min: temp - 3 },
            weather: [{ description: description, icon: iconCode, main: 'Clouds' }],
            wind: { speed: wind }
        });
    }
    return { list };
};


const WeatherForecastAI = () => {
    const [cityInput, setCityInput] = useState<string>('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [forecastData, setForecastData] = useState<any>(null);
    const [airQualityData, setAirQualityData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<string>('');
    const [isApiAvailable, setIsApiAvailable] = useState<boolean>(!!API_KEY);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('pl-PL'));
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!API_KEY) {
            setError("Brak klucza API. Używam symulowanych danych pogodowych.");
            toast.warning("Brak klucza API. Używam symulowanych danych.");
            setIsApiAvailable(false);
        }
    }, []);

    const fetchAirQuality = useCallback(async (lat: number, lon: number) => {
        if (!isApiAvailable) return getSimulatedAirQuality();
        
        try {
            const response = await fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
            if (!response.ok) {
                throw new Error("Błąd pobierania jakości powietrza.");
            }
            const data = await response.json();
            const aqiInfo = aqiMap[data.list[0].main.aqi] || aqiMap[1];
            return { ...data.list[0], ...aqiInfo };
        } catch (err) {
            console.error("Error fetching air quality, using simulation:", err);
            return getSimulatedAirQuality();
        }
    }, [isApiAvailable]);

    const fetchData = useCallback(async (lat?: number, lon?: number, city?: string) => {
        setLoading(true);
        setError('');
        setWeatherData(null);
        setForecastData(null);
        setAirQualityData(null);

        try {
            let currentLat = lat;
            let currentLon = lon;
            let currentWeatherData;

            if (city) {
                if (isApiAvailable) {
                    const geoResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=pl`);
                    if (!geoResponse.ok) {
                        throw new Error(`Nie znaleziono miejscowości: ${city}`);
                    }
                    currentWeatherData = await geoResponse.json();
                    currentLat = currentWeatherData.coord.lat;
                    currentLon = currentWeatherData.coord.lon;
                } else {
                    currentWeatherData = getSimulatedWeatherData(city);
                    currentLat = currentWeatherData.coord.lat;
                    currentLon = currentWeatherData.coord.lon;
                }
                setWeatherData(currentWeatherData);
            } else if (lat !== undefined && lon !== undefined) {
                if (isApiAvailable) {
                    const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pl`);
                    if (!weatherResponse.ok) {
                        throw new Error("Błąd pobierania aktualnej pogody.");
                    }
                    currentWeatherData = await weatherResponse.json();
                } else {
                    currentWeatherData = getSimulatedWeatherData("Twoja Lokalizacja");
                }
                setWeatherData(currentWeatherData);
                currentLat = lat;
                currentLon = lon;
            } else {
                throw new Error('Proszę wpisać nazwę miejscowości lub użyć geolokalizacji.');
            }

            // 2. Pobierz prognozę 5-dniową
            let forecastResult;
            if (isApiAvailable) {
                const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${currentLat}&lon=${currentLon}&appid=${API_KEY}&units=metric&lang=pl`);
                if (!forecastResponse.ok) {
                    throw new Error("Błąd pobierania prognozy.");
                }
                forecastResult = await forecastResponse.json();
            } else {
                forecastResult = getSimulatedForecastData();
            }
            setForecastData(forecastResult);

            // 3. Pobierz jakość powietrza
            const airQualityResult = await fetchAirQuality(currentLat, currentLon);
            setAirQualityData(airQualityResult);

            toast.success(`Pobrano prognozę dla ${currentWeatherData.name}`);

        } catch (err: any) {
            console.error("Error fetching weather:", err);
            setError(err.message || 'Wystąpił błąd podczas pobierania danych pogodowych.');
            setWeatherData(null);
            setForecastData(null);
            setAirQualityData(null);
        } finally {
            setLoading(false);
        }
    }, [isApiAvailable, fetchAirQuality]);

    const getWeatherByCity = () => {
        if (!cityInput.trim()) {
            setError('Proszę wpisać nazwę miejscowości');
            return;
        }
        fetchData(undefined, undefined, cityInput.trim());
    };

    const getWeatherByLocation = () => {
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
        const aqiInfo = aqiMap[aqi] || aqiMap[1];
        const pm25 = airQualityData.components.pm2_5.toFixed(1);
        const pm10 = airQualityData.components.pm10.toFixed(1);

        let recommendation = '';
        let icon = <CheckCircle className="w-4 h-4 mr-1" />;
        
        if (aqi >= 4) {
            recommendation = 'Ogranicz aktywności na zewnątrz, szczególnie osoby wrażliwe.';
            icon = <TriangleAlert className="w-4 h-4 mr-1" />;
        } else if (aqi >= 2) {
            recommendation = 'Umiarkowana jakość powietrza - bezpieczne dla większości osób.';
            icon = <Info className="w-4 h-4 mr-1" />;
        } else {
            recommendation = 'Doskonała jakość powietrza - idealna na aktywności na świeżym powietrzu.';
        }

        return (
            <div className={`bg-white/10 rounded-xl p-4 col-span-2 md:col-span-1 border-l-4 border-purple-500`}>
                <AirVent className="text-2xl text-cyan-300 mb-2" size={24} />
                <p className="text-purple-200 text-sm">Jakość Powietrza (AQI)</p>
                <p className={`text-2xl font-bold ${aqiInfo.color}`}>{aqiInfo.label}</p>
                <div className="text-xs text-purple-300 mt-1 space-y-1">
                    <p>PM2.5: {pm25} µg/m³</p>
                    <p>PM10: {pm10} µg/m³</p>
                </div>
                <p className={`mt-2 text-xs flex items-center ${aqiInfo.color}`}>
                    {icon} {recommendation}
                </p>
            </div>
        );
    };

    const renderAnalysis = () => {
        if (!weatherData || !forecastData || !airQualityData) return null;
        
        const analysis: { icon: React.ElementType, color: string, text: string }[] = [];
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const wind = weatherData.wind.speed;
        const pressure = weatherData.main.pressure;
        const description = weatherData.weather[0].description;
        const aqi = airQualityData.main.aqi;

        // 1. Temperatura
        if (temp > 25) {
            analysis.push({ icon: Thermometer, color: "text-orange-500", text: '<strong>Upał:</strong> Wysoka temperatura, zalecane picie dużej ilości wody i unikanie słońca w godzinach południowych.' });
        } else if (temp < 5) {
            analysis.push({ icon: Thermometer, color: "text-blue-500", text: '<strong>Zimno:</strong> Niska temperatura, zalecane ciepłe ubranie i ochrona przed wiatrem.' });
        } else {
            analysis.push({ icon: Thermometer, color: "text-green-500", text: '<strong>Umiarkowanie:</strong> Przyjemna temperatura idealna na aktywności na świeżym powietrzu.' });
        }

        // 2. Wiatr
        if (wind > 10) {
            analysis.push({ icon: Wind, color: "text-yellow-500", text: '<strong>Silny wiatr:</strong> Uważaj na przedmioty mogące zostać porwane przez wiatr.' });
        }

        // 3. Wilgotność
        if (humidity > 80) {
            analysis.push({ icon: Droplet, color: "text-blue-400", text: '<strong>Wysoka wilgotność:</strong> Możliwe uczucie duszności, dobra na pielęgnację skóry.' });
        } else if (humidity < 30) {
            analysis.push({ icon: Droplet, color: "text-red-400", text: '<strong>Niska wilgotność:</strong> Suchość powietrza, zalecane nawilżanie pomieszczeń.' });
        }

        // 4. Ciśnienie
        if (pressure < 1000) {
            analysis.push({ icon: Gauge, color: "text-red-500", text: '<strong>Niskie ciśnienie:</strong> Mogą wystąpić bóle głowy u osób wrażliwych.' });
        } else if (pressure > 1020) {
            analysis.push({ icon: Gauge, color: "text-green-500", text: '<strong>Wysokie ciśnienie:</strong> Dobre warunki dla sportowców.' });
        }

        // 5. Trend temperatury (na podstawie prognozy)
        const dailyForecasts = processForecastData(forecastData);
        if (dailyForecasts.length >= 5) {
            const tempToday = weatherData.main.temp;
            const tempDay5 = dailyForecasts[4].temp.day;
            const tempTrend = tempDay5 - tempToday;

            if (tempTrend > 5) {
                analysis.push({ icon: ArrowUp, color: "text-red-500", text: '<strong>Ocieplenie:</strong> W ciągu najbliższych dni oczekiwany znaczny wzrost temperatury.' });
            } else if (tempTrend < -5) {
                analysis.push({ icon: ArrowDown, color: "text-blue-500", text: '<strong>Ochłodzenie:</strong> W ciągu najbliższych dni oczekiwany znaczny spadek temperatury.' });
            }
        }

        // 6. Ostrzeżenia pogodowe
        if (description.includes('deszcz') || description.includes('burza') || description.includes('śnieg')) {
            analysis.push({ icon: CloudRain, color: "text-indigo-500", text: `<strong>Opady:</strong> Spodziewane ${description}. Weź parasol.` });
        }
        
        return (
            <div className="glass-effect rounded-2xl p-6 mb-8 bg-white/10">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <LineChart size={24} className="text-green-400" />
                    Inteligentna Analiza Pogody
                </h3>
                <div className="text-purple-100 space-y-3">
                    {analysis.map((item, index) => (
                        <p key={index} className="flex items-center gap-2">
                            {React.createElement(item.icon, { className: `w-5 h-5 ${item.color}` })}
                            <span dangerouslySetInnerHTML={{ __html: item.text }} />
                        </p>
                    ))}
                </div>
            </div>
        );
    };

    const renderRecommendations = () => {
        if (!weatherData || !airQualityData) return null;
        
        const temp = weatherData.main.temp;
        const wind = weatherData.wind.speed;
        const description = weatherData.weather[0].description;
        const aqi = airQualityData.main.aqi;

        const recommendations: { title: string, icon: React.ElementType, text: string }[] = [];

        // Ubranie
        let clothing = '';
        if (temp < 5) {
            clothing = 'Gruba kurtka, czapka, szalik, rękawiczki. Ubieraj się warstwowo.';
        } else if (temp < 15) {
            clothing = 'Lekka kurtka lub sweter. Warto mieć ze sobą parasol.';
        } else if (temp < 25) {
            clothing = 'T-shirt i lekka bluza. Idealne warunki.';
        } else {
            clothing = 'Lekkie ubranie, krótkie rękawy. Pamiętaj o nakryciu głowy.';
        }
        recommendations.push({ title: 'Odzież', icon: ShoppingCart, text: clothing });

        // Aktywności
        let activities = '';
        if (description.includes('deszcz') || description.includes('burza') || aqi >= 4) {
            activities = 'Lepiej zostać w domu lub wybrać aktywności wewnętrzne (np. kino, muzeum, gotowanie).';
        } else if (wind > 10) {
            activities = 'Dobry dzień na bieganie, unikaj roweru i sportów wymagających precyzji.';
        } else {
            activities = 'Idealny dzień na spacery, jazdę na rowerze, sporty na świeżym powietrzu.';
        }
        recommendations.push({ title: 'Aktywności', icon: Utensils, text: activities });

        // Zdrowie
        let health = '';
        if (temp > 25) {
            health = 'Pij minimum 2-3 litry wody dziennie. Używaj kremu z filtrem UV.';
        } else if (temp < 10) {
            health = 'Wzmocnij odporność, witamina C. Unikaj wychłodzenia organizmu.';
        } else if (aqi >= 3) {
            health = 'Osoby wrażliwe powinny ograniczyć czas na zewnątrz. Rozważ maskę antysmogową.';
        } else {
            health = 'Dobre warunki dla zdrowia i samopoczucia.';
        }
        recommendations.push({ title: 'Zdrowie', icon: HeartPulse, text: health });

        // Podróż
        let travel = '';
        if (wind > 15 || description.includes('burza') || description.includes('śnieg')) {
            travel = 'Ostrożnie na drodze, możliwe utrudnienia i śliska nawierzchnia. Sprawdź rozkład jazdy.';
        } else {
            travel = 'Dobre warunki do podróży samochodem i komunikacją miejską.';
        }
        recommendations.push({ title: 'Podróż', icon: Car, text: travel });
        
        return (
            <div className="glass-effect rounded-2xl p-6 bg-white/10">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Lightbulb size={24} className="text-yellow-400" />
                    Inteligentne Rekomendacje
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {recommendations.map((rec, index) => (
                        <div key={index} className="bg-white/10 rounded-xl p-4 border border-purple-500/30">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                {React.createElement(rec.icon, { className: "w-5 h-5 text-purple-300" })}
                                {rec.title}
                            </h4>
                            <p className="text-purple-100 text-sm">{rec.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const processForecastData = (data: any) => {
        if (!data || !data.list) return [];
        
        const dailyForecasts: any[] = [];
        const forecastsByDay: { [key: string]: any[] } = {};
        
        data.list.forEach((item: any) => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!forecastsByDay[dateKey]) {
                forecastsByDay[dateKey] = [];
            }
            forecastsByDay[dateKey].push(item);
        });
        
        // Get next 5 days (skip today's partial data)
        const days = Object.keys(forecastsByDay).slice(1, 6);
        
        days.forEach(dayKey => {
            const dayForecasts = forecastsByDay[dayKey];
            if (dayForecasts && dayForecasts.length > 0) {
                const middayForecast = dayForecasts.find(f => new Date(f.dt * 1000).getHours() === 12) || dayForecasts[0];
                
                const temps = dayForecasts.map(f => f.main.temp);
                const maxTemp = Math.max(...temps);
                const minTemp = Math.min(...temps);
                
                dailyForecasts.push({
                    date: new Date(middayForecast.dt * 1000),
                    temp: {
                        day: maxTemp,
                        night: minTemp
                    },
                    weather: {
                        description: middayForecast.weather[0].description,
                        icon: middayForecast.weather[0].icon
                    },
                    humidity: middayForecast.main.humidity,
                    wind: middayForecast.wind.speed
                });
            }
        });
        
        return dailyForecasts;
    };

    const renderForecast = () => {
        if (!forecastData || !forecastData.list) return null;
        const dailyForecasts = processForecastData(forecastData);
        
        if (dailyForecasts.length === 0) return null;

        const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

        const forecastCards = dailyForecasts.map((day, index) => {
            const dayName = days[day.date.getDay()];
            const IconComponent = getWeatherIconComponent(day.weather.icon);
            
            const dayTemp = Math.round(day.temp.day);
            const nightTemp = Math.round(day.temp.night);
            const humidity = Math.round(day.humidity);
            const wind = Math.round(day.wind);

            return (
                <div key={index} className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition-colors border border-purple-500/30">
                    <p className="text-purple-200 font-semibold mb-2">{index === 0 ? 'Jutro' : dayName}</p>
                    <div className="text-3xl mb-2">
                        <IconComponent className="text-yellow-300 mx-auto" size={32} />
                    </div>
                    <p className="text-sm text-purple-200 mb-1">{day.weather.description}</p>
                    <div className="flex justify-center gap-2 text-lg font-bold text-white">
                        <span className="text-red-400">{dayTemp}°C</span>
                        <span className="text-blue-400">{nightTemp}°C</span>
                    </div>
                    <div className="mt-2 text-xs text-purple-300 flex justify-around">
                        <span title="Wilgotność"><Droplet className="inline w-3 h-3 mr-1" /> {humidity}%</span>
                        <span title="Wiatr"><Wind className="inline w-3 h-3 mr-1" /> {wind} m/s</span>
                    </div>
                </div>
            );
        });

        return (
            <div className="glass-effect rounded-2xl p-6 mb-8 bg-white/10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <CalendarDays size={24} className="text-purple-400" />
                    Prognoza 5-dniowa
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{forecastCards}</div>
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
                    <div className="glass-effect rounded-2xl p-6 bg-white/10">
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
                                />
                            </div>
                            <Button
                                onClick={getWeatherByCity}
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                                disabled={loading}
                            >
                                <Search className="mr-2 inline-block" size={20} />
                                Sprawdź pogodę
                            </Button>
                            <Button
                                onClick={getWeatherByLocation}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                                disabled={loading}
                            >
                                <LocateFixed className="mr-2 inline-block" size={20} />
                                Moja lokalizacja
                            </Button>
                        </div>
                        {error && <div className="mt-4 text-red-300 text-center">{error}</div>}
                        {!isApiAvailable && (
                            <div className="mt-4 text-yellow-300 text-center text-sm">
                                <Info className="inline w-4 h-4 mr-1" />
                                Używane są symulowane dane, ponieważ klucz API jest nieaktywny.
                            </div>
                        )}
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
                        <div className="weather-card text-white rounded-2xl shadow-xl p-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-4 flex items-center">
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
                                        <p><CalendarDays className="inline-block mr-2 w-4 h-4" />{new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p><Clock className="inline-block mr-2 w-4 h-4" />{currentTime}</p>
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
                                        <p className="text-2xl font-bold text-white">{weatherData.wind.speed.toFixed(1)} m/s</p>
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