"use client";

import React from 'react';
import { Utensils } from 'lucide-react'; // Import ikony

export const ChefLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-orange-600 dark:text-orange-400 ${className}`}>
      <Utensils className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">Chef AI</span>
    </div>
  );
};