import { forgeRouter } from '@lifeforge/server-utils'

import * as entriesRoutes from './routes/entries'
import * as transcriptionRoutes from './routes/transcription'

export default forgeRouter({
  entries: entriesRoutes,
  transcribe: transcriptionRoutes
})
