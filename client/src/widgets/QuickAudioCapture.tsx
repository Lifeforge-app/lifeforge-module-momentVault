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

  const isStartingRef = useRef(false)

  const lastVibrationRef = useRef(0)

  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      const now = Date.now()

      // Debounce vibrations - ignore if less than 300ms since last vibration
      if (now - lastVibrationRef.current < 300) return

      lastVibrationRef.current = now
      navigator.vibrate(0)
      navigator.vibrate(pattern)
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (isStartingRef.current) return

    isStartingRef.current = true

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

      // Short vibration to indicate recording started
      vibrate(50)

      mediaRecorder.start()
      setState('recording')
    } catch {
      toast.error('Failed to access microphone')
    } finally {
      isStartingRef.current = false
    }
  }, [vibrate])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') return

    // Double vibration to indicate recording stopped
    vibrate([30, 80, 30])

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
  }, [state, queryClient, vibrate])

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

      // Prevent multiple pointer events from triggering
      if (activePointerRef.current !== null) return

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
