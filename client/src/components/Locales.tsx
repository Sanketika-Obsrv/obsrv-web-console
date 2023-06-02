import { ReactNode, useEffect, useState } from 'react';


import { IntlProvider, MessageFormatElement } from 'react-intl';


import useConfig from 'hooks/useConfig';
import { I18n } from 'types/config';


const loadLocaleData = (locale: I18n) => {
  return import('utils/locales/en.json');
};

interface Props {
  children: ReactNode;
}

const Locales = ({ children }: Props) => {
  const { i18n } = useConfig();

  const [messages, setMessages] = useState<Record<string, string> | Record<string, MessageFormatElement[]> | undefined>();

  useEffect(() => {
    loadLocaleData(i18n).then((d: { default: Record<string, string> | Record<string, MessageFormatElement[]> | undefined }) => {
      setMessages(d.default);
    });
  }, [i18n]);

  return (
    <>
      {messages && (
        <IntlProvider locale={i18n} defaultLocale="en" messages={messages}>
          {children}
        </IntlProvider>
      )}
    </>
  );
};

export default Locales;
