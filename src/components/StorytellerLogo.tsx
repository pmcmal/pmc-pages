"use client";

import React from 'react';
import { Feather } from 'lucide-react'; // Import ikony pióra

export const StorytellerLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-blue-500 dark:text-blue-300 ${className}`}>
      <Feather className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">Storyteller AI</span>
    </div>
  );
};