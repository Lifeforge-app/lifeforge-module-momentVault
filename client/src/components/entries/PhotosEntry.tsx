import type { MomentVaultEntry } from '@'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useState } from 'react'
import Zoom from 'react-medium-image-zoom'
import PhotoAlbum from 'react-photo-album'

import {
  Box,
  Card,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Text
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

dayjs.extend(relativeTime)

async function getNaturalHeightWidth(file: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({ height: img.height, width: img.width })
    }
    img.onerror = reject
    img.src = file
  })
}

function PhotosEntry({
  entry,
  onDelete
}: {
  entry: MomentVaultEntry
  onDelete: () => void
}) {
  const [loading, setLoading] = useState(true)

  const [photos, setPhotos] = useState<
    {
      src: string
      height: number
      width: number
    }[]
  >([])

  useEffect(() => {
    const fetchPhotos = async () => {
      const photos = await Promise.all(
        entry.file!.map(async file => {
          const fileUrl = forgeAPI.getMedia({
            collectionId: entry.collectionId,
            recordId: entry.id,
            fieldId: file
          })

          const { height, width } = await getNaturalHeightWidth(fileUrl)

          return {
            src: fileUrl,
            height,
            width
          }
        })
      )

      setPhotos(photos)
      setLoading(false)
    }

    fetchPhotos()
  }, [entry.file])

  return (
    <Card as="li">
      <Flex align="start" gap="sm" width="100%">
        {loading ? (
          <Flex centered height="24rem" width="100%">
            <Box className="loader" />
          </Flex>
        ) : (
          <>
            <Box width="100%">
              {photos.length > 1 ? (
                <PhotoAlbum
                  layout="rows"
                  photos={photos}
                  // @ts-expect-error - Some issue with the types
                  renderPhoto={({ imageProps }) => (
                    <Box style={imageProps.style}>
                      <Zoom zoomMargin={64}>
                        <img
                          alt=""
                          src={imageProps.src}
                          style={{
                            borderRadius: 'var(--radius-md)',
                            height: '100%',
                            objectFit: 'cover',
                            width: '100%'
                          }}
                        />
                      </Zoom>
                    </Box>
                  )}
                  spacing={8}
                />
              ) : (
                <Zoom zoomMargin={64}>
                  <img
                    alt=""
                    src={photos[0].src}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      height: '24rem',
                      objectFit: 'cover'
                    }}
                  />
                </Zoom>
              )}
            </Box>
            <ContextMenu>
              <ContextMenuItem
                dangerous
                icon="tabler:trash"
                label="Delete"
                onClick={onDelete}
              />
            </ContextMenu>
          </>
        )}
      </Flex>
      <Flex align="center" gap="sm" mt="md">
        <Icon color="muted" icon="tabler:clock" />
        <Text color="muted">{dayjs(entry.created).fromNow()}</Text>
      </Flex>
    </Card>
  )
}

export default PhotosEntry
