import sharp from 'sharp'
import {
  AttachmentOptions,
  ImageBreakpoints,
  ImageInfo,
  OptimizedOutput,
  BreakpointFormat,
  FileDimensions,
} from '@ioc:Adonis/Addons/ResponsiveAttachment'
import { cuid } from '@poppinss/utils/build/helpers'
import { merge, pickBy, isEmpty } from 'lodash'
import { DEFAULT_BREAKPOINTS } from '../Attachment/decorator'

const getMergedOptions = function (options: AttachmentOptions): AttachmentOptions {
  return merge(
    {
      preComputeUrls: false,
      breakpoints: DEFAULT_BREAKPOINTS,
      forceFormat: undefined,
      optimizeOrientation: true,
      optimizeSize: true,
      responsiveDimensions: true,
      disableThumbnail: false,
    },
    options
  )
}

export const bytesToKBytes = (bytes: number) => Math.round((bytes / 1000) * 100) / 100

export const getMetaData = async (buffer: Buffer) => await sharp(buffer).metadata()

export const getDimensions = async function (buffer: Buffer): Promise<FileDimensions> {
  return await getMetaData(buffer).then(({ width, height }) => ({ width, height }))
}

/**
 * Default thumbnail resize options
 */
export const THUMBNAIL_RESIZE_OPTIONS = {
  width: 245,
  height: 156,
  fit: 'inside' as sharp.FitEnum['inside'],
}

export const resizeTo = async function (
  buffer: Buffer,
  options: AttachmentOptions,
  resizeOptions: sharp.ResizeOptions
) {
  const sharpInstance = options?.forceFormat
    ? sharp(buffer).toFormat(options.forceFormat)
    : sharp(buffer)

  return await sharpInstance
    .withMetadata()
    .resize(resizeOptions)
    .toBuffer()
    .catch(() => null)
}

export const breakpointSmallerThan = (breakpoint: number, { width, height }: FileDimensions) =>
  breakpoint < width! || breakpoint < height!

export const allowedFormats: Array<AttachmentOptions['forceFormat']> = [
  'jpeg',
  'png',
  'webp',
  'avif',
  'tiff',
]

export const canBeProcessed = async (buffer: Buffer) => {
  const { format } = await getMetaData(buffer)
  return format && allowedFormats.includes(format as AttachmentOptions['forceFormat'])
}

const getImageExtension = function (imageFormat: ImageInfo['format']) {
  return imageFormat === 'jpeg' ? 'jpg' : imageFormat!
}

export const generateBreakpoint = async ({
  key,
  imageData,
  breakpoint,
  options,
}: {
  key: keyof ImageBreakpoints | string
  imageData: ImageInfo
  breakpoint: number
  options: AttachmentOptions
}): Promise<BreakpointFormat> => {
  const breakpointBuffer = await resizeTo(imageData.buffer!, options, {
    width: breakpoint,
    height: breakpoint,
    fit: 'inside',
  })

  if (breakpointBuffer) {
    const { width, height, size, format } = await getMetaData(breakpointBuffer)

    const extname = getImageExtension(format as ImageInfo['format'])
    const breakpointFileName = generateName({
      extname,
      hash: imageData.hash,
      options,
      prefix: key as keyof ImageBreakpoints,
    })

    return {
      key: key as keyof ImageBreakpoints,
      file: {
        name: breakpointFileName,
        hash: imageData.hash,
        extname,
        mimeType: `image/${format}`,
        format: format as AttachmentOptions['forceFormat'],
        width: width,
        height: height,
        size: bytesToKBytes(size!),
        buffer: breakpointBuffer,
      },
    }
  } else {
    return null
  }
}

/**
 * Generates the name for the attachment and prefixes
 * the folder (if defined)
 * @param payload
 * @param payload.extname The extension name for the image
 * @param payload.hash Hash string to use instead of a CUID
 * @param payload.prefix String to prepend to the filename
 * @param payload.options Attachment options
 */
