import { lazy } from 'react'
import type { ModuleConfig } from 'shared'

export default {
  name: 'Moment Vault',
  icon: 'tabler:history',
  hasAI: true,
  routes: {
    '/': lazy(() => import('@'))
  },
  apiAccess: [
    {
      key: 'openai',
      usage: 'Speech to text transcription and text entry summarizing',
      required: true
    }
  ],
  category: 'Lifestyle'
} satisfies ModuleConfig
