import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useForgeMutation } from '@lifeforge/api'
import { FormModal, TextAreaField, createDefaultValues } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import type { MomentVaultEntry } from '..'

const schema = z.object({
  content: z.string().min(1, 'Required')
})

function ModifyTextEntryModal({
  data: { initialData },
  onClose
}: {
  data: {
    initialData?: MomentVaultEntry
  }
  onClose: () => void
}) {
  const updateMutation = useForgeMutation(
    forgeAPI.entries.update.input({ id: initialData?.id || '' }),
    {
      action: 'update',
      queryKey: forgeAPI.entries.key,
      onSuccess: () => onClose()
    }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      content: initialData?.content || ''
    },
    resolver: zodResolver(schema)
  })

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
        title: 'Update Entry',
        onClose
      }}
    >
      <TextAreaField
        required
        control={form.control}
        icon="tabler:file-text"
        label="Text Content"
        name="content"
        placeholder="Something amazing happened today..."
      />
    </FormModal>
  )
}

export default ModifyTextEntryModal
