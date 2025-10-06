"use client";

import React from 'react';
import { CircuitBoard } from 'lucide-react'; // Import ikony płytki drukowanej

export const CircuitLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-teal-600 dark:text-teal-400 ${className}`}>
      <CircuitBoard className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">Circuit AI</span>
    </div>
  );
};