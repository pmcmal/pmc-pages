"use client";

import React from 'react';
import { Sparkles } from 'lucide-react'; // Import ikony

export const LogoGeneratorLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-blue-600 dark:text-blue-400 ${className}`}>
      <Sparkles className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">LogoGen</span>
    </div>
  );
};