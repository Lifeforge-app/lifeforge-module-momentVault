import { lazy } from 'react'
import type { ModuleConfig } from 'shared'

export default {
  hasAI: true,
  routes: {
    '/': lazy(() => import('@'))
  },
  APIKeyAccess: {
    openai: {
      usage: 'Speech to text transcription and text entry summarizing',
      required: true
    }
  },
} satisfies ModuleConfig