export const generateName = function ({
  extname,
  hash,
  prefix,
  options,
}: {
  extname: string
  hash?: string
  prefix?: keyof ImageBreakpoints | 'original'
  options?: AttachmentOptions
}): string {
  return `${options?.folder ? `${options.folder}/` : ''}${prefix ? prefix + '_' : ''}${
    hash ? hash : cuid()
  }.${extname}`
}

export const optimize = async function (
  buffer: Buffer,
  options?: AttachmentOptions
): Promise<OptimizedOutput> {
  const { optimizeOrientation, optimizeSize, forceFormat } = options || {}

  // Check if the image is in the right format or can be size optimised
  if (!optimizeSize || !(await canBeProcessed(buffer))) {
    return { buffer }
  }

  // Auto rotate the image if `optimizeOrientation` is true
  let sharpInstance = optimizeOrientation ? sharp(buffer).rotate() : sharp(buffer)

  // Force image to output to a specific format if `forceFormat` is true
  sharpInstance = forceFormat ? sharpInstance.toFormat(forceFormat) : sharpInstance

  return await sharpInstance
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      // The original buffer should not be smaller than the optimised buffer
      const outputBuffer = buffer.length < data.length ? buffer : data

      return {
        buffer: outputBuffer,
        info: {
          width: info.width,
          height: info.height,
          size: bytesToKBytes(outputBuffer.length),
          format: info.format as AttachmentOptions['forceFormat'],
          mimeType: `image/${info.format}`,
          extname: getImageExtension(info.format as ImageInfo['format']),
        },
      }
    })
    .catch(() => ({ buffer }))
}

export const generateThumbnail = async function (
  imageData: ImageInfo,
  options: AttachmentOptions
): Promise<ImageInfo | null> {
  options = getMergedOptions(options)

  if (!(await canBeProcessed(imageData.buffer!))) {
    return null
  }

  if (!options?.responsiveDimensions || options?.disableThumbnail) {
    return null
  }

  const { width, height } = await getDimensions(imageData.buffer!)

  if (!width || !height) return null

  if (width > THUMBNAIL_RESIZE_OPTIONS.width || height > THUMBNAIL_RESIZE_OPTIONS.height) {
    const thumbnailBuffer = await resizeTo(imageData.buffer!, options, THUMBNAIL_RESIZE_OPTIONS)

    if (thumbnailBuffer) {
      const {
        width: thumbnailWidth,
        height: thumbnailHeight,
        size,
        format,
      } = await getMetaData(thumbnailBuffer)

      const extname = getImageExtension(format as ImageInfo['format'])

      const thumbnailFileName = generateName({
        extname,
        hash: imageData.hash,
        options,
        prefix: 'thumbnail',
      })

      return {
        name: thumbnailFileName,
        hash: imageData.hash,
        extname,
        mimeType: `image/${format}`,
        format: format as AttachmentOptions['forceFormat'],
        width: thumbnailWidth,
        height: thumbnailHeight,
        size: bytesToKBytes(size!),
        buffer: thumbnailBuffer,
      }
    }
  }

  return null
}

export const generateBreakpointImages = async function (
  imageData: ImageInfo,
  options: AttachmentOptions
) {
  options = getMergedOptions(options)
  /**
   * Noop if `responsiveDimensions` is falsy
   */
  if (!options.responsiveDimensions) return []

  /**
   * Noop if image format is not allowed
   */
  if (!(await canBeProcessed(imageData.buffer!))) {
    return []
  }

  const originalDimensions: FileDimensions = await getDimensions(imageData.buffer!)

  const activeBreakpoints = pickBy(options.breakpoints, (value) => {
    return value !== 'off'
  })

  if (isEmpty(activeBreakpoints)) return []

  return Promise.all(
    Object.keys(activeBreakpoints).map((key) => {
      const breakpointValue = options.breakpoints?.[key] as number

      const isBreakpointSmallerThanOriginal = breakpointSmallerThan(
        breakpointValue,
        originalDimensions
      )

      if (isBreakpointSmallerThanOriginal) {
        return generateBreakpoint({ key, imageData, breakpoint: breakpointValue, options })
      }
    })
  )
}
