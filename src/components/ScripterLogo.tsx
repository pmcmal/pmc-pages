"use client";

import React from 'react';
import { Terminal } from 'lucide-react'; // Import ikony

export const ScripterLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center text-green-600 dark:text-green-400 ${className}`}>
      <Terminal className="h-10 w-10 mr-2" />
      <span className="text-3xl font-bold">Scripter</span>
    </div>
  );
};