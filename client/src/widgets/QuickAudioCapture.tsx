import forgeAPI from '@/utils/forgeAPI'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Widget } from 'lifeforge-ui'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import type { WidgetConfig } from 'shared'

type RecordingState = 'idle' | 'recording' | 'submitting'

function QuickAudioCapture() {
  const queryClient = useQueryClient()

  const [state, setState] = useState<RecordingState>('idle')

  const streamRef = useRef<MediaStream | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const audioChunksRef = useRef<Blob[]>([])

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
    } catch {
      toast.error('Failed to access microphone')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') return

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
  }, [state, queryClient])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()

      if (state === 'idle') {
        startRecording()
      }
    },
    [state, startRecording]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()

      if (state === 'recording') {
        stopRecording()
      }
    },
    [state, stopRecording]
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()

      if (state === 'recording') {
        stopRecording()
      }
    },
    [state, stopRecording]
  )

  return (
    <Widget icon="tabler:microphone" namespace="apps.momentVault">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Button
          className={`size-20! rounded-full! ${state === 'recording' ? 'animate-pulse' : ''}`}
          icon={
            state === 'recording'
              ? 'tabler:player-stop-filled'
              : 'tabler:microphone'
          }
          iconClassName="size-10!"
          loading={state === 'submitting'}
          variant={state === 'recording' ? 'secondary' : 'primary'}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
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
