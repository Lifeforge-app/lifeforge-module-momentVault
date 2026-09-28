import type { MomentVaultEntry } from '@'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useState } from 'react'

import type { InferOutput } from '@lifeforge/api'
import {
  Box,
  Card,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Text,
  toast,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import EditTranscriptionModal from '@/modals/EditTranscriptionModal'
import { useAudioPlayer } from '@/providers/AudioPlayerProvider'

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
      const data = await forgeAPI.transcribe.transcribeExisted
        .input({
          id: entry.id
        })
        .mutate(undefined)

      queryClient.setQueryData(
        forgeAPI.entries.list.input({
          page: currentPage.toString()
        }).key,
        (prev: InferOutput<typeof forgeAPI.entries.list> | undefined) => {
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
      await forgeAPI.entries.toggleReviewed
        .input({ id: entry.id })
        .mutate(undefined)

      queryClient.invalidateQueries({
        queryKey: forgeAPI.entries.key
      })
    } catch {
      toast.error('Failed to toggle reviewed status')
    }
  }

  return (
    <Card as="li" id={`audio-entry-${entry.id}`}>
      <Box mr="3xl">
        <AudioPlayer entry={entry} />
      </Box>
      {entry.transcription && (
        <Box mt="lg" pl="md" position="relative">
          <Box
            bg="primary"
            bottom="0"
            left="0"
            position="absolute"
            r="full"
            top="0"
            width="0.25rem"
          />
          {entry.reviewed && (
            <Flex align="center" gap="xs" mb="sm">
              <Icon color="primary" icon="tabler:check" />
              <Text color="primary" weight="medium">
                Reviewed
              </Text>
            </Flex>
          )}
          <Text as="p" color="muted" whiteSpace="pre-wrap">
            {entry.transcription}
          </Text>
        </Box>
      )}
      <Flex align="center" gap="sm" mt="md">
        <Icon color="muted" icon="tabler:clock" />
        <Text color="muted">{dayjs(entry.created).fromNow()}</Text>
      </Flex>
      <ContextMenu position="absolute" right="1rem" top="1rem">
        {entry.transcription === '' ? (
          <ContextMenuItem
            icon="tabler:file-text"
            label="Transcribe to Text"
            loading={transcriptionLoading}
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
              onClick={toggleReviewed}
            />
            {!entry.reviewed && (
              <>
                <ContextMenuItem
                  icon="tabler:pencil"
                  label="Edit Transcription"
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
