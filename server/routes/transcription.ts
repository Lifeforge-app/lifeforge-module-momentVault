import { ClientError } from '@lifeforge/server-utils'
import fs from 'fs'
import request from 'request'
import z from 'zod'

import forge from '../forge'
import { convertToMp3 } from '../utils/convertToMP3'
import { getTranscription } from '../utils/transcription'

export const transcribeExisted = forge
  .mutation()
  .description('Transcribe an existing audio entry')
  .input({
    query: z.object({
      id: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .callback(
    async ({
      pb,
      query: { id },
      core: {
        api: { getAPIKey }
      }
    }) => {
      const apiKey = await getAPIKey('openai', pb)

      if (!apiKey) {
        throw new ClientError('API key not found')
      }

      const entry = await pb.getOne.collection('entries').id(id).execute()

      if (!entry.file) {
        throw new ClientError('No audio file found in entry')
      }

      const fileURL = pb.instance.files.getURL(entry, entry.file[0])

      try {
        let filePath = `medium/${fileURL.split('/').pop()}`

        const fileStream = fs.createWriteStream(filePath)

        request(fileURL).pipe(fileStream)

        await new Promise(resolve => {
          fileStream.on('finish', () => {
            resolve(null)
          })
        })

        if (!filePath.endsWith('.mp3')) {
          const mp3Path = await convertToMp3(filePath)

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }

          filePath = mp3Path
        }

        const response = await getTranscription(filePath, apiKey)

        if (!response) {
          throw new Error('Transcription failed')
        }

        await pb.update
          .collection('entries')
          .id(id)
          .data({
            transcription: response
          })
          .execute()

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }

        return response
      } catch (err) {
        console.error('Error during transcription:', err)
        throw new Error('Failed to transcribe audio file')
      } finally {
        const filePath = `medium/${fileURL.split('/').pop()}`

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }
  )

export const transcribeNew = forge
  .mutation()
  .description('Transcribe a new audio file')
  .input({})
  .media({
    file: {
      optional: false
    }
  })
  .callback(
    async ({
      pb,
      media: { file },
      core: {
        api: { getAPIKey }
      }
    }) => {
      if (!file || typeof file === 'string') {
        throw new ClientError('No file uploaded')
      }

      if (file.mimetype !== 'audio/mp3') {
        file.path = await convertToMp3(file.path)
      }

      const apiKey = await getAPIKey('openai', pb)

      if (!apiKey) {
        throw new ClientError('API key not found')
      }

      const response = await getTranscription(file.path, apiKey)

      if (!response) {
        throw new Error('Transcription failed')
      }

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }

      return response
    }
  )

export const updateTranscription = forge
  .mutation()
  .description('Update transcription of an audio entry')
  .input({
    query: z.object({
      id: z.string()
    }),
    body: z.object({
      transcription: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .callback(async ({ pb, query: { id }, body: { transcription } }) => {
    const entry = await pb.update
      .collection('entries')
      .id(id)
      .data({
        transcription
      })
      .execute()

    return entry
  })

export const cleanupTranscription = forge
  .mutation()
  .description('Clean up and improve transcription text')
  .input({
    query: z.object({
      id: z.string(),
      newText: z.string().optional()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .callback(
    async ({
      pb,
      query: { id, newText },
      core: {
        api: { getAPIKey, fetchAI }
      }
    }) => {
      const apiKey = await getAPIKey('openai', pb)

      if (!apiKey) {
        throw new ClientError('API key not found')
      }

      let textToCleanUp: string

      if (!newText) {
        const entry = await pb.getOne.collection('entries').id(id).execute()

        if (!entry.transcription) {
          throw new ClientError('No transcription data to clean up')
        }

        textToCleanUp = entry.transcription
      } else {
        textToCleanUp = newText
      }

      const response = await fetchAI({
        provider: 'openai',
        model: 'gpt-4o-mini',
        pb,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert text cleaner. Your task is to clean up the provided transcription text by adding appropriate punctuation, fixing grammatical errors, and improving overall readability. Ensure the cleaned transcription maintains the original wordings and meaning while enhancing its clarity and flow.'
          },
          {
            role: 'user',
            content: `Please clean up the following transcription:\n\n${textToCleanUp}`
          }
        ],
        structure: z.object({
          cleanedTranscription: z.string()
        })
      })

      if (!response || !response.cleanedTranscription) {
        throw new Error('Failed to clean up transcription')
      }

      return response.cleanedTranscription
    }
  )
