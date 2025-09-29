"use client";

import React from 'react';
import { BookOpen } from 'lucide-react'; // Import ikony

export const PhilosopherLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-purple-600 dark:text-purple-400 ${className}`}>
      <BookOpen className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">Philosopher</span>
    </div>
  );
};