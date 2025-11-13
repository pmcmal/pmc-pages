"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Brain, MessageSquareText, Image, ShieldHalf, Bot, User, BookOpen, Terminal, Send, Download, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const quizData = [
    {
        question: "Co to jest 'Prompt'?",
        options: ["Rodzaj wirusa komputerowego", "Instrukcja/polecenie wydawane AI", "Nazwa firmy tworzącej AI", "Część komputera"],
        correct: 1
    },
    {
        question: "Co oznacza skrót LLM?",
        options: ["Little Learning Machine", "Large Language Model", "Long Lasting Memory", "Logic Level Module"],
        correct: 1
    },
    {
        question: "Czy AI zawsze mówi prawdę?",
        options: ["Tak, zawsze jest nieomylna", "Tak, jeśli ma dostęp do internetu", "Nie, może 'halucynować' i zmyślać", "Tak, ale tylko w języku angielskim"],
        correct: 2
    }
];

interface Message {
    text: string;
    sender: 'user' | 'ai';
    isTyping?: boolean;
}

interface QuizState {
    correctAnswers: boolean[];
    wrongAttempts: Set<string>;
    showResults: boolean;
}

interface CertificateData {
    name: string;
    date: string;
    certificateId: string;
}

const ShortAICourse = () => {
    const [messages, setMessages] = useState<Message[]>([
        { text: "Cześć! Jestem Twoim asystentem treningowym AI. Wpisz poniżej dowolne polecenie lub wybierz przykład, aby zobaczyć, jak działam!", sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState<string>('');
    const [quizState, setQuizState] = useState<QuizState>({
        correctAnswers: Array(quizData.length).fill(false),
        wrongAttempts: new Set(),
        showResults: false,
    });
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState<typeof quizData>(quizData);
    const [showCertificateForm, setShowCertificateForm] = useState(false);
    const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
    const [userName, setUserName] = useState('');

    const chatWindowRef = useRef<HTMLDivElement>(null);
    const userInputRef = useRef<HTMLInputElement>(null);
    const quizContainerRef = useRef<HTMLDivElement>(null);
    const quizResultRef = useRef<HTMLDivElement>(null);
    const certificateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        initQuiz();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const fillPrompt = (text: string) => {
        setUserInput(text);
        userInputRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') sendMessage();
    };

    const generateResponse = (input: string): string => {
        const lower = input.toLowerCase();
        if (lower.includes('wiersz')) return "W cyfrowym świecie, gdzie dane płyną rzeką,\nKod tworzy mosty, co w przyszłość uciekają.\nAlgorytm cicho szepcze, oblicza bez wytchnienia,\nBy z chaosu zer i jedynek, stworzyć marzenia.";
        if (lower.includes('czarna dziura') || lower.includes('fizyka') || lower.includes('5-lat')) return "Wyobraź sobie odkurzacz w kosmosie, który jest tak niesamowicie silny, że wciąga wszystko dookoła - nawet światło latarki! Nazywamy to Czarną Dziurą, bo jest tak silna, że nic nie może z niej uciec, więc wygląda jak ciemna plama na niebie.";
        if (lower.includes('przepis') || lower.includes('naleśniki')) return "Oto prosty przepis na naleśniki:\n1. Wymieszaj 1 szklankę mąki, 1 szklankę mleka i 1 jajko.\n2. Dodaj szczyptę soli.\n3. Wylej porcję ciasta na gorącą patelnię.\n4. Smaż z obu stron na złoty kolor.\nSmacznego! 🥞";
        if (lower.includes('czym jest ai')) return "AI (Sztuczna Inteligencja) to programy komputerowe zaprojektowane tak, by naśladować ludzkie myślenie. Uczą się na podstawie przykładów, zamiast być zaprogramowane 'sztywnymi' regułami.";
        if (lower.includes('prompt')) return "Prompt to po prostu polecenie dla AI. Im dokładniej opiszesz, czego chcesz, tym lepszy wynik otrzymasz. Spróbuj dodać rolę, np. 'Zachowuj się jak kucharz' przed zadaniem pytania.";
        
        const generics = [
            "To ciekawe pytanie! Jako symulator AI staram się odpowiadać najlepiej jak potrafię. Spróbuj zapytać o generowanie wierszy lub wyjaśnienie trudnych pojęć.",
            "Interesujący temat! W prawdziwym modelu AI (jak GPT-4) otrzymałbyś bardzo szczegółową analizę. Tutaj pokazuję Ci tylko przykład interakcji.",
            "Rozumiem. Pamiętaj, że kluczem do dobrej współpracy z AI jest precyzyjne formułowanie promptów. Spróbuj doprecyzować swoje zapytanie."
        ];
        return generics[Math.floor(Math.random() * generics.length)];
    };

    const sendMessage = () => {
        const text = userInput.trim();
        if (!text) return;

        setMessages(prev => [...prev, { text, sender: 'user' }]);
        setUserInput('');

        setTimeout(() => {
            setMessages(prev => [...prev, { text: '', sender: 'ai', isTyping: true }]);
            
            const response = generateResponse(text);
            
            setTimeout(() => {
                setMessages(prev => prev.map(msg => msg.isTyping ? { ...msg, text: response, isTyping: false } : msg));
            }, 1500);
        }, 500);
    };

    const initQuiz = () => {
        setQuizState({
            correctAnswers: Array(quizData.length).fill(false),
            wrongAttempts: new Set(),
            showResults: false,
        });
        setCurrentQuizQuestions(quizData);
        setShowCertificateForm(false);
        setCertificateData(null);
        setUserName('');
    };

    const checkAnswer = (qIndex: number, optIndex: number) => {
        if (quizState.correctAnswers[qIndex]) return;

        const attemptKey = `${qIndex}-${optIndex}`;
        
        if (quizState.wrongAttempts.has(attemptKey)) return;

        const isCorrect = optIndex === quizData[qIndex].correct;
        
        if (isCorrect) {
            setQuizState(prev => {
                const newCorrectAnswers = [...prev.correctAnswers];
                newCorrectAnswers[qIndex] = true;
                return { ...prev, correctAnswers: newCorrectAnswers };
            });
        } else {
            setQuizState(prev => ({
                ...prev,
                wrongAttempts: new Set([...prev.wrongAttempts, attemptKey])
            }));
        }
    };

    const finishQuiz = () => {
        setQuizState(prev => ({ ...prev, showResults: true }));
        const allCorrect = quizState.correctAnswers.every(answer => answer === true);
        if (allCorrect) {
            setShowCertificateForm(true);
        }
    };

    const generateCertificate = () => {
        if (!userName.trim()) return;
        
        const date = new Date().toLocaleDateString('pl-PL', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const certificateId = `AI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        setCertificateData({
            name: userName,
            date: date,
            certificateId: certificateId
        });
        setShowCertificateForm(false);
    };

    const downloadCertificate = () => {
        // W prawdziwej aplikacji użyłbyś biblioteki jak html2canvas lub jsPDF
        // Tutaj symulujemy pobieranie
        const certificateHTML = `
            <html>
            <head>
                <title>Certyfikat - ${certificateData?.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .certificate { background: white; padding: 60px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 800px; text-align: center; }
                    h1 { color: #333; margin-bottom: 30px; font-size: 36px; }
                    .name { font-size: 32px; color: #667eea; margin: 30px 0; font-weight: bold; }
                    .date { color: #666; margin-top: 40px; }
                    .id { color: #999; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <h1>🏆 Certyfikat Ukończenia</h1>
                    <p>Zaświadcza się, że</p>
                    <p class="name">${certificateData?.name}</p>
                    <p>ukończył(a) z wyróżnieniem</p>
                    <h2>Kurs Podstaw Sztucznej Inteligencji</h2>
                    <p>Akademia AI</p>
                    <p class="date">Data: ${certificateData?.date}</p>
                    <p class="id">ID: ${certificateData?.certificateId}</p>
                </div>
            </body>
            </html>
        `;
        
        const blob = new Blob([certificateHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certyfikat_AI_${certificateData?.name.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const allQuestionsCorrect = quizState.correctAnswers.every(answer => answer === true);
    const correctCount = quizState.correctAnswers.filter(answer => answer === true).length;

    return (
        <div className="bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold flex items-center gap-2">
                        <Bot className="text-indigo-500" />
                        <span>Akademia<span className="text-indigo-500">AI</span></span>
                    </div>
                    <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
                        <button onClick={() => scrollToSection('start')} className="hover:text-white transition">Start</button>
                        <button onClick={() => scrollToSection('teoria')} className="hover:text-white transition">Lekcje</button>
                        <button onClick={() => scrollToSection('symulator')} className="hover:text-white transition">Symulator</button>
                        <button onClick={() => scrollToSection('quiz')} className="hover:text-white transition">Quiz</button>
                    </div>
                    <Button onClick={() => scrollToSection('teoria')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow-lg shadow-indigo-500/20">
                        Zacznij Naukę
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <header id="start" className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -z-10"></div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                    Zrozum Sztuczną Inteligencję <br />
                    <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">w 15 minut</span>
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                    Darmowy, interaktywny przewodnik od podstaw do praktyki. Naucz się pisać prompty, generować treści i używać narzędzi AI.
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => scrollToSection('teoria')} className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> Rozpocznij Kurs
                    </Button>
                    <Button onClick={() => scrollToSection('symulator')} className="border border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold transition flex items-center gap-2">
                        <Terminal className="w-5 h-5" /> Wypróbuj AI
                    </Button>
                </div>
            </header>

            {/* Course Content (Accordion/Cards) */}
            <section id="teoria" className="py-20 bg-slate-800/30 border-y border-slate-800">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Ścieżka Nauki</h2>
                        <p className="text-slate-400">Krok po kroku wprowadzę Cię w świat AI.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Module 1 */}
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 transition group">
                            <div className="w-12 h-12 bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition">
                                <Brain />
                            </div>
                            <h3 className="text-xl font-bold mb-2">1. Czym jest AI?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Sztuczna inteligencja (AI) to systemy komputerowe, które potrafią wykonywać zadania wymagające ludzkiej inteligencji, takie jak rozpoznawanie obrazów, mowy czy podejmowanie decyzji.
                                <br /><br />
                                <strong>Kluczowe pojęcie: LLM (Large Language Model)</strong> - to model taki jak ChatGPT, który "przeczytał" ogromną część internetu i potrafi przewidywać kolejne słowa w zdaniu.
                            </p>
                        </div>

                        {/* Module 2 */}
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 transition group">
                            <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition">
                                <MessageSquareText />
                            </div>
                            <h3 className="text-xl font-bold mb-2">2. Sztuka Promptowania</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                <strong>Prompt</strong> to instrukcja, którą wpisujesz do AI. Jakość odpowiedzi zależy od jakości zapytania.
                                <br /><br />
                                Dobry prompt zawiera:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-slate-500 space-y-1">
                                <li><strong className="text-slate-400">Rolę:</strong> "Zachowuj się jak ekspert marketingu..."</li>
                                <li><strong className="text-slate-400">Kontekst:</strong> "Piszę e-mail do klienta..."</li>
                                <li><strong className="text-slate-400">Zadanie:</strong> "Napisz 3 propozycje tematu..."</li>
                                <li><strong className="text-slate-400">Format:</strong> "Przedstaw w liście punktowanej."</li>
                            </ul>
                        </div>

                        {/* Module 3 */}
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 transition group">
                            <div className="w-12 h-12 bg-pink-900/50 rounded-lg flex items-center justify-center mb-4 text-pink-400 group-hover:scale-110 transition">
                                <Image />
                            </div>
                            <h3 className="text-xl font-bold mb-2">3. Generowanie Obrazów</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                AI potrafi tworzyć nie tylko tekst, ale i grafikę (np. Midjourney, DALL-E). Opisujesz słowami to, co chcesz zobaczyć.
                                <br /><br />
                                <em>Przykład:</em> "Futurystyczne miasto w stylu cyberpunk, neonowe światła, deszczowa noc, wysoka rozdzielczość."
                            </p>
                        </div>

                        {/* Module 4 */}
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 transition group">
                            <div className="w-12 h-12 bg-emerald-900/50 rounded-lg flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition">
                                <ShieldHalf />
                            </div>
                            <h3 className="text-xl font-bold mb-2">4. Ograniczenia i Etyka</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                AI nie zawsze mówi prawdę! Zjawisko zmyślania faktów nazywamy <strong>halucynacją</strong>.
                                <br /><br />
                                Zawsze weryfikuj informacje. Pamiętaj też o prawach autorskich i nie używaj AI do generowania szkodliwych treści lub deepfake'ów.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simulator Section */}
            <section id="symulator" className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-4">Symulator AI</h2>
                        <p className="text-slate-400">Przetestuj prompty w bezpiecznym środowisku. Zobacz, jak AI reaguje na różne polecenia.</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
                        {/* Chat Window */}
                        <div ref={chatWindowRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900/50">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-slate-700' : 'bg-indigo-600'}`}>
                                        {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`rounded-2xl px-4 py-2 text-sm max-w-[80%] ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                                        {msg.isTyping ? (
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-950 border-t border-slate-800">
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                <Button variant="outline" onClick={() => fillPrompt('Napisz krótki wiersz o programowaniu.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    📝 Wiersz o kodzie
                                </Button>
                                <Button variant="outline" onClick={() => fillPrompt('Wyjaśnij 5-latkowi czym jest czarna dziura.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    🌌 Fizyka dla 5-latka
                                </Button>
                                <Button variant="outline" onClick={() => fillPrompt('Podaj przepis na naleśniki.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    🥞 Przepis
                                </Button>
                            </div>
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Wpisz swój prompt tutaj..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    ref={userInputRef}
                                />
                                <Button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 rounded-md flex items-center justify-center transition">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quiz Section */}
            <section id="quiz" className="py-20 bg-indigo-900/20 border-t border-slate-800">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Sprawdź swoją wiedzę</h2>
                    <p className="text-slate-400 mb-8">
                        Próbuj odpowiadać aż znajdziesz wszystkie poprawne odpowiedzi!
                    </p>
                    
                    <div ref={quizContainerRef} className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 text-left ${quizState.showResults ? 'hidden' : ''}`}>
                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>Postęp</span>
                                <span>{correctCount}/{quizData.length} poprawnych odpowiedzi</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(correctCount / quizData.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {currentQuizQuestions.map((q, qIndex) => (
                            <div key={qIndex} className="mb-8 last:mb-0">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        quizState.correctAnswers[qIndex] 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {quizState.correctAnswers[qIndex] ? '✓' : qIndex + 1}
                                    </div>
                                    <p className="font-bold text-lg text-white flex-1">{q.question}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-11">
                                    {q.options.map((opt, optIndex) => {
                                        const isCorrect = optIndex === q.correct;
                                        const isAnsweredCorrectly = quizState.correctAnswers[qIndex];
                                        const isWrongAttempt = quizState.wrongAttempts.has(`${qIndex}-${optIndex}`);
                                        
                                        return (
                                            <Button
                                                key={optIndex}
                                                onClick={() => checkAnswer(qIndex, optIndex)}
                                                className={`text-left px-4 py-3 rounded-lg border transition-all text-sm w-full justify-start relative
                                                    ${isAnsweredCorrectly && isCorrect 
                                                        ? 'bg-green-900/50 border-green-500 text-green-100' 
                                                        : ''}
                                                    ${isWrongAttempt && !isAnsweredCorrectly 
                                                        ? 'bg-red-900/20 border-red-900/50 text-red-200 animate-shake' 
                                                        : ''}
                                                    ${!isAnsweredCorrectly && !isWrongAttempt 
                                                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' 
                                                        : ''}
                                                    ${isAnsweredCorrectly && !isCorrect 
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-800/50 border-slate-700 text-slate-500' 
                                                        : ''}
                                                `}
                                                disabled={isAnsweredCorrectly || isWrongAttempt}
                                            >
                                                {opt}
                                                {isWrongAttempt && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">✗</span>
                                                )}
                                                {isAnsweredCorrectly && isCorrect && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">✓</span>
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                                {quizState.correctAnswers[qIndex] && (
                                    <p className="mt-3 ml-11 text-sm font-semibold text-green-400">
                                        ✅ Świetnie! To poprawna odpowiedź.
                                    </p>
                                )}
                            </div>
                        ))}
                        
                        <div className="mt-8 text-center">
                            <Button 
                                onClick={finishQuiz} 
                                disabled={!allQuestionsCorrect}
                                className={`px-8 py-3 rounded-full font-bold transition-all shadow-lg ${
                                    allQuestionsCorrect 
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20 animate-pulse' 
                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}>
                                {allQuestionsCorrect 
                                    ? '🎉 Zakończ Kurs - Wszystko poprawne!' 
                                    : `Znajdź wszystkie poprawne odpowiedzi (${correctCount}/${quizData.length})`}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Results Screen */}
                    <div ref={quizResultRef} className={`bg-gradient-to-br from-slate-900 to-slate-800 border border-green-500/50 rounded-2xl p-8 ${quizState.showResults && !certificateData ? '' : 'hidden'}`}>
                        {!showCertificateForm ? (
                            <>
                                <div className="text-6xl mb-4">🏆</div>
                                <h3 className="text-3xl font-bold text-white mb-4">Gratulacje!</h3>
                                <p className="text-lg text-slate-300 mb-6">
                                    Ukończyłeś kurs z wynikiem <span className="text-2xl font-bold text-green-400">100%</span>
                                </p>
                                <p className="text-slate-400 mb-8">
                                    Świetna robota! Opanowałeś podstawy AI. Możesz teraz wygenerować swój certyfikat ukończenia kursu.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <Button 
                                        onClick={() => setShowCertificateForm(true)} 
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2"
                                    >
                                        <Award className="w-5 h-5" /> Wygeneruj Certyfikat
                                    </Button>
                                    <Button onClick={() => scrollToSection('symulator')} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition">
                                        🤖 Wróć do Symulatora
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-white mb-6">Wpisz swoje dane do certyfikatu</h3>
                                <div className="max-w-md mx-auto">
                                    <Input
                                        type="text"
                                        placeholder="Imię i Nazwisko"
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-indigo-500 transition"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && generateCertificate()}
                                    />
                                    <div className="flex gap-3">
                                        <Button 
                                            onClick={generateCertificate}
                                            disabled={!userName.trim()}
                                            className={`flex-1 px-6 py-3 rounded-lg transition ${
                                                userName.trim() 
                                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            Generuj Certyfikat
                                        </Button>
                                        <Button 
                                            onClick={() => setShowCertificateForm(false)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition"
                                        >
                                            Anuluj
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Certificate Display */}
                    {certificateData && (
                        <div ref={certificateRef} className="bg-gradient-to-br from-slate-900 via-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-8">
                            <div className="bg-white rounded-xl p-8 md:p-12 text-slate-900 relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-x-16 -translate-y-16"></div>
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full translate-x-16 translate-y-16"></div>
                                
                                <div className="relative">
                                    <div className="text-center mb-8">
                                        <div className="flex justify-center mb-4">
                                            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                                <Award className="w-10 h-10 text-white" />
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                            Certyfikat Ukończenia
                                        </h2>
                                    </div>
                                    
                                    <div className="text-center space-y-4">
                                        <p className="text-slate-600">Zaświadcza się, że</p>
                                        <p className="text-4xl font-bold text-slate-900 py-2">
                                            {certificateData.name}
                                        </p>
                                        <p className="text-slate-600">ukończył(a) z wyróżnieniem</p>
                                        <p className="text-2xl font-semibold text-indigo-600">
                                            Kurs Podstaw Sztucznej Inteligencji
                                        </p>
                                        <div className="pt-8 space-y-2">
                                            <p className="text-sm text-slate-500">Akademia AI</p>
                                            <p className="text-sm text-slate-500">{certificateData.date}</p>
                                            <p className="text-xs text-slate-400">ID: {certificateData.certificateId}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-center gap-4">
                                <Button 
                                    onClick={downloadCertificate}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2"
                                >
                                    <Download className="w-5 h-5" /> Pobierz Certyfikat
                                </Button>
                                <Button onClick={initQuiz} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition">
                                    🔄 Rozpocznij Ponownie
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-800">
                <p>&copy; 2025 Akademia AI by Paweł Malec. Stworzone w celach edukacyjnych.</p>
            </footer>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default ShortAICourse;