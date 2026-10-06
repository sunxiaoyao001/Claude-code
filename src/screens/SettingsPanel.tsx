import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useT } from '@/i18n';
import { useGame, type Language, type Quality, type Settings } from '@/store/gameStore';

function Row({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-6 border-b border-hairline py-2 last:border-b-0">
      <label htmlFor={htmlFor} className="text-sm text-foreground/90">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Preferences, shared by the main menu and the in-battle menu. */
export function SettingsPanel() {
  const t = useT();
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSettings);
  const toggle = (key: keyof Settings, label: string) => (
    <Row label={label} htmlFor={`set-${key}`}>
      <Switch id={`set-${key}`} checked={!!s[key]} onCheckedChange={(v) => set({ [key]: v } as Partial<Settings>)} />
    </Row>
  );
  return (
    <div>
      <Row label={t('settings.language')}>
        <ToggleGroup type="single" value={s.language} onValueChange={(v) => v && set({ language: v as Language })}>
          <ToggleGroupItem value="zh">中文</ToggleGroupItem>
          <ToggleGroupItem value="en">English</ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label={t('settings.quality')}>
        <ToggleGroup type="single" value={s.quality} onValueChange={(v) => v && set({ quality: v as Quality })}>
          {(['low', 'medium', 'high'] as const).map((q) => (
            <ToggleGroupItem key={q} value={q}>
              {t(`settings.quality.${q}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
      <Row label={t('settings.healthBars')}>
        <ToggleGroup type="single" value={s.healthBars} onValueChange={(v) => v && set({ healthBars: v as Settings['healthBars'] })}>
          {(['damaged', 'always', 'off'] as const).map((q) => (
            <ToggleGroupItem key={q} value={q}>
              {t(`settings.healthBars.${q}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
      {toggle('callouts', t('settings.callouts'))}
      {toggle('hints', t('settings.hints'))}
      {toggle('aiDebug', t('settings.aiDebug'))}
      {toggle('roofs', t('settings.roofs'))}
      {toggle('blood', t('settings.blood'))}
      {toggle('shake', t('settings.shake'))}
      {toggle('edgeScroll', t('settings.edgeScroll'))}
      <p className="pt-3 text-xs text-muted-foreground">{t('settings.applyNext')}</p>
    </div>
  );
}
