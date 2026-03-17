import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// EN
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enChat from './locales/en/chat.json';
import enChannels from './locales/en/channels.json';
import enAgents from './locales/en/agents.json';
import enSkills from './locales/en/skills.json';
import enCron from './locales/en/cron.json';
import enSetup from './locales/en/setup.json';

// ZH-CN
import zhCnCommon from './locales/zh-CN/common.json';
import zhCnSettings from './locales/zh-CN/settings.json';
import zhCnDashboard from './locales/zh-CN/dashboard.json';
import zhCnChat from './locales/zh-CN/chat.json';
import zhCnChannels from './locales/zh-CN/channels.json';
import zhCnAgents from './locales/zh-CN/agents.json';
import zhCnSkills from './locales/zh-CN/skills.json';
import zhCnCron from './locales/zh-CN/cron.json';
import zhCnSetup from './locales/zh-CN/setup.json';

// ZH-TW
import zhTwCommon from './locales/zh-TW/common.json';
import zhTwSettings from './locales/zh-TW/settings.json';
import zhTwDashboard from './locales/zh-TW/dashboard.json';
import zhTwChat from './locales/zh-TW/chat.json';
import zhTwChannels from './locales/zh-TW/channels.json';
import zhTwAgents from './locales/zh-TW/agents.json';
import zhTwSkills from './locales/zh-TW/skills.json';
import zhTwCron from './locales/zh-TW/cron.json';
import zhTwSetup from './locales/zh-TW/setup.json';

// JA
import jaCommon from './locales/ja/common.json';
import jaSettings from './locales/ja/settings.json';
import jaDashboard from './locales/ja/dashboard.json';
import jaChat from './locales/ja/chat.json';
import jaChannels from './locales/ja/channels.json';
import jaAgents from './locales/ja/agents.json';
import jaSkills from './locales/ja/skills.json';
import jaCron from './locales/ja/cron.json';
import jaSetup from './locales/ja/setup.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'ja', label: '日本語' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
    en: {
        common: enCommon,
        settings: enSettings,
        dashboard: enDashboard,
        chat: enChat,
        channels: enChannels,
        agents: enAgents,
        skills: enSkills,
        cron: enCron,
        setup: enSetup,
    },
    'zh-CN': {
        common: zhCnCommon,
        settings: zhCnSettings,
        dashboard: zhCnDashboard,
        chat: zhCnChat,
        channels: zhCnChannels,
        agents: zhCnAgents,
        skills: zhCnSkills,
        cron: zhCnCron,
        setup: zhCnSetup,
    },
    'zh-TW': {
        common: zhTwCommon,
        settings: zhTwSettings,
        dashboard: zhTwDashboard,
        chat: zhTwChat,
        channels: zhTwChannels,
        agents: zhTwAgents,
        skills: zhTwSkills,
        cron: zhTwCron,
        setup: zhTwSetup,
    },
    zh: {
        common: zhCnCommon,
        settings: zhCnSettings,
        dashboard: zhCnDashboard,
        chat: zhCnChat,
        channels: zhCnChannels,
        agents: zhCnAgents,
        skills: zhCnSkills,
        cron: zhCnCron,
        setup: zhCnSetup,
    },
    ja: {
        common: jaCommon,
        settings: jaSettings,
        dashboard: jaDashboard,
        chat: jaChat,
        channels: jaChannels,
        agents: jaAgents,
        skills: jaSkills,
        cron: jaCron,
        setup: jaSetup,
    },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // will be overridden by settings store
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common', 'settings', 'dashboard', 'chat', 'channels', 'agents', 'skills', 'cron', 'setup'],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
