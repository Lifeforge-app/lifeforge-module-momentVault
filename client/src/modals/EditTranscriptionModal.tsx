import type { MomentVaultEntry } from '@'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormModal, defineForm } from 'lifeforge-ui'
import { useState } from 'react'
import { toast } from 'react-toastify'

import AudioPlayer from '@/components/entries/AudioEntry/components/AudioPlayer'
import type { AudioPlayerContextType } from '@/providers/AudioPlayerProvider'
import forgeAPI from '@/utils/forgeAPI'

function EditTranscriptionModal({
  onClose,
  data: { entry, audioPlayerContext }
}: {
  onClose: () => void
  data: {
    entry: MomentVaultEntry
    audioPlayerContext: AudioPlayerContextType
  }
}) {
  const queryClient = useQueryClient()

  const [cleanupLoading, setCleanupLoading] = useState(false)

  const mutation = useMutation(
    forgeAPI.transcribe.updateTranscription
      .input({ id: entry.id })
      .mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['momentVault', 'entries']
          })
        },
        onError: (error: any) => {
          console.error('Error updating transcription:', error)
          toast.error(
            'An error occurred while updating the transcription. Please try again.'
          )
        }
      })
  )

  const { formProps } = defineForm<{
    transcription: string
  }>({
    title: 'Edit Transcription',
    onClose,
    namespace: 'apps.momentVault',
    icon: 'tabler:pencil',
    submitButton: 'update',
    actionButton: {
      icon: 'mage:stars-c',
      namespace: 'apps.momentVault',
      children: 'Cleanup',
      loading: cleanupLoading,
      onClick: async (data, setData) => {
        try {
          setCleanupLoading(true)

          const shouldUseNewText =
            data.transcription.trim() !== entry.transcription?.trim()

          const response = await forgeAPI.transcribe.cleanupTranscription
            .input({
              id: entry.id,
              newText: shouldUseNewText ? data.transcription : undefined
            })
            .mutate({})

          setData({ transcription: response })
          setCleanupLoading(false)
        } catch (error: any) {
          console.error('Error cleaning up transcription:', error)
          toast.error(
            'An error occurred while cleaning up the transcription. Please try again.'
          )
        }
      }
    }
  })
    .typesMap({
      transcription: 'textarea'
    })
    .setupFields({
      transcription: {
        label: 'Transcription',
        required: true,
        icon: 'tabler:file-text',
        placeholder: 'Enter the transcription text here...'
      }
    })
    .initialData({
      transcription: entry.transcription
    })
    .onSubmit(async values => {
      mutation.mutateAsync(values)
    })
    .build()

  return (
    <FormModal {...formProps}>
      <AudioPlayer audioPlayerContext={audioPlayerContext} entry={entry} />
    </FormModal>
  )
}

export default EditTranscriptionModal
