import React from 'react';
import en from './en.json';
import zhCn from './zh-cn.json';

const messages: Record<string, Record<string, string>> = {
  en,
  'zh-cn': zhCn,
};

export type MessageKey = keyof typeof en;

export function getMessages(locale: string): Record<string, string> {
  const lang = locale.startsWith('zh') ? 'zh-cn' : 'en';
  return messages[lang] ?? en;
}

export function t(
  messagesMap: Record<string, string>,
  key: string,
  ...args: (string | number)[]
): string {
  let msg = messagesMap[key] ?? key;
  args.forEach((arg, i) => {
    msg = msg.replace(new RegExp(`\\{${i}\\}`, 'g'), String(arg));
  });
  return msg;
}

export type TFunction = (key: string, ...args: (string | number)[]) => string;

export const L10nContext = React.createContext<{ t: TFunction }>({
  t: (key: string) => key
});

export function useL10n(): { t: TFunction } {
  return React.useContext(L10nContext);
}

export function L10nProvider({
  locale,
  children
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const messagesMap = getMessages(locale);
  const tFn: TFunction = (key, ...args) => t(messagesMap, key, ...args);
  return (
    <L10nContext.Provider value={{ t: tFn }}>
      {children}
    </L10nContext.Provider>
  );
}
