"use client";

import React from 'react';

export const PhilosopherLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`text-3xl font-bold text-purple-600 dark:text-purple-400 ${className}`}>
      Philosopher
    </div>
  );
};