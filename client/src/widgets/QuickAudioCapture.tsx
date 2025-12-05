import recordEndSfx from '@/assets/record_end.opus'
import recordStartSfx from '@/assets/record_start.opus'
import forgeAPI from '@/utils/forgeAPI'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Widget } from 'lifeforge-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { type WidgetConfig, useDivSize } from 'shared'

type RecordingState = 'idle' | 'recording' | 'submitting'

function QuickAudioCapture() {
  const queryClient = useQueryClient()

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const { width, height } = useDivSize(wrapperRef)

  const [state, setState] = useState<RecordingState>('idle')

  const streamRef = useRef<MediaStream | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const audioChunksRef = useRef<Blob[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)

  const startSoundBufferRef = useRef<AudioBuffer | null>(null)

  const endSoundBufferRef = useRef<AudioBuffer | null>(null)

  const audioInitializedRef = useRef(false)

  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    audioInitializedRef.current = true

    try {
      // Use AudioContext for better mobile compatibility
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextClass) return

      audioContextRef.current = new AudioContextClass()

      // Resume context (required for mobile after user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Load and decode audio files
      const [startResponse, endResponse] = await Promise.all([
        fetch(recordStartSfx),
        fetch(recordEndSfx)
      ])

      const [startArrayBuffer, endArrayBuffer] = await Promise.all([
        startResponse.arrayBuffer(),
        endResponse.arrayBuffer()
      ])

      const [startBuffer, endBuffer] = await Promise.all([
        audioContextRef.current.decodeAudioData(startArrayBuffer),
        audioContextRef.current.decodeAudioData(endArrayBuffer)
      ])

      startSoundBufferRef.current = startBuffer
      endSoundBufferRef.current = endBuffer
    } catch {
      // Silently fail - audio feedback is non-critical
      audioInitializedRef.current = false
    }
  }, [])

  const playSound = useCallback((buffer: AudioBuffer | null): Promise<void> => {
    return new Promise(resolve => {
      if (!buffer || !audioContextRef.current) {
        resolve()

        return
      }

      try {
        // Resume context if suspended (can happen on mobile)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
        }

        const source = audioContextRef.current.createBufferSource()

        source.buffer = buffer
        source.connect(audioContextRef.current.destination)
        source.onended = () => resolve()
        source.start(0)
      } catch {
        // Silently fail
        resolve()
      }
    })
  }, [])

  const startRecording = useCallback(async () => {
    await initAudio()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

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

      // Play start sound and wait for it to finish before recording
      await playSound(startSoundBufferRef.current)

      mediaRecorder.start()
      setState('recording')
    } catch {
      toast.error('Failed to access microphone')
    }
  }, [initAudio, playSound])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') return

    // Play end sound before stopping (while context is still active)
    playSound(endSoundBufferRef.current)

    return new Promise<void>(resolve => {
      mediaRecorderRef.current!.onstop = async () => {
        streamRef.current?.getTracks().forEach(track => track.stop())

        if (audioChunksRef.current.length === 0) {
          setState('idle')
          resolve()

          return
        }

        setState('submitting')

        const file = new File(
          audioChunksRef.current,
          `audio.${audioChunksRef.current[0].type.split('/')[1]}`,
          { type: audioChunksRef.current[0].type }
        )

        try {
          await forgeAPI.momentVault.entries.create.mutate({
            type: 'audio',
            files: [file]
          })

          toast.success('Audio moment captured!')
          queryClient.invalidateQueries({
            queryKey: ['momentVault', 'entries']
          })
        } catch {
          toast.error('Failed to save audio')
        } finally {
          setState('idle')
          resolve()
        }
      }

      mediaRecorderRef.current!.stop()
    })
  }, [state, queryClient, playSound])

  const activePointerRef = useRef<number | null>(null)

  const stopRecordingRef = useRef(stopRecording)

  stopRecordingRef.current = stopRecording

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (activePointerRef.current === e.pointerId) {
        activePointerRef.current = null
        stopRecordingRef.current()
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      activePointerRef.current = e.pointerId

      if (state === 'idle') {
        startRecording()
      }
    },
    [state, startRecording]
  )

  return (
    <Widget
      className="p-2! min-[400px]:p-4!"
      icon="tabler:microphone"
      namespace="apps.momentVault"
    >
      <div ref={wrapperRef} className="flex-center min-h-0 flex-1">
        <Button
          className={`aspect-square touch-none min-[400px]:rounded-full! ${
            width < height ? 'h-full w-full min-[400px]:h-auto' : 'h-full'
          } ${state === 'recording' ? 'animate-pulse' : ''}`}
          icon={
            state === 'recording'
              ? 'tabler:player-stop-filled'
              : 'tabler:microphone'
          }
          iconClassName="size-full! sm:size-10!"
          loading={state === 'submitting'}
          variant={state === 'recording' ? 'secondary' : 'primary'}
          onPointerDown={handlePointerDown}
        />
      </div>
    </Widget>
  )
}

export default QuickAudioCapture

export const config: WidgetConfig = {
  namespace: 'apps.momentVault',
  id: 'quickAudioCapture',
  icon: 'tabler:microphone',
  minW: 1,
  maxW: 1,
  minH: 1,
  maxH: 1
}
