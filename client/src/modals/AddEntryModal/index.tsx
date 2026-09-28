import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  ConfirmationModal,
  Flex,
  Icon,
  ListboxInput,
  ListboxOption,
  ModalHeader,
  Stack,
  Text,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import AudioType from './components/AudioType'
import PhotoType from './components/PhotoType'
import TextType from './components/TextType'

const TYPES = [
  {
    id: 'text',
    icon: 'tabler:file-text'
  },
  {
    id: 'audio',
    icon: 'tabler:microphone'
  },
  {
    id: 'photos',
    icon: 'tabler:photo'
  },
  {
    id: 'video',
    icon: 'tabler:video'
  }
]

function AddEntryModal({
  data: { type },
  onClose
}: {
  data: {
    type: 'text' | 'audio' | 'photos' | 'video'
  }
  onClose: () => void
}) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const queryClient = useQueryClient()
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string | null>(null)

  const [innerOpenType, setInnerOpenType] = useState<
    'text' | 'audio' | 'photos' | 'video'
  >(type)

  const handleOverrideAudioConfirm = useCallback(() => {
    open(ConfirmationModal, {
      title: 'Overwrite Audio',
      description: 'Are you sure you want to overwrite the current audio?',
      confirmationButton: 'confirm',
      onConfirm: async () => {
        setAudioURL(null)
        setTranscription(null)
      }
    })
  }, [])

  useEffect(() => {
    if (type === null) {
      setAudioURL(null)
      setTranscription(null)
    }
  }, [type])

  return (
    <Box minWidth="50vw">
      <ModalHeader icon="tabler:plus" title="Add Entry" onClose={onClose} />
      <Stack gap="sm">
        <ListboxInput
          required
          icon="tabler:apps"
          label="Entry Type"
          renderContent={() => (
            <Flex align="center" gap="sm">
              <Icon
                icon={TYPES.find(l => l.id === innerOpenType)?.icon ?? ''}
              />
              <Text truncate display="block">
                {t(`entryTypes.${TYPES.find(l => l.id === innerOpenType)?.id}`)}
              </Text>
            </Flex>
          )}
          value={innerOpenType}
          onChange={setInnerOpenType}
        >
          {TYPES.map(({ id, icon }, i) => (
            <ListboxOption
              key={i}
              icon={icon}
              label={t(`entryTypes.${id}`)}
              value={id}
            />
          ))}
        </ListboxInput>
        {(() => {
          const components = {
            audio: (
              <AudioType
                audioURL={audioURL}
                setAudioURL={setAudioURL}
                setOverwriteAudioWarningModalOpen={handleOverrideAudioConfirm}
                setTranscription={setTranscription}
                transcription={transcription}
                onSuccess={() => {
                  onClose()
                  queryClient.invalidateQueries({
                    queryKey: forgeAPI.entries.key
                  })
                }}
              />
            ),
            text: (
              <TextType
                onSuccess={() => {
                  onClose()
                  queryClient.invalidateQueries({
                    queryKey: forgeAPI.entries.key
                  })
                }}
              />
            ),
            photos: (
              <PhotoType
                onSuccess={() => {
                  onClose()
                  queryClient.invalidateQueries({
                    queryKey: forgeAPI.entries.key
                  })
                }}
              />
            )
          }

          return components[innerOpenType as keyof typeof components] || <></>
        })()}
      </Stack>
    </Box>
  )
}

export default AddEntryModal
