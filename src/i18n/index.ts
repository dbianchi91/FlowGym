import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import it from './it.json';
import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import de from './de.json';

const resources = {
    it: { translation: it },
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    de: { translation: de }
};

const STORE_LANGUAGE_KEY = 'user_language';

const languageDetectorPlugin = {
    type: 'languageDetector' as const,
    async: true,
    init: () => { },
    detect: async function (callback: (lang: string) => void) {
        try {
            // get stored language from Async storage
            const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
            if (language) {
                return callback(language);
            } else {
                // if no language is stored, get the device's locale
                const deviceLocales = Localization.getLocales();
                let bestLanguage = 'it'; // fallback
                if (deviceLocales && deviceLocales.length > 0) {
                    const code = deviceLocales[0].languageCode;
                    if (code && resources[code as keyof typeof resources]) {
                        bestLanguage = code;
                    }
                }
                return callback(bestLanguage);
            }
        } catch (error) {
            console.log('Error reading language', error);
            return callback('it');
        }
    },
    cacheUserLanguage: async function (language: string) {
        try {
            await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    }
};

i18n
    .use(initReactI18next)
    .use(languageDetectorPlugin)
    .init({
        resources,
        fallbackLng: 'it',
        compatibilityJSON: 'v4',
        interpolation: {
            escapeValue: false // react is already safe from xss
        }
    });

export default i18n;
