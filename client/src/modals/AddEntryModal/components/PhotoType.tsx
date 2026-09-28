import { useState } from 'react'
import PhotoAlbum from 'react-photo-album'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Flex, Icon, Text, surface, toast } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

async function getNaturalHeightWidth(file: File) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({ height: img.height, width: img.width })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function PhotoType({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useModuleTranslation()

  const [photos, setPhotos] = useState<
    {
      file: File
      preview: string
      height: number
      width: number
    }[]
  >([])

  const [submitLoading, setSubmitLoading] = useState(false)

  async function onSubmit() {
    if (!photos.length) {
      toast.error('Please select a photo')

      return
    }

    setSubmitLoading(true)

    try {
      await forgeAPI.entries.create.mutate({
        type: 'photos',
        files: photos.map(photo => photo.file)
      })

      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create photo entry')
    } finally {
      setSubmitLoading(false)
    }
  }

  function selectPhotos() {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true

    input.style.display = 'none'
    document.body.appendChild(input)

    input.click()

    input.onchange = async () => {
      const files = input.files

      if (files) {
        if (files.length > 25) {
          toast.error('You can only select up to 25 photos')

          return
        }

        const finalPhotos = await Promise.all(
          Array.from(files)
            .slice(0, 25)
            .map(async file => {
              const { height, width } = await getNaturalHeightWidth(file)

              return {
                file,
                preview: URL.createObjectURL(file),
                height,
                width
              }
            })
        )

        setPhotos(finalPhotos)
      }

      document.body.removeChild(input)
    }
  }

  return (
    <>
      <Flex
        bg={surface.light}
        direction="column"
        p="lg"
        r="md"
        shadow
        width="100%"
      >
        <Flex align="center" gap="sm">
          <Icon color="muted" icon="tabler:photo" size="1.5rem" />
          <Text color="muted" weight="medium">
            {t(`inputs.photos`)}{' '}
            <Text as="span" color="red-500">
              *
            </Text>
          </Text>
        </Flex>
        {photos.length > 0 && (
          <Box mt="lg">
            <PhotoAlbum
              layout="rows"
              photos={photos.map(photo => ({
                src: photo.preview,
                width: photo.width,
                height: photo.height
              }))}
              // @ts-expect-error - Some issue with the types
              renderPhoto={({ imageProps }) => (
                <img
                  {...imageProps}
                  alt=""
                  style={{
                    ...imageProps.style,
                    borderRadius: 'var(--radius-md)',
                    height: '100%',
                    objectFit: 'cover',
                    width: '100%'
                  }}
                />
              )}
              spacing={8}
            />
          </Box>
        )}
        {photos.length ? (
          <Button
            dangerous
            icon="tabler:trash"
            mt="lg"
            variant="secondary"
            onClick={() => setPhotos([])}
          >
            Clear Photos
          </Button>
        ) : (
          <Button
            icon="tabler:plus"
            mt="lg"
            variant="secondary"
            onClick={selectPhotos}
          >
            Select Photos
          </Button>
        )}
      </Flex>
      <Button
        icon="tabler:plus"
        loading={submitLoading}
        mt="lg"
        width="100%"
        onClick={onSubmit}
      >
        Create
      </Button>
    </>
  )
}

export default PhotoType
