import recordEndSfx from '@/assets/record_end.opus'
import recordStartSfx from '@/assets/record_start.opus'
import forgeAPI from '@/utils/forgeAPI'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Widget } from 'lifeforge-ui'
import { useCallback, useRef, useState } from 'react'
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

  const playSound = useCallback((src: string) => {
    const audio = new Audio(src)

    audio.play().catch(() => {})
  }, [])

  const startRecording = useCallback(async () => {
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

      mediaRecorder.start()
      setState('recording')
      playSound(recordStartSfx)
    } catch {
      toast.error('Failed to access microphone')
    }
  }, [playSound])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') return

    playSound(recordEndSfx)

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      activePointerRef.current = e.pointerId

      if (state === 'idle') {
        startRecording()
      }
    },
    [state, startRecording]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()

      if (activePointerRef.current !== e.pointerId) return

      e.currentTarget.releasePointerCapture(e.pointerId)
      activePointerRef.current = null

      if (state === 'recording') {
        stopRecording()
      }
    },
    [state, stopRecording]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()

      if (activePointerRef.current !== e.pointerId) return

      activePointerRef.current = null

      if (state === 'recording') {
        stopRecording()
      }
    },
    [state, stopRecording]
  )

  const handleLostPointerCapture = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerRef.current !== e.pointerId) return

      activePointerRef.current = null

      if (state === 'recording') {
        stopRecording()
      }
    },
    [state, stopRecording]
  )

  return (
    <Widget
      className="p-2! min-[400px]:p-4!"
      icon="tabler:microphone"
      namespace="apps.momentVault"
    >
      <div ref={wrapperRef} className="flex-center min-h-0 flex-1">
        <Button
          className={`aspect-square min-[400px]:rounded-full! ${
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
          onLostPointerCapture={handleLostPointerCapture}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
