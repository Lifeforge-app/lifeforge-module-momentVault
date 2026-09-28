import { type UseQueryResult, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

import type { InferOutput } from '@lifeforge/api'
import {
  ConfirmationModal,
  EmptyStateScreen,
  Pagination,
  Stack,
  WithQuery,
  toast,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import AudioEntry from './entries/AudioEntry'
import PhotosEntry from './entries/PhotosEntry'
import TextEntry from './entries/TextEntry'

function EntryList({
  dataQuery,
  page,
  setPage
}: {
  dataQuery: UseQueryResult<InferOutput<typeof forgeAPI.entries.list>>
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}) {
  const queryClient = useQueryClient()
  const { open } = useModalStore()

  const handleDeleteEntry = useCallback(
    (entryId: string) => () => {
      open(ConfirmationModal, {
        title: 'Delete Entry',
        description: 'Are you sure you want to delete this entry?',
        confirmationButton: 'delete',
        onConfirm: async () => {
          try {
            await forgeAPI.entries.remove
              .input({
                id: entryId
              })
              .mutate(undefined)

            await queryClient.invalidateQueries({
              queryKey: forgeAPI.entries.key
            })
          } catch (error: any) {
            toast.error(`Failed to delete entry: ${error.message}`)
          }
        }
      })
    },
    [page]
  )

  useEffect(() => {
    const els = document.querySelectorAll<HTMLDivElement>('.pagination')

    els.forEach(el => {
      el.style.willChange = 'opacity, transform'
      el.getBoundingClientRect()
    })
  }, [dataQuery.data])

  return (
    <WithQuery query={dataQuery}>
      {data =>
        data.totalItems > 0 ? (
          <>
            <Pagination
              className="pagination"
              mb="lg"
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
            <Stack as="ul" gap="sm">
              {data.items.map(entry => {
                if (entry.type === 'audio') {
                  return (
                    <AudioEntry
                      key={entry.id}
                      currentPage={page}
                      entry={entry}
                      onDelete={handleDeleteEntry(entry.id)}
                    />
                  )
                }

                if (entry.type === 'text') {
                  return (
                    <TextEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDeleteEntry(entry.id)}
                    />
                  )
                }

                if (entry.type === 'photos') {
                  return (
                    <PhotosEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDeleteEntry(entry.id)}
                    />
                  )
                }
              })}
            </Stack>
            <Pagination
              className="pagination"
              mb={{ base: '3xl', md: 'lg' }}
              mt="lg"
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyStateScreen
            icon="tabler:history-off"
            message={{
              id: 'entries'
            }}
          />
        )
      }
    </WithQuery>
  )
}

export default EntryList
