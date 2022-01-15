/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { cuid } from '@poppinss/utils/build/helpers'
import detect from 'detect-file-type'

import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import type { DriveManagerContract, ContentHeaders } from '@ioc:Adonis/Core/Drive'
import type {
  AttachmentOptions,
  ResponsiveAttachmentContract,
  AttachmentAttributes,
  AttachmentConstructorContract,
  ImageInfo,
  UrlRecords,
  ImageBreakpoints,
  ImageAttributes,
} from '@ioc:Adonis/Addons/ResponsiveAttachment'
import {
  allowedFormats,
  generateBreakpointImages,
  generateName,
  generateThumbnail,
  getDimensions,
  optimize,
} from '../Helpers/ImageManipulationHelper'
import { merge, isEmpty, assign, set } from 'lodash'
import { DEFAULT_BREAKPOINTS } from './decorator'

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class ResponsiveAttachment implements ResponsiveAttachmentContract {
  private static drive: DriveManagerContract

  /**
   * Reference to the drive
   */
  public static getDrive() {
    return this.drive
  }

  /**
   * Set the drive instance
   */
  public static setDrive(drive: DriveManagerContract) {
    this.drive = drive
  }

  /**
   * Create attachment instance from the bodyparser
   * file
   */
  public static async fromFile(file: MultipartFileContract) {
    if (!file) {
      throw new SyntaxError('You should provide a non-falsy value')
    }
    // Store the file locally first and add the path to the ImageInfo
    // This will be removed after the operation is completed
    await file.moveToDisk('image_upload_tmp')

    if (allowedFormats.includes(file?.subtype as AttachmentOptions['forceFormat']) === false) {
      throw new RangeError(
        `Uploaded file is not an allowable image. Make sure that you uploaded only the following format: "jpeg", "png", "webp", "tiff", and "avif".`
      )
    }

    const attributes = {
      extname: file.extname!,
      mimeType: `${file.type}/${file.subtype}`,
      size: file.size,
      path: file.filePath,
    }

    return new ResponsiveAttachment(attributes) as ResponsiveAttachmentContract
  }

  /**
   * Create attachment instance from the bodyparser via a buffer
   */
  public static fromBuffer(buffer: Buffer): Promise<ResponsiveAttachmentContract> {
    return new Promise((resolve, reject) => {
      try {
        type BufferProperty = { ext: string; mime: string }

        let bufferProperty: BufferProperty | undefined

        detect.fromBuffer(buffer, function (err: Error | string, result: BufferProperty) {
          if (err) {
            throw new Error(err instanceof Error ? err.message : err)
          }
          if (!result) {
            throw new Exception('Please provide a valid file buffer')
          }
          bufferProperty = result
        })

        const { mime, ext } = bufferProperty!
        const subtype = mime.split('/').pop()

        if (allowedFormats.includes(subtype as AttachmentOptions['forceFormat']) === false) {
          throw new RangeError(
            `Uploaded file is not an allowable image. Make sure that you uploaded only the following format: "jpeg", "png", "webp", "tiff", and "avif".`
          )
        }

        const attributes = {
          extname: ext,
          mimeType: mime,
          size: buffer.length,
        }

        return resolve(new ResponsiveAttachment(attributes, buffer) as ResponsiveAttachmentContract)
      } catch (error) {
        return reject(error)
      }
    })
  }

  /**
   * Create attachment instance from the database response
   */
  public static fromDbResponse(response: string | ImageAttributes) {
    const attributes =
      typeof response === 'string' ? (JSON.parse(response) as ResponsiveAttachment) : response

    if (!attributes) return null

    const attachment = new ResponsiveAttachment(attributes)

    /**
     * Images fetched from DB are always persisted
     */
    attachment.isPersisted = true
    return attachment
  }

  /**
   * Attachment options
   */
  private options?: AttachmentOptions

  /**
   * The generated name of the original file.
   * Available only when "isPersisted" is true.
   */
  public name?: string

  /**
   * The generated url of the original file.
   * Available only when "isPersisted" is true.
   */
  public url?: string

  /**
   * The urls of the original and breakpoint files.
   * Available only when "isPersisted" is true.
   */
  public urls?: UrlRecords

  /**
   * The image size of the original file in bytes
   */
  public size?: number

  /**
   * The image extname. Inferred from the bodyparser file extname
   * property
   */
  public extname?: string

  /**
   * The image mimetype.
   */
  public mimeType?: string

  /**
   * The image hash.
   */
  public hash?: string

  /**
   * The image width.
   */
  public width?: number

  /**
   * The image height.
   */
  public height?: number

  /**
   * The absolute path of the original uploaded file
   * Available after initial move operation in the decorator
   */
  public path?: string

  /**
   * The format or filetype of the image.
   */
  public format?: AttachmentOptions['forceFormat']

  /**
   * The format or filetype of the image.
   */
  public breakpoints?: Record<keyof ImageBreakpoints, ImageInfo>

  /**
   * Find if the image has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the image has been deleted or not
   */
  public isDeleted: boolean

  constructor(attributes: AttachmentAttributes, private buffer?: Buffer | null) {
    this.name = attributes.name
    this.size = attributes.size
    this.hash = attributes.hash
    this.width = attributes.width
    this.format = attributes.format
    this.height = attributes.height
    this.extname = attributes.extname
    this.mimeType = attributes.mimeType
    this.url = attributes.url ?? undefined
    this.breakpoints = attributes.breakpoints ?? undefined
    this.path = attributes.path ?? ''
    this.isLocal = !!this.path || !!this.buffer
  }

  public get attributes() {
    return {
      name: this.name,
      size: this.size,
      hash: this.hash,
      width: this.width,
      format: this.format,
      height: this.height,
      extname: this.extname,
      mimeType: this.mimeType,
      url: this.url,
      breakpoints: this.breakpoints!,
      path: this.path!,
    }
  }

  /**
   * "isLocal = true" means the instance is created locally
   * using the bodyparser file object
   */
  public isLocal = !!this.path

  /**
   * Returns disk instance
   */
  private getDisk() {
    const disk = this.options?.disk
    const Drive = (this.constructor as AttachmentConstructorContract).getDrive()
    return disk ? Drive.use(disk) : Drive.use()
  }

  /**
   * Define persistance options
   */
  public setOptions(options?: AttachmentOptions) {
    this.options = merge(
      {
        preComputeUrls: false,
        keepOriginal: true,
        breakpoints: DEFAULT_BREAKPOINTS,
        forceFormat: undefined,
        optimizeOrientation: true,
        optimizeSize: true,
        responsiveDimensions: true,
      },
      options
    )
    return this
  }

  protected async enhanceFile(): Promise<ImageInfo> {
    // Read the image as a buffer using `Drive.get()`
    const originalFileBuffer = this.buffer ?? (await this.getDisk().get(this.path!))

    // Optimise the image buffer and return the optimised buffer
    // and the info of the image
    const { buffer, info } = await optimize(originalFileBuffer, this.options)

    // Override the `imageInfo` object with the optimised `info` object
    // As the optimised `info` object is preferred
    // Also append the `hash` and `buffer`
    return assign({ ...this.attributes }, info, { hash: cuid(), buffer })
  }

  /**
   * Save image to the disk. Results in noop when "this.isLocal = false"
   */
  public async save() {
    /**
     * Do not persist already persisted image or if the
     * instance is not local
     */
    if (!this.isLocal || this.isPersisted) {
      return
    }

    /**
     * Read the original temporary file from disk and optimise the file while
     * return the enhanced buffer and information of the enhanced buffer
     */
    const enhancedImageData = await this.enhanceFile()

    /**
     * Generate the name of the original image
     */
    this.name =
      this.options?.keepOriginal ?? true
        ? generateName({
            extname: enhancedImageData.extname,
            hash: enhancedImageData.hash,
            options: this.options,
            prefix: 'original',
          })
        : undefined

    /**
     * Update the local attributes with the attributes
     * of the optimised original file
     */
    if (this.options?.keepOriginal ?? true) {
      this.size = enhancedImageData.size
      this.hash = enhancedImageData.hash
      this.width = enhancedImageData.width
      this.height = enhancedImageData.height
      this.format = enhancedImageData.format
      this.extname = enhancedImageData.extname
      this.mimeType = enhancedImageData.mimeType
    }

    /**
     * Inject the name into the `ImageInfo`
     */
    enhancedImageData.name = this.name

    /**
     * Write the optimised original image to the disk
     */
    if (this.options?.keepOriginal ?? true) {
      await this.getDisk().put(enhancedImageData.name!, enhancedImageData.buffer!)
    }

    /**
     * Generate image thumbnail data
     */
    const thumbnailImageData = await generateThumbnail(enhancedImageData, this.options!)
    if (thumbnailImageData) {
      /**
       * Write the thumbnail image to the disk
       */
      await this.getDisk().put(thumbnailImageData.name!, thumbnailImageData.buffer!)
      /**
       * Delete buffer from `thumbnailImageData`
       */
      delete thumbnailImageData.buffer

      set(enhancedImageData, 'breakpoints.thumbnail', thumbnailImageData)
    }

    /**
     * Generate breakpoint image data
     */
    const breakpointFormats = await generateBreakpointImages(enhancedImageData, this.options!)
    if (breakpointFormats && Array.isArray(breakpointFormats) && breakpointFormats.length > 0) {
      for (const format of breakpointFormats) {
        if (!format) continue

        const { key, file: breakpointImageData } = format

        /**
         * Write the breakpoint image to the disk
         */
        await this.getDisk().put(breakpointImageData.name!, breakpointImageData.buffer!)

        /**
         * Delete buffer from `breakpointImageData`
         */
        delete breakpointImageData.buffer

        set(enhancedImageData, ['breakpoints', key], breakpointImageData)
      }
    }

    const { width, height } = await getDimensions(enhancedImageData.buffer!)

    delete enhancedImageData.buffer
    delete enhancedImageData.path

    assign(enhancedImageData, {
      width,
      height,
    })

    /**
     * Update the local value of `breakpoints`
     */
    this.breakpoints = enhancedImageData.breakpoints!

    /**
     * Images has been persisted
     */
    this.isPersisted = true

    /**
     * Forcefully compute the URL
     */
    await this.computeUrls()

    /**
     * Delete the temporary file
     */
    if (this.buffer) {
      this.buffer = null
    } else await this.getDisk().delete(this.path!)

    return merge(enhancedImageData, this.urls)
  }

  /**
   * Delete original and responsive images from the disk
   */
  public async delete() {
    if (!this.isPersisted) {
      return
    }

    /**
     * Delete the original image
     */
    if (this.options?.keepOriginal ?? true) await this.getDisk().delete(this.name!)
    /**
     * Delete the responsive images
     */
    if (this.breakpoints) {
      for (const key in this.breakpoints) {
        if (Object.prototype.hasOwnProperty.call(this.breakpoints, key)) {
          const breakpointImage = this.breakpoints[key] as ImageAttributes
          await this.getDisk().delete(breakpointImage.name!)
        }
      }
    }

    this.isDeleted = true
    this.isPersisted = false
  }

  public async computeUrls(options?: {
    forced: boolean
    signedUrlOptions?: ContentHeaders & { expiresIn?: string | number }
  }) {
    const { forced, signedUrlOptions } = options || {}

    /**
     * Cannot compute url for a non persisted image
     */
    if (!this.isPersisted) {
      return
    }

    /**
     * Compute urls when preComputeUrls is set to true
     * or the `preComputeUrls` function exists
     * or the computation is forced
     */
    if (!this.options?.preComputeUrls && !forced) {
      return
    }

    const disk = this.getDisk()

    /**
     * Generate url using the user defined preComputeUrls method
     */
    if (typeof this.options?.preComputeUrls === 'function') {
      const urls = await this.options.preComputeUrls(disk, this)
      this.url = urls.url
      if (!this.urls) this.urls = {} as UrlRecords
      if (!this.urls.breakpoints) this.urls.breakpoints = {} as ImageBreakpoints
      for (const key in urls.breakpoints) {
        if (Object.prototype.hasOwnProperty.call(urls.breakpoints, key)) {
          if (!this.urls.breakpoints[key]) this.urls.breakpoints[key] = { url: '' }
          this.urls.breakpoints[key].url = urls.breakpoints[key].url
        }
      }
      return
    }

    /**
     * Iterative URL-computation logic
     */
    const { path, ...originalAttributes } = this.attributes
    const attachmentData = originalAttributes
    if (attachmentData) {
      if (!this.urls) this.urls = {} as UrlRecords

      for (const key in attachmentData) {
        if (['name', 'breakpoints'].includes(key) === false) continue

        const value = attachmentData[key]
        let url: string

        if (key === 'name') {
          if (!(this.options?.keepOriginal ?? true)) continue
          const name = value as string

          const imageVisibility = await disk.getVisibility(name)
          if (imageVisibility === 'private') {
            url = await disk.getSignedUrl(name, signedUrlOptions || undefined)
          } else {
            url = await disk.getUrl(name)
          }

          this.urls['url'] = url
          this.url = url
        } else if (key === 'breakpoints') {
          if (isEmpty(value) !== true) {
            if (!this.urls.breakpoints) this.urls.breakpoints = {} as ImageBreakpoints

            for (const breakpoint in value) {
              if (Object.prototype.hasOwnProperty.call(value, breakpoint)) {
                const breakpointImageData: Exclude<ImageInfo, 'breakpoints'> = value?.[breakpoint]
                if (breakpointImageData) {
                  const imageVisibility = await disk.getVisibility(breakpointImageData.name!)
                  if (imageVisibility === 'private') {
                    url = await disk.getSignedUrl(
                      breakpointImageData.name!,
                      signedUrlOptions || undefined
                    )
                  } else {
                    url = await disk.getUrl(breakpointImageData.name!)
                  }
                  this.urls['breakpoints'][breakpoint] = { url }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns the signed or unsigned URL for each responsive image
   */
  public async getUrls(signingOptions?: ContentHeaders & { expiresIn?: string | number }) {
    /**
     * Forcefully compute the URLs first
     */
    await this.computeUrls({ forced: true, ...signingOptions })
    return this.urls
  }

  /**
   * Serialize attachment instance to JSON
   */
  public toJSON() {
    const { path, url, ...originalAttributes } = this.attributes

    return {
      ...(this.options?.keepOriginal ?? true ? originalAttributes : {}),
      ...(url ? { url } : {}),
      breakpoints: this.breakpoints,
    }
  }
}
