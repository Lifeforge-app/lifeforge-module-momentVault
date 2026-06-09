import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { InferInput } from '@lifeforge/api'
import { FormModal, defineForm, toast } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import type { MomentVaultEntry } from '..'

function ModifyTextEntryModal({
  data: { initialData },
  onClose
}: {
  data: {
    initialData?: MomentVaultEntry
  }
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation(
    forgeAPI.entries.update
      .input({
        id: initialData?.id || ''
      })
      .mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['momentVault', 'entries']
          })
          onClose()
        },
        onError: () => {
          toast.error('Failed to modify text entry')
        }
      })
  )

  const { formProps } = defineForm<
    InferInput<typeof forgeAPI.entries.update>['body']
  >({
    title: 'Update Entry',
    namespace: 'apps.momentVault',
    icon: 'tabler:pencil',
    onClose,
    submitButton: 'update'
  })
    .typesMap({
      content: 'textarea'
    })
    .setupFields({
      content: {
        placeholder: 'Something amazing happened today...',
        required: true,
        icon: 'tabler:file-text',
        label: 'Text Content'
      }
    })
    .initialData({
      content: initialData?.content || ''
    })
    .onSubmit(async data => {
      await mutation.mutateAsync(data)
    })
    .build()

  return <FormModal {...formProps} />
}

export default ModifyTextEntryModal
