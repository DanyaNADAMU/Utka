'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Dictionary } from './dictionaries';

const LanguageContext = createContext<Dictionary | null>(null);

export function LanguageProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={dictionary}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
