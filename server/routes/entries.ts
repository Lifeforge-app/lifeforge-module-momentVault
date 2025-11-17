import { PBService } from '@functions/database'
import { forgeController, forgeRouter } from '@functions/routes'
import { ClientError } from '@functions/routes/utils/response'
import fs from 'fs'
import z from 'zod'

import { convertToMp3 } from '../utils/convertToMP3'

const list = forgeController
  .query()
  .description({
    en: 'Get paginated list of moment vault entries',
    ms: 'Dapatkan senarai halaman entri peti saat',
    'zh-CN': '获取分页的回忆金库条目列表',
    'zh-TW': '獲取分頁的回憶金庫條目列表'
  })
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
      .collection('moment_vault__entries')
      .page(page)
      .perPage(10)
      .sort(['-created'])
      .execute()
  )

export const createAudioEntry = async (
  pb: PBService,
  {
    file,
    transcription
  }: {
    file: Express.Multer.File
    transcription?: string
  }
) => {
  if (file.mimetype !== 'audio/mp3') {
    file.path = await convertToMp3(file.path)
  }

  const fileBuffer = fs.readFileSync(file.path)

  const entry = await pb.create
    .collection('moment_vault__entries')
    .data({
      type: 'audio',
      file: new File([fileBuffer], file.path.split('/').pop() || 'audio.mp3'),
      transcription
    })
    .execute()

  fs.unlinkSync(file.path)

  return entry
}

export const createTextEntry = async (pb: PBService, content: string) =>
  pb.create
    .collection('moment_vault__entries')
    .data({
      type: 'text',
      content
    })
    .execute()

export const createPhotosEntry = async (
  pb: PBService,
  files: Express.Multer.File[]
) => {
  const allImages = files.map(file => {
    const fileBuffer = fs.readFileSync(file.path)

    return new File([fileBuffer], file.path.split('/').pop() || 'photo.jpg')
  })

  const entry = await pb.create
    .collection('moment_vault__entries')
    .data({
      type: 'photos',
      file: allImages
    })
    .execute()

  return entry
}

const create = forgeController
  .mutation()
  .description({
    en: 'Create a new moment vault entry',
    ms: 'Cipta entri peti saat baharu',
    'zh-CN': '创建新的回忆金库条目',
    'zh-TW': '創建新的回憶金庫條目'
  })
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

const update = forgeController
  .mutation()
  .description({
    en: 'Update content of a moment vault entry',
    ms: 'Kemas kini kandungan entri peti saat',
    'zh-CN': '更新回忆金库条目的内容',
    'zh-TW': '更新回憶金庫條目的內容'
  })
  .input({
    query: z.object({
      id: z.string()
    }),
    body: z.object({
      content: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'moment_vault__entries'
  })
  .callback(({ pb, query: { id }, body: { content } }) =>
    pb.update
      .collection('moment_vault__entries')
      .id(id)
      .data({ content })
      .execute()
  )

const toggleReviewed = forgeController
  .mutation()
  .description({
    en: 'Toggle reviewed status of an audio entry',
    ms: 'Togol status semakan entri audio',
    'zh-CN': '切换音频条目的审阅状态',
    'zh-TW': '切換音訊條目的審閱狀態'
  })
  .input({
    query: z.object({
      id: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'moment_vault__entries'
  })
  .callback(async ({ pb, query: { id } }) => {
    const entry = await pb.getOne
      .collection('moment_vault__entries')
      .id(id)
      .execute()

    if (entry.type !== 'audio') {
      throw new ClientError(
        'Reviewed status can only be toggled for audio entries'
      )
    }

    const updatedEntry = await pb.update
      .collection('moment_vault__entries')
      .id(id)
      .data({
        reviewed: !entry.reviewed
      })
      .execute()

    return updatedEntry
  })

const remove = forgeController
  .mutation()
  .description({
    en: 'Delete a moment vault entry',
    ms: 'Padam entri peti saat',
    'zh-CN': '删除回忆金库条目',
    'zh-TW': '刪除回憶金庫條目'
  })
  .input({
    query: z.object({
      id: z.string()
    })
  })
  .existenceCheck('query', {
    id: 'moment_vault__entries'
  })
  .statusCode(204)
  .callback(({ pb, query: { id } }) =>
    pb.delete.collection('moment_vault__entries').id(id).execute()
  )

export default forgeRouter({
  list,
  create,
  update,
  toggleReviewed,
  remove
})
