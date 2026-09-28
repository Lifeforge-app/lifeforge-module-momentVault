import WavesurferPlayer from '@wavesurfer/react'
import dayjs from 'dayjs'
import { useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  colorWithOpacity,
  toast,
  usePersonalization
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

function AudioType({
  onSuccess,
  audioURL,
  setAudioURL,
  transcription,
  setTranscription,
  setOverwriteAudioWarningModalOpen
}: {
  onSuccess: () => void
  audioURL: string | null
  setAudioURL: (url: string | null) => void
  transcription: string | null
  setTranscription: (transcription: string | null) => void
  setOverwriteAudioWarningModalOpen: (open: boolean) => void
}) {
  const { t } = useModuleTranslation()

  const {
    derivedTheme,
    bgTempPalette,
    derivedThemeColor: themeColor
  } = usePersonalization()

  const [recording, setRecording] = useState(false)
  const [totalTime, setTotalTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcribeLoading, setTranscribeLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const startRecording = async () => {
    setCurrentTime(0)
    setTotalTime(0)

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    })

    streamRef.current = stream

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    })

    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      if (!audioChunksRef.current.length) {
        return
      }

      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioChunksRef.current[0].type
      })

      const url = URL.createObjectURL(audioBlob)

      setAudioURL(url)
    }

    mediaRecorder.start()
    setRecording(true)
  }

  const stopRecording = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const onReady = (ws: WaveSurfer) => {
    setWavesurfer(ws)
    setTotalTime(ws.getDuration())
    setIsPlaying(false)

    ws.on('timeupdate', () => {
      setCurrentTime(ws.getCurrentTime())
    })
  }

  const onPlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause()
    }
  }

  async function transcribeText() {
    setTranscribeLoading(true)

    const body = new FormData()

    const file = new File(
      audioChunksRef.current,
      `audio.${audioChunksRef.current[0].type.split('/')[1]}`,
      {
        type: audioChunksRef.current[0].type
      }
    )

    body.append('file', file)

    try {
      const data = await forgeAPI.transcribe.transcribeNew.mutate({
        file
      })

      setTranscription(data)
    } catch {
      toast.error(t('fetch.fetchError'))
    } finally {
      setTranscribeLoading(false)
    }
  }

  async function onSubmit() {
    setSubmitLoading(true)

    const file = new File(
      audioChunksRef.current,
      `audio.${audioChunksRef.current[0].type.split('/')[1]}`,
      {
        type: audioChunksRef.current[0].type
      }
    )

    try {
      await forgeAPI.entries.create.mutate({
        type: 'audio',
        files: [file],
        transcription: transcription ?? ''
      })

      onSuccess()
    } catch {
      toast.error(t('fetch.fetchError'))
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <>
      <Flex
        shadow
        bg={{
          base: colorWithOpacity('bg-200', '50%'),
          dark: colorWithOpacity('bg-800', '50%')
        }}
        direction="column"
        p="lg"
        r="md"
        width="100%"
      >
        <Flex align="center" gap="sm">
          <Icon color="muted" icon="tabler:microphone" size="1.5rem" />
          <Text color="muted" weight="medium">
            {t(`inputs.audio`)}{' '}
            <Text as="span" color="red-500">
              *
            </Text>
          </Text>
        </Flex>
        {audioURL && (
          <>
            <Flex
              shadow
              align="center"
              bg={{
                base: colorWithOpacity('bg-300', '50%'),
                dark: 'bg-800'
              }}
              gap="sm"
              mt="lg"
              p="md"
              pr={{ md: 'xl' }}
              r="md"
              width="100%"
            >
              <Button
                icon={isPlaying ? 'tabler:pause' : 'tabler:play'}
                onClick={onPlayPause}
              />
              <Flex
                align="center"
                direction={{ base: 'column', sm: 'row' }}
                gap="sm"
                width="100%"
              >
                <WavesurferPlayer
                  barGap={2}
                  barRadius={100}
                  barWidth={3}
                  cursorColor={themeColor}
                  height={50}
                  progressColor={themeColor}
                  url={audioURL}
                  waveColor={
                    derivedTheme === 'dark'
                      ? bgTempPalette[700]
                      : bgTempPalette[400]
                  }
                  width="100%"
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onReady={onReady}
                />
                <Box width={{ base: '100%', sm: 'auto' }}>
                  <Text
                    align="left"
                    color="muted"
                    size="sm"
                    whiteSpace="nowrap"
                  >
                    {dayjs().startOf('day').second(currentTime).format('mm:ss')}{' '}
                    / {dayjs().startOf('day').second(totalTime).format('mm:ss')}
                  </Text>
                </Box>
              </Flex>
            </Flex>
            {transcription && (
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
                <Text color="muted">{transcription}</Text>
              </Box>
            )}
            <Button
              icon="tabler:transfer"
              loading={transcribeLoading}
              mt="lg"
              variant="plain"
              width="100%"
              onClick={() => {
                transcribeText()
              }}
            >
              Transcribe To Text
            </Button>
          </>
        )}
        <Button
          icon={recording ? 'tabler:player-stop' : 'tabler:microphone'}
          mt="md"
          width="100%"
          onClick={() => {
            if (audioURL !== null) {
              setOverwriteAudioWarningModalOpen(true)

              return
            }

            if (recording) {
              stopRecording()
            } else {
              startRecording()
            }
          }}
        >
          {recording ? 'Stop' : 'Record'}
        </Button>
      </Flex>
      <Button
        disabled={!audioURL}
        icon="tabler:plus"
        loading={submitLoading}
        mt="xl"
        width="100%"
        onClick={onSubmit}
      >
        Create
      </Button>
    </>
  )
}

export default AudioType
