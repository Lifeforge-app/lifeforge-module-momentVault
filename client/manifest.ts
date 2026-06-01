import { lazy } from 'react'

import type { ModuleConfig } from '@lifeforge/shared'

export default {
  routes: {
    '/': lazy(() => import('@'))
  },
  widgets: [() => import('@/widgets/QuickAudioCapture')]
} satisfies ModuleConfig
