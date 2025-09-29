"use client";

import React from 'react';

export const PMCLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img src="/PMClogo.png" alt="PMC Logo" className="h-16 w-auto dark:invert" />
    </div>
  );
};