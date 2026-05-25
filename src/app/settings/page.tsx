'use client';

import React from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useSettings } from '@/features/settings/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { language, theme, setLanguage, setTheme } = useSettings();
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{t('Settings')}</h1>
          <p className="text-zinc-500 dark:text-zinc-400">{t("Manage your application preferences.")}</p>
        </div>

        <Card>
          <CardHeader 
            title={t('Language')} 
            subtitle="Choose your preferred language for the interface."
          />
          <CardContent className="flex flex-wrap gap-4">
            <Button 
              variant={language === 'vi' ? 'primary' : 'outline'} 
              onClick={() => setLanguage('vi')}
              className="flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {t('Vietnamese')}
            </Button>
            <Button 
              variant={language === 'en' ? 'primary' : 'outline'} 
              onClick={() => setLanguage('en')}
              className="flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {t('English')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader 
            title={t('Theme')} 
            subtitle="Customize the appearance of the application."
          />
          <CardContent className="flex flex-wrap gap-4">
            <Button 
              variant={theme === 'light' ? 'primary' : 'outline'} 
              onClick={() => setTheme('light')}
              className="flex items-center gap-2"
            >
              <Sun className="w-4 h-4" />
              {t('Light')}
            </Button>
            <Button 
              variant={theme === 'dark' ? 'primary' : 'outline'} 
              onClick={() => setTheme('dark')}
              className="flex items-center gap-2"
            >
              <Moon className="w-4 h-4" />
              {t('Dark')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
