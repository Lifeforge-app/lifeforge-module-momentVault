import type { MomentVaultEntry } from '@'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import z from 'zod'

import { useForgeMutation } from '@lifeforge/api'
import {
  Button,
  FormModal,
  TextAreaField,
  createDefaultValues,
  toast
} from '@lifeforge/ui'

import AudioPlayer from '@/components/entries/AudioEntry/components/AudioPlayer'
import { forgeAPI } from '@/manifest'
import type { AudioPlayerContextType } from '@/providers/AudioPlayerProvider'

const schema = z.object({
  transcription: z.string().min(1, 'Required')
})

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
  const [cleanupLoading, setCleanupLoading] = useState(false)

  const updateMutation = useForgeMutation(
    forgeAPI.transcribe.updateTranscription.input({ id: entry.id }),
    {
      action: 'update',
      queryKey: forgeAPI.entries.key
    }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      transcription: entry.transcription
    },
    resolver: zodResolver(schema)
  })

  async function handleCleanup() {
    try {
      setCleanupLoading(true)

      const transcription = form.getValues('transcription')

      const shouldUseNewText =
        transcription.trim() !== entry.transcription?.trim()

      const response = await forgeAPI.transcribe.cleanupTranscription
        .input({
          id: entry.id,
          newText: shouldUseNewText ? transcription : undefined
        })
        .mutate(undefined)

      form.setValue('transcription', response, { shouldValidate: true })
    } catch (error) {
      console.error('Error cleaning up transcription:', error)
      toast.error(
        'An error occurred while cleaning up the transcription. Please try again.'
      )
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: 'update',
        handler: updateMutation.mutateAsync
      }}
      uiConfig={{
        icon: 'tabler:pencil',
        namespace: 'apps.momentVault',
        title: 'Edit Transcription',
        onClose,
        headerActions: (
          <Button
            icon="mage:stars-c"
            loading={cleanupLoading}
            namespace="apps.momentVault"
            onClick={handleCleanup}
          >
            Cleanup
          </Button>
        )
      }}
    >
      <TextAreaField
        required
        control={form.control}
        icon="tabler:file-text"
        label="Transcription"
        name="transcription"
        placeholder="Enter the transcription text here..."
      />
      <AudioPlayer audioPlayerContext={audioPlayerContext} entry={entry} />
    </FormModal>
  )
}

export default EditTranscriptionModal
