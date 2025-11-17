"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from "sonner";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    unit: string;
    tags: string[];
}

interface CartItem extends Product {
    quantity: number;
}

const products: Product[] = [
    {
        id: 'p1',
        name: 'Druk 3D',
        description: 'Profesjonalny wydruk w technologii FDM/SLA. Wysoka precyzja i wytrzymałość materiałów technicznych.',
        price: 150.00,
        unit: 'Projekt',
        tags: ['FDM', 'SLA']
    },
    {
        id: 'p2',
        name: 'Projekt CNC',
        description: 'Kompleksowe projektowanie i frezowanie elementów. Aluminium, stal, tworzywa sztuczne.',
        price: 350.00,
        unit: 'Godzina',
        tags: ['Precyzja', 'Metal']
    },
    {
        id: 'p3',
        name: 'Strona WWW',
        description: 'Nowoczesna strona internetowa typu Landing Page lub SPA. Responsywny design i optymalizacja SEO.',
        price: 1200.00,
        unit: 'Usługa',
        tags: ['Web', 'Design']
    },
    {
        id: 'p4',
        name: 'Konsultacja IT',
        description: 'Analiza potrzeb i dobór technologii dla Twojego projektu. Wparcie techniczne i merytoryczne.',
        price: 200.00,
        unit: 'Godzina',
        tags: ['Support']
    }
];

