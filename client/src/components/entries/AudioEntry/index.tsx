import type { MomentVaultEntry } from '@'
import { Icon } from '@iconify/react'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Card,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem
} from 'lifeforge-ui'
import { useModalStore } from 'lifeforge-ui'
import { useState } from 'react'
import { toast } from 'react-toastify'
import type { InferOutput } from 'shared'

import EditTranscriptionModal from '@/modals/EditTranscriptionModal'
import { useAudioPlayer } from '@/providers/AudioPlayerProvider'
import forgeAPI from '@/utils/forgeAPI'

import AudioPlayer from './components/AudioPlayer'

dayjs.extend(relativeTime)

function AudioEntry({
  currentPage,
  entry,
  onDelete
}: {
  currentPage: number
  entry: MomentVaultEntry
  onDelete: () => void
}) {
  const { open } = useModalStore()

  const audioPlayerContext = useAudioPlayer()

  const queryClient = useQueryClient()

  const [transcriptionLoading, setTranscriptionLoading] = useState(false)

  async function addTranscription() {
    setTranscriptionLoading(true)

    try {
      const data = await forgeAPI.momentVault.transcribe.transcribeExisted
        .input({
          id: entry.id
        })
        .mutate({})

      queryClient.setQueryData(
        forgeAPI.momentVault.entries.list.input({
          page: currentPage.toString()
        }).key,
        (
          prev:
            | InferOutput<typeof forgeAPI.momentVault.entries.list>
            | undefined
        ) => {
          if (!prev) return prev

          const newData = prev.items.map(item => {
            if (item.id === entry.id) {
              return {
                ...item,
                transcription: data
              }
            }

            return item
          })

          return {
            ...prev,
            items: newData
          }
        }
      )
    } catch {
      toast.error('Failed to transcribe audio')
    } finally {
      setTranscriptionLoading(false)
    }
  }

  async function toggleReviewed() {
    try {
      await forgeAPI.momentVault.entries.toggleReviewed
        .input({ id: entry.id })
        .mutate({})

      queryClient.invalidateQueries({
        queryKey: ['momentVault', 'entries']
      })
    } catch {
      toast.error('Failed to toggle reviewed status')
    }
  }

  return (
    <Card as="li" id={`audio-entry-${entry.id}`}>
      <div className="mr-16">
        <AudioPlayer entry={entry} />
      </div>
      {entry.transcription && (
        <p className="text-bg-500 before:bg-custom-500 relative mt-6 pl-4 whitespace-pre-wrap before:absolute before:top-0 before:left-0 before:h-full before:w-1 before:rounded-full">
          {entry.reviewed && (
            <div className="text-custom-500 mb-2 flex items-center gap-1 font-medium">
              <Icon icon="tabler:check" /> Reviewed
            </div>
          )}
          {entry.transcription}
        </p>
      )}
      <p className="text-bg-500 mt-4 flex items-center gap-2">
        <Icon icon="tabler:clock" /> {dayjs(entry.created).fromNow()}
      </p>
      <ContextMenu classNames={{ wrapper: 'absolute top-4 right-4' }}>
        {entry.transcription === '' ? (
          <ContextMenuItem
            icon="tabler:file-text"
            label="Transcribe to Text"
            loading={transcriptionLoading}
            namespace="apps.momentVault"
            shouldCloseMenuOnClick={false}
            onClick={() => {
              addTranscription().catch(console.error)
            }}
          />
        ) : (
          <>
            <ContextMenuItem
              icon={entry.reviewed ? 'tabler:circle-off' : 'tabler:check'}
              label={entry.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
              namespace="apps.momentVault"
              onClick={toggleReviewed}
            />
            {!entry.reviewed && (
              <>
                <ContextMenuItem
                  icon="tabler:pencil"
                  label="Edit Transcription"
                  namespace="apps.momentVault"
                  onClick={() => {
                    open(EditTranscriptionModal, {
                      entry,
                      audioPlayerContext
                    })
                  }}
                />
                <ContextMenuItem
                  dangerous
                  icon="tabler:refresh"
                  label="Retranscribe"
                  loading={transcriptionLoading}
                  namespace="apps.momentVault"
                  onClick={() => {
                    open(ConfirmationModal, {
                      title: 'Retranscribe Audio',
                      description:
                        'Are you sure you want to retranscribe the audio? This will overwrite the existing transcription.',
                      onConfirm: addTranscription
                    })
                  }}
                />
              </>
            )}
          </>
        )}
        <ContextMenuItem
          dangerous
          icon="tabler:trash"
          label="Delete"
          onClick={onDelete}
        />
      </ContextMenu>
    </Card>
  )
}

export default AudioEntry
