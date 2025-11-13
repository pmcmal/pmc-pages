"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, MessageSquareText, Image, ShieldHalf, Bot, User, BookOpen, Terminal, Send } from 'lucide-react';
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

const ShortAICourse = () => {
    const [messages, setMessages] = useState<Message[]>([
        { text: "Cześć! Jestem Twoim asystentem treningowym AI. Wpisz poniżej dowolne polecenie lub wybierz przykład, aby zobaczyć, jak działam!", sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState<string>('');
    const [quizState, setQuizState] = useState({
        score: 0,
        answered: Array(quizData.length).fill(false),
        showResults: false,
    });
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState<typeof quizData>([]);
    const [quizScoreDisplay, setQuizScoreDisplay] = useState('0/0');

    const chatWindowRef = useRef<HTMLDivElement>(null);
    const userInputRef = useRef<HTMLInputElement>(null);
    const quizContainerRef = useRef<HTMLDivElement>(null);
    const quizResultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        initQuiz();
    }, []);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
            
            let response = generateResponse(text);
            
            setTimeout(() => {
                setMessages(prev => prev.map(msg => msg.isTyping ? { ...msg, text: response, isTyping: false } : msg));
            }, 1500);
        }, 500);
    };

    const initQuiz = () => {
        setQuizState({
            score: 0,
            answered: Array(quizData.length).fill(false),
            showResults: false,
        });
        setCurrentQuizQuestions(quizData);
        setQuizScoreDisplay(`0/${quizData.length}`);
    };

    const checkAnswer = (qIndex: number, optIndex: number) => {
        if (quizState.answered[qIndex]) return;

        const isCorrect = optIndex === quizData[qIndex].correct;
        
        setQuizState(prev => {
            const newAnswered = [...prev.answered];
            newAnswered[qIndex] = true;
            const newScore = isCorrect ? prev.score + 1 : prev.score;
            setQuizScoreDisplay(`${newScore}/${quizData.length}`);
            return { ...prev, score: newScore, answered: newAnswered };
        });
    };

    const finishQuiz = () => {
        setQuizState(prev => ({ ...prev, showResults: true }));
    };

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
                        <a href="#start" onClick={() => scrollToSection('start')} className="hover:text-white transition">Start</a>
                        <a href="#teoria" onClick={() => scrollToSection('teoria')} className="hover:text-white transition">Lekcje</a>
                        <a href="#symulator" onClick={() => scrollToSection('symulator')} className="hover:text-white transition">Symulator</a>
                        <a href="#quiz" onClick={() => scrollToSection('quiz')} className="hover:text-white transition">Quiz</a>
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
                    <span className="gradient-text">w 15 minut</span>
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
                                <Brain className="text-xl" />
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
                                <MessageSquareText className="text-xl" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">2. Sztuka Promptowania</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                <strong>Prompt</strong> to instrukcja, którą wpisujesz do AI. Jakość odpowiedzi zależy od jakości zapytania.
                                <br /><br />
                                Dobry prompt zawiera:
                                <ul className="list-disc list-inside mt-2 text-slate-500">
                                    <li><strong>Rolę:</strong> "Zachowuj się jak ekspert marketingu..."</li>
                                    <li><strong>Kontekst:</strong> "Piszę e-mail do klienta..."</li>
                                    <li><strong>Zadanie:</strong> "Napisz 3 propozycje tematu..."</li>
                                    <li><strong>Format:</strong> "Przedstaw w liście punktowanej."</li>
                                </ul>
                            </p>
                        </div>

                        {/* Module 3 */}
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 transition group">
                            <div className="w-12 h-12 bg-pink-900/50 rounded-lg flex items-center justify-center mb-4 text-pink-400 group-hover:scale-110 transition">
                                <Image className="text-xl" />
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
                                <ShieldHalf className="text-xl" />
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
                                        {msg.sender === 'user' ? <User className="text-white text-xs" /> : <Bot className="text-white text-xs" />}
                                    </div>
                                    <div className={`rounded-2xl px-4 py-2 text-sm max-w-[80%] ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'} ${msg.isTyping ? 'typing-cursor' : ''}`}>
                                        {msg.isTyping ? (
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-950 border-t border-slate-800">
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                                <Button variant="outline" onClick={() => fillPrompt('Napisz krótki wiersz o programowaniu.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    ? Wiersz o kodzie
                                </Button>
                                <Button variant="outline" onClick={() => fillPrompt('Wyjaśnij 5-latkowi czym jest czarna dziura.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    ? Fizyka dla 5-latka
                                </Button>
                                <Button variant="outline" onClick={() => fillPrompt('Podaj przepis na naleśniki.')} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 px-3 py-1.5 rounded-full transition border border-indigo-900/30">
                                    ? Przepis
                                </Button>
                            </div>
                            <div className="relative">
                                <Input
                                    type="text"
                                    id="user-input"
                                    placeholder="Wpisz swój prompt tutaj..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    ref={userInputRef}
                                />
                                <Button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 rounded-md flex items-center justify-center transition">
                                    <Send className="text-xs" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quiz Section */}
            <section id="quiz" className="py-20 bg-indigo-900/20 border-t border-slate-800">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-8">Sprawdź swoją wiedzę</h2>
                    
                    <div ref={quizContainerRef} className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 text-left ${quizState.showResults ? 'hidden' : ''}`}>
                        {currentQuizQuestions.map((q, qIndex) => (
                            <div key={qIndex} className="mb-8 last:mb-0">
                                <p className="font-bold text-lg mb-3 text-white">{qIndex + 1}. {q.question}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, optIndex) => (
                                        <Button
                                            key={optIndex}
                                            onClick={() => checkAnswer(qIndex, optIndex)}
                                            className={`text-left px-4 py-3 rounded-lg border transition text-sm text-slate-300 w-full justify-start
                                                ${quizState.answered[qIndex] && optIndex === q.correct ? 'bg-green-900/50 border-green-500' : ''}
                                                ${quizState.answered[qIndex] && optIndex !== q.correct && optIndex === quizState.answered[qIndex] ? 'bg-red-900/50 border-red-500' : ''}
                                                ${!quizState.answered[qIndex] ? 'bg-slate-800 hover:bg-slate-700 border-slate-600' : ''}
                                            `}
                                            disabled={quizState.answered[qIndex]}
                                        >
                                            {opt}
                                        </Button>
                                    ))}
                                </div>
                                {quizState.answered[qIndex] && (
                                    <p className={`mt-2 text-sm font-semibold ${quizData[qIndex].correct === (quizState.answered[qIndex] && quizData[qIndex].options.indexOf(quizData[qIndex].options.find((_, i) => i === quizData[qIndex].correct) || '')) ? 'text-green-400' : 'text-red-400'}`}>
                                        {quizData[qIndex].correct === (quizState.answered[qIndex] && quizData[qIndex].options.indexOf(quizData[qIndex].options.find((_, i) => i === quizData[qIndex].correct) || '')) ? '✅ Dobra odpowiedź!' : '❌ Niestety, to nie to.'}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="mt-8 text-center">
                            <Button onClick={finishQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold transition shadow-lg shadow-indigo-500/20">Zakończ Quiz</Button>
                        </div>
                    </div>
                    
                    <div ref={quizResultRef} className={`bg-slate-900 border border-green-900 rounded-2xl p-8 ${quizState.showResults ? '' : 'hidden'}`}>
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Gratulacje!</h3>
                        <p className="text-slate-400 mb-6">Ukończyłeś szybki kurs AI. Twój wynik: <span id="score-display" className="text-indigo-400 font-bold text-xl">{quizScoreDisplay}</span></p>
                        <Button onClick={initQuiz} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition">
                            Powtórz Quiz
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-800">
                <p>&copy; 2025 Akademia AI by Paweł Malec. Stworzone w celach edukacyjnych.</p>
            </footer>
        </div>
    );
};

export default ShortAICourse;