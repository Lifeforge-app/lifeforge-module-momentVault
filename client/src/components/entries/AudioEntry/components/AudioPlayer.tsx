import type { MomentVaultEntry } from '@'
import WavesurferPlayer from '@wavesurfer/react'
import dayjs from 'dayjs'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import type WaveSurfer from 'wavesurfer.js'

import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useModalStore,
  usePersonalization
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import {
  type AudioPlayerContextType,
  useAudioPlayer
} from '@/providers/AudioPlayerProvider'

// Separate component for timer display to prevent parent rerenders
const TimeDisplay = memo(
  ({ currentTime, totalTime }: { currentTime: number; totalTime: number }) => (
    <Box width={{ base: '100%', sm: 'auto' }}>
      <Text align="left" color="muted" size="sm" whiteSpace="nowrap">
        {dayjs().startOf('day').second(currentTime).format('mm:ss')} /{' '}
        {dayjs().startOf('day').second(totalTime).format('mm:ss')}
      </Text>
    </Box>
  )
)

TimeDisplay.displayName = 'TimeDisplay'

function AudioPlayer({
  entry,
  audioPlayerContext
}: {
  entry: MomentVaultEntry
  audioPlayerContext?: AudioPlayerContextType
}) {
  const { stack } = useModalStore()
  const instanceId = useId()
  const contextFromProvider = useAudioPlayer()

  const {
    registerPlayer,
    unregisterPlayer,
    pauseOthers,
    currentActive,
    setCurrentActive,
    playbackSpeed,
    setPlaybackSpeed
  } = useMemo(
    () => audioPlayerContext ?? contextFromProvider,
    [audioPlayerContext, contextFromProvider]
  )

  const {
    derivedTheme,
    bgTempPalette,
    derivedThemeColor: themeColor
  } = usePersonalization()

  const [ready, setReady] = useState(false)
  const [totalTime, setTotalTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaUrl = useMemo(
    () =>
      forgeAPI.getMedia({
        collectionId: entry.collectionId,
        recordId: entry.id,
        fieldId: entry.file?.[0]
      }),
    [entry.collectionId, entry.id, entry.file]
  )

  const onReady = useCallback(
    (ws: WaveSurfer) => {
      setWavesurfer(ws)
      setTotalTime(ws.getDuration())
      setIsPlaying(false)
      setReady(true)
      ws.setPlaybackRate(playbackSpeed)

      registerPlayer(instanceId, ws)

      ws.on('timeupdate', () => {
        setCurrentTime(ws.getCurrentTime())
      })
    },
    [instanceId, registerPlayer, playbackSpeed]
  )

  useEffect(() => {
    return () => {
      if (wavesurfer) {
        unregisterPlayer(instanceId)
      }
    }
  }, [wavesurfer, instanceId, unregisterPlayer])

  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.setPlaybackRate(playbackSpeed)
    }
  }, [playbackSpeed, wavesurfer])

  const onPlayPause = useCallback(() => {
    if (wavesurfer) {
      pauseOthers(instanceId)
      wavesurfer.playPause()
      setCurrentActive(instanceId)
    }
  }, [wavesurfer, instanceId, pauseOthers, setCurrentActive])

  useEffect(() => {
    if (stack.length > 0) return

    // Force rerender the component
    // This is a workaround for the issue where the component does not rerender properly for some reason
    const el = document.getElementById(`audio-entry-${entry.id}`)

    if (el) {
      el.style.willChange = 'opacity, transform'
      el.getBoundingClientRect()
    }
  }, [stack])

  return (
    <Flex align="center" gap="sm" mb="md" minWidth="0" width="100%">
      {ready && (
        <>
          {currentActive === instanceId && (
            <Button
              mb={{ base: 'lg', sm: 'none' }}
              p="sm"
              px="md"
              variant="secondary"
              onClick={() => {
                let newSpeed = playbackSpeed + 0.5

                if (newSpeed > 2) {
                  newSpeed = 0.5
                }

                setPlaybackSpeed?.(newSpeed)
              }}
            >
              {playbackSpeed?.toFixed(1)}x
            </Button>
          )}
          <Button
            icon={isPlaying ? 'tabler:pause' : 'tabler:play'}
            mb={{ base: 'lg', sm: 'none' }}
            onClick={onPlayPause}
          />
        </>
      )}
      <Flex
        align="center"
        direction={{ base: 'column', sm: 'row' }}
        gap="sm"
        minWidth="0"
        position="relative"
        width="100%"
      >
        {!ready && (
          <Icon
            color="muted"
            icon="svg-spinners:ring-resize"
            position="absolute"
            size="2rem"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
        <Box width="100%">
          <WavesurferPlayer
            barGap={2}
            barRadius={100}
            barWidth={3}
            cursorColor={themeColor}
            height={50}
            progressColor={themeColor}
            url={mediaUrl}
            waveColor={
              derivedTheme === 'dark' ? bgTempPalette[700] : bgTempPalette[400]
            }

            width="100%"
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onReady={onReady}
          />
        </Box>
        {ready && (
          <>
            <TimeDisplay currentTime={currentTime} totalTime={totalTime} />
          </>
        )}
      </Flex>
    </Flex>
  )
}

export default AudioPlayer
