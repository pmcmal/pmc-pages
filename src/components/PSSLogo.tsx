"use client";

import React from 'react';

export const PSSLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`text-3xl font-bold text-blue-600 dark:text-blue-400 ${className}`}>
      PSS
    </div>
  );
};