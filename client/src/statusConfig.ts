import statusDefinitions from '../../shared/statuses.json';
import type { AutoClearOption, StatusDefinition, StatusId } from './types';

export const statuses = statusDefinitions as StatusDefinition[];

export const autoClearOptions: AutoClearOption[] = [
  { label: '30分', value: 30 },
  { label: '1時間', value: 60 },
  { label: '2時間', value: 120 },
  { label: '解除しない', value: 'none' },
];

export const statusMeta: Record<StatusId, { icon: string; tone: string; helper: string }> = {
  ok: {
    icon: '✓',
    tone: 'ok',
    helper: '今は大丈夫',
  },
  dnd: {
    icon: '!',
    tone: 'dnd',
    helper: '静かにしてほしい',
  },
  penguin: {
    icon: '🐧',
    tone: 'penguin',
    helper: 'ペンギン中',
  },
};
