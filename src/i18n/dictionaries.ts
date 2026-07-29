import { cookies } from 'next/headers';
import en from './en.json';
import ru from './ru.json';

export type Dictionary = typeof ru;

const dictionaries = {
  en,
  ru,
};

export const getDictionary = async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value as 'en' | 'ru' || 'ru';
  return dictionaries[locale] || dictionaries.ru;
};

export const getLocale = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value as 'en' | 'ru' || 'ru';
};
