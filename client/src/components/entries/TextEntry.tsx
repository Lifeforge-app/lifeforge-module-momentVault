import type { MomentVaultEntry } from '@'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback } from 'react'

import {
  Box,
  Card,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Text,
  useModalStore
} from '@lifeforge/ui'

import ModifyTextEntryModal from '@/modals/ModifyTextEntryModal'

dayjs.extend(relativeTime)

function TextEntry({
  entry,
  onDelete
}: {
  entry: MomentVaultEntry
  onDelete: () => void
}) {
  const { open } = useModalStore()

  const handleUpdateEntry = useCallback(() => {
    open(ModifyTextEntryModal, {
      initialData: entry
    })
  }, [entry])

  return (
    <Card as="li">
      <Box mr="3xl">
        <Box pl="md" position="relative">
          <Box
            bg="primary"
            bottom="0"
            left="0"
            position="absolute"
            r="full"
            top="0"
            width="0.25rem"
          />
          <Text as="p" color="muted" whiteSpace="pre-wrap">
            {entry.content}
          </Text>
        </Box>
        <Flex align="center" gap="sm" mt="md">
          <Icon color="muted" icon="tabler:clock" />
          <Text color="muted">{dayjs(entry.created).fromNow()}</Text>
        </Flex>
      </Box>
      <ContextMenu position="absolute" right="1rem" top="1rem">
        <ContextMenuItem
          icon="tabler:pencil"
          label="Edit"
          onClick={handleUpdateEntry}
        />
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

export default TextEntry
