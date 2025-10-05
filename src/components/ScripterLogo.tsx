"use client";

import React from 'react';

export const ScripterLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`text-3xl font-bold text-green-600 dark:text-green-400 ${className}`}>
      Scripter
    </div>
  );
};