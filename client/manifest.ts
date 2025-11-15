import { lazy } from 'react'
import type { ModuleConfig } from 'shared'

export default {
  name: 'Moment Vault',
  icon: 'tabler:history',
  hasAI: true,
  routes: {
    '/': lazy(() => import('@'))
  },
  requiredAPIKeys: ['openai'],
  category: 'Lifestyle'
} satisfies ModuleConfig
