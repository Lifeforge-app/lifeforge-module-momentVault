import { ClientError, type IPBService } from '@lifeforge/server-utils'
import fs from 'fs'
import z from 'zod'

import forge from '../forge'
import schema from '../schema'
import { convertToMp3 } from '../utils/convertToMP3'

export const list = forge
  .query()
  .description('Get paginated list of moment vault entries')
  .input({
    query: z.object({
      page: z
        .string()
        .optional()
        .transform(val => parseInt(val ?? '1', 10) || 1)
    })
  })
  .callback(async ({ pb, query: { page } }) =>
    pb.getList
      .collection('entries')
      .page(page)
      .perPage(10)
      .sort(['-created'])
      .execute()
  )

const createAudioEntry = async (
  pb: IPBService<typeof schema>,
  {
    file,
    transcription
  }: {
    file: any
    transcription?: string
  }
) => {
  if (file.mimetype !== 'audio/mp3') {
    file.path = await convertToMp3(file.path)
  }

  const fileBuffer = fs.readFileSync(file.path)

  const entry = await pb.create
    .collection('entries')
    .data({
      type: 'audio',
      file: new File([fileBuffer], file.path.split('/').pop() || 'audio.mp3'),
      transcription
    })
    .execute()

  fs.unlinkSync(file.path)

  return entry
}

const createTextEntry = async (
  pb: IPBService<typeof schema>,
  content: string
) =>
  pb.create
    .collection('entries')
    .data({
      type: 'text',
      content
    })
    .execute()

const createPhotosEntry = async (
  pb: IPBService<typeof schema>,
  files: any[]
) => {
  const allImages = files.map(file => {
    const fileBuffer = fs.readFileSync(file.path)

    return new File([fileBuffer], file.path.split('/').pop() || 'photo.jpg')
  })

  const entry = await pb.create
    .collection('entries')
    .data({
      type: 'photos',
      file: allImages
    })
    .execute()

  return entry
}

export const create = forge
  .mutation()
  .description('Create a new moment vault entry')
  .input({
    body: z.object({
      type: z.enum(['text', 'audio', 'photos']),
      content: z.string().optional(),
      transcription: z.string().optional()
    })
  })
  .media({
    files: {
      multiple: true,
      optional: true
    }
  })
  .statusCode(201)
  .callback(
    async ({
      pb,
      body: { type, content, transcription },
      media: { files }
    }) => {
      if (type === 'audio') {
        if (!files?.length) {
          throw new ClientError('No file uploaded')
        }

        if (files.length > 1) {
          throw new ClientError('Only one audio file is allowed')
        }

        if (!files[0].mimetype.startsWith('audio/')) {
          throw new ClientError('File must be an audio file')
        }

        return await createAudioEntry(pb, {
          file: files[0],
          transcription
        })
      }

      if (type === 'text') {
        if (!content) {
          throw new ClientError('Content is required for text entries')
        }

        return await createTextEntry(pb, content)
      }

      if (type === 'photos') {
        if (!files?.length) {
          throw new ClientError('No files uploaded')
        }

        return await createPhotosEntry(pb, files)
      }
      throw new ClientError('Invalid entry type')
    }
  )

export const update = forge
  .mutation()
  .description('Update content of a moment vault entry')
  .input({
    query: z.object({
      id: z.string()
    }),
    body: z.object({
      content: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .callback(({ pb, query: { id }, body: { content } }) =>
    pb.update.collection('entries').id(id).data({ content }).execute()
  )

export const toggleReviewed = forge
  .mutation()
  .description('Toggle reviewed status of an audio entry')
  .input({
    query: z.object({
      id: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .callback(async ({ pb, query: { id } }) => {
    const entry = await pb.getOne.collection('entries').id(id).execute()

    if (entry.type !== 'audio') {
      throw new ClientError(
        'Reviewed status can only be toggled for audio entries'
      )
    }

    const updatedEntry = await pb.update
      .collection('entries')
      .id(id)
      .data({
        reviewed: !entry.reviewed
      })
      .execute()

    return updatedEntry
  })

export const remove = forge
  .mutation()
  .description('Delete a moment vault entry')
  .input({
    query: z.object({
      id: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'entries'
  })
  .statusCode(204)
  .callback(({ pb, query: { id } }) =>
    pb.delete.collection('entries').id(id).execute()
  )
