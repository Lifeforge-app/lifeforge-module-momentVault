import { AudioPlayerProvider } from '@/providers/AudioPlayerProvider'
import forgeAPI from '@/utils/forgeAPI'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  FAB,
  ModuleHeader
} from 'lifeforge-ui'
import { useModalStore } from 'lifeforge-ui'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import 'react-photo-album/styles.css'
import type { InferOutput } from 'shared'

import EntryList from './components/EntryList'
import AddEntryModal from './modals/AddEntryModal'

export type MomentVaultEntry = InferOutput<
  typeof forgeAPI.momentVault.entries.list
>['items'][number]

function MomentVault() {
  const open = useModalStore(state => state.open)

  const { t } = useTranslation('apps.momentVault')

  const [page, setPage] = useState(1)

  const dataQuery = useQuery(
    forgeAPI.momentVault.entries.list
      .input({
        page: page.toString()
      })
      .queryOptions()
  )

  const handleAddEntry = useCallback(
    (type: string) => () => {
      open(AddEntryModal, {
        type: type as 'text' | 'audio' | 'photos' | 'video'
      })
    },
    [page]
  )

  return (
    <AudioPlayerProvider>
      <ModuleHeader
        actionButton={
          <ContextMenu
            buttonComponent={
              <Button
                className="hidden md:flex"
                icon="tabler:plus"
                tProps={{ item: t('items.entry') }}
                onClick={() => {}}
              >
                new
              </Button>
            }
            classNames={{ button: 'hidden:md:block' }}
          >
            {[
              { icon: 'tabler:file-text', type: 'text' },
              { icon: 'tabler:microphone', type: 'audio' },
              { icon: 'tabler:camera', type: 'photos' },
              { icon: 'tabler:video', type: 'video' }
            ].map(({ icon, type }) => (
              <ContextMenuItem
                key={type}
                icon={icon}
                label={type}
                namespace="apps.momentVault"
                onClick={handleAddEntry(type)}
              />
            ))}
          </ContextMenu>
        }
      />
      <EntryList dataQuery={dataQuery} page={page} setPage={setPage} />
      <ContextMenu
        buttonComponent={<FAB className="static!" visibilityBreakpoint="md" />}
        classNames={{
          wrapper: 'fixed bottom-6 right-6'
        }}
      >
        {[
          { icon: 'tabler:file-text', type: 'text' },
          { icon: 'tabler:microphone', type: 'audio' },
          { icon: 'tabler:camera', type: 'photos' },
          { icon: 'tabler:video', type: 'video' }
        ].map(({ icon, type }) => (
          <ContextMenuItem
            key={type}
            icon={icon}
            label={type}
            namespace="apps.momentVault"
            onClick={handleAddEntry(type)}
          />
        ))}
      </ContextMenu>
    </AudioPlayerProvider>
  )
}

export default MomentVault