const PortfolioStore = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const openCart = useCallback(() => {
        setIsCartOpen(true);
        setIsAnimating(true);
    }, []);

    const closeCart = useCallback(() => {
        setIsAnimating(false);
        setTimeout(() => {
            setIsCartOpen(false);
        }, 300); // Match CSS transition duration
    }, []);

    const addToCart = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === productId);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        toast.success(`Dodano ${product.name} do koszyka.`);
        openCart();
    };

    const updateQuantity = (productId: string, change: number) => {
        setCart(prevCart => {
            const newCart = prevCart.map(item =>
                item.id === productId ? { ...item, quantity: item.quantity + change } : item
            ).filter(item => item.quantity > 0);
            return newCart;
        });
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        
        const checkoutToastId = toast.loading("PRZETWARZANIE ZAMÓWIENIA...");

        setTimeout(() => {
            toast.dismiss(checkoutToastId);
            toast.success('Zamówienie przyjęte. Dziękujemy za skorzystanie z usług PMC.');
            setCart([]);
            closeCart();
        }, 1500);
    };

    // Ensure body uses Courier Prime font
    useEffect(() => {
        // Ustawienie klasy font-mono na body jest obsługiwane przez Tailwind config,
        // ale dodajemy klasę na główny div komponentu dla pewności.
        // Usuwamy bezpośrednią manipulację DOM, aby była zgodna z React.
    }, []);

    const renderProducts = () => {
        return products.map(product => (
            <div key={product.id} className="group relative bg-gray-900 border border-green-900/50 hover:border-green-500/50 transition-all duration-300 p-6 flex flex-col h-full hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                <div className="absolute top-4 right-4 flex gap-2">
                    {product.tags.map(tag => (
                        <span key={tag} className="text-[10px] border border-green-800 text-green-400 px-1 uppercase">{tag}</span>
                    ))}
                </div>
                
                <div className="mb-4 mt-2">
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{product.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{product.unit} unit</span>
                </div>
                
                <div className="w-full h-32 bg-black/50 mb-4 border border-green-900/30 flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <span className="text-4xl font-bold text-green-900/30 select-none group-hover:text-green-500/20 transition-colors">PMC-{Math.floor(Math.random()*900)+100}</span>
                </div>

                <p className="text-gray-400 text-sm mb-6 flex-grow font-sans leading-relaxed">
                    {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-green-900/30">
                    <span className="text-xl font-bold text-white">{product.price.toFixed(2)} €</span>
                    <Button 
                        onClick={() => addToCart(product.id)}
                        className="bg-green-900/20 hover:bg-green-600 hover:text-black text-green-500 border border-green-700 hover:border-green-500 px-4 py-2 text-sm font-bold uppercase transition-all active:scale-95"
                        variant="ghost"
                    >
                        Add to Cart
                    </Button>
                </div>
            </div>
        ));
    };

    const renderCartItems = () => {
        if (cart.length === 0) {
            return (
                <div className="text-center text-green-800 py-10 select-none">
                    <p className="mb-2 font-bold text-4xl opacity-20">∅</p>
                    <p className="mb-2">/// EMPTY BUFFER ///</p>
                    <p className="text-xs">Select compounds to proceed</p>
                </div>
            );
        }

        return cart.map(item => (
            <div key={item.id} className="flex gap-4 bg-black/40 p-3 border border-green-900/50">
                <div className="w-16 h-16 bg-green-900/20 border border-green-900/30 flex items-center justify-center text-xs text-green-700">
                    IMG
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                        <span className="text-green-400 font-mono text-sm">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase mb-2">{item.unit}</p>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border border-green-800">
                            <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 text-green-600 hover:bg-green-900 hover:text-white transition-colors">-</button>
                            <span className="px-2 text-sm text-white font-mono min-w-[1.5rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 text-green-600 hover:bg-green-900 hover:text-white transition-colors">+</button>
                        </div>
                        <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-xs text-red-900 hover:text-red-500 ml-auto">REMOVE</button>
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <div className="bg-gray-950 text-green-500 min-h-screen flex flex-col selection:bg-green-900 selection:text-white font-mono">
            <div className="scanline"></div>

            {/* Navbar */}
            <nav className="border-b border-green-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h1 className="text-2xl font-bold tracking-tighter text-white">PMC <span className="text-green-600 text-sm font-normal uppercase tracking-widest">Services</span></h1>
                    </div>
                    <Button 
                        onClick={openCart}
                        className="group flex items-center gap-2 border border-green-800 hover:border-green-500 hover:bg-green-900/30 px-4 py-2 transition-all duration-300 bg-transparent text-green-500 hover:text-white"
                        variant="ghost"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm uppercase tracking-wider">Koszyk</span>
                        {totalItems > 0 && (
                            <span className="bg-green-600 text-black text-xs font-bold px-1.5 py-0.5 rounded">
                                {totalItems}
                            </span>
                        )}
                    </Button>
                </div>
            </nav>

            {/* Hero */}
            <header className="container mx-auto px-4 py-12 text-center border-b border-green-900/30">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 glow-text-store">ENGINEERING & DESIGN</h2>
                <p className="text-green-400/80 max-w-2xl mx-auto text-sm md:text-base">
                    Przykładowy sklep do portfolio. Oferujemy zaawansowane usługi technologiczne i cyfrowe.
                    Najwyższa jakość realizacji.
                </p>
                <div className="mt-6 inline-block border border-green-900 bg-green-900/10 text-green-400 px-4 py-2 text-xs uppercase tracking-widest">
                    Status: System Operational
                </div>
            </header>

            {/* Products Grid */}
            <main className="container mx-auto px-4 py-12 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderProducts()}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-green-900 bg-black py-8 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-green-800 text-xs uppercase tracking-widest mb-2">PMC Services © 2023</p>
                    <div className="flex justify-center gap-4 text-xs text-gray-600">
                        <a href="#" className="hover:text-green-500">Regulamin</a>
                        <span>|</span>
                        <a href="#" className="hover:text-green-500">Portfolio</a>
                        <span>|</span>
                        <a href="#" className="hover:text-green-500">Kontakt</a>
                    </div>
                </div>
            </footer>

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[60]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div 
                        className={`absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} 
                        onClick={closeCart}
                    ></div>
                    
                    {/* Panel */}
                    <div 
                        className={`absolute inset-y-0 right-0 w-full max-w-md bg-gray-900 border-l border-green-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        
                        <div className="p-6 border-b border-green-800 flex justify-between items-center bg-black/50">
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Twoje Zamówienie</h2>
                            <button onClick={closeCart} className="text-green-600 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {renderCartItems()}
                        </div>

                        <div className="p-6 border-t border-green-800 bg-black/50">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-sm text-green-600 uppercase">Suma</span>
                                <span className="text-2xl font-bold text-white">{totalValue.toFixed(2)} €</span>
                            </div>
                            <Button 
                                onClick={handleCheckout}
                                disabled={cart.length === 0}
                                className="w-full bg-green-700 hover:bg-green-600 text-black font-bold py-3 px-4 uppercase tracking-widest transition-all duration-200 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                            >
                                Initiate Secure Checkout
                            </Button>
                            <p className="text-[10px] text-center text-green-800 mt-3">Płatność online / Przelew tradycyjny. Szyfrowane połączenie.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioStore;