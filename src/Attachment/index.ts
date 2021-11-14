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
import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import type { DriveManagerContract, ContentHeaders } from '@ioc:Adonis/Core/Drive'
import type {
  AttachmentOptions,
  ResponsiveAttachmentContract,
  AttachmentAttributes,
  AttachmentConstructorContract,
  ImageInfo,
  UrlRecords,
  NameRecords,
  ImageBreakpoints,
} from '@ioc:Adonis/Addons/ResponsiveAttachment'
import {
  generateBreakpointImages,
  generateName,
  generateThumbnail,
  getDimensions,
  optimize,
} from '../Helpers/ImageManipulationHelper'
import _ from 'lodash'
import cuid from 'cuid'

const REQUIRED_ATTRIBUTES = [
  'name',
  'size',
  'extname',
  'mimeType',
  'width',
  'height',
  'hash',
  'breakpoints',
  'format',
]

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
    // Store the file locally first and add the path to the ImageInfo
    // This will be removed after the operation is completed
    await file.moveToDisk('image_upload_tmp')

    const attributes = {
      extname: file.extname!,
      mimeType: `${file.type}/${file.subtype}`,
      size: file.size,
      path: file.filePath,
    }

    const responsiveAttachment = new ResponsiveAttachment(attributes)

    return responsiveAttachment
  }

  /**
   * Create attachment instance from the database response
   */
  public static fromDbResponse(response: any) {
    const attributes = typeof response === 'string' ? JSON.parse(response) : response

    if (!attributes) return null

    /**
     * Validate the db response
     */
    REQUIRED_ATTRIBUTES.forEach((attribute) => {
      if (attributes[attribute] === undefined) {
        throw new Exception(
          `Cannot create attachment from database response. Missing attribute "${attribute}"`
        )
      }
    })

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
   * The generated names of the original and breakpoint files.
   * Available only when "isPersisted" is true.
   */
  public names = {} as NameRecords

  /**
   * The urls of the original and breakpoint files.
   * Available only when "isPersisted" is true.
   */
  public urls = {} as UrlRecords

  /**
   * The container object for the attributes of the
   * original and breakpoint files
   */
  public responsiveImages: any

  /**
   * The image size of the original file in bytes
   */
  public size?: number | undefined

  /**
   * The image extname. Inferred from the bodyparser file extname
   * property
   */
  public extname?: string | undefined

  /**
   * The image mimetype.
   */
  public mimeType?: string | undefined

  /**
   * The image hash.
   */
  public hash?: string | undefined

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
  public format: AttachmentOptions['forceFormat'] | undefined

  /**
   * The format or filetype of the image.
   */
  public breakpoints: ImageBreakpoints | undefined

  /**
   * Find if the image has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the image has been deleted or not
   */
  public isDeleted: boolean

  constructor(attributes: AttachmentAttributes) {
    this.name = attributes.name
    this.size = attributes.size
    this.hash = attributes.hash
    this.width = attributes.width
    this.format = attributes.format
    this.height = attributes.height
    this.extname = attributes.extname
    this.mimeType = attributes.mimeType
    this.breakpoints = attributes.breakpoints || undefined
    this.path = attributes.path || ''
    this.isLocal = !!this.path

    this.names = this.urls = {} as UrlRecords
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
    this.options = options
    return this
  }

  protected async enhanceFile(): Promise<ImageInfo> {
    // Read the image as a buffer using `Drive.get()`
    const originalFileBuffer = await this.getDisk().get(this.path!)

    // Optimise the image buffer and return the optimised buffer
    // and the info of the image
    const { buffer, info } = await optimize(originalFileBuffer, this.options)

    // Override the `imageInfo` object with the optimised `info` object
    // As the optimised `info` object is preferred
    // Also append the `hash` and `buffer`
    return _.assign({ ...this.attributes }, info, { hash: cuid(), buffer })
  }

  /**
   * Save image to the disk. Results in noop when "this.isLocal = false"
   */
  public async save() {
    /**
     * Read the original temporary file from disk and optimise the file while
     * return the enhanced buffer and information of the enhanced buffer
     */
    const enhancedImageData = await this.enhanceFile()

    /**
     * Do not persist already persisted image or if the
     * instance is not local
     */
    if (!this.isLocal || this.isPersisted) {
      return
    }

    /**
     * Generate the name of the original image
     */
    this.name = generateName({
      extname: enhancedImageData.extname,
      hash: enhancedImageData.hash,
      options: this.options,
      prefix: 'original',
    })

    /**
     * Add name of original image to `this.names` record
     */
    this.names['original'] = this.name

    /**
     * Inject the name into the `ImageInfo`
     */
    enhancedImageData.name = this.name

    /**
     * Write the optimised original image to the disk
     */
    await this.getDisk().put(enhancedImageData.name, enhancedImageData.buffer!)
    //await this.file!.moveToDisk('./', { name: this.name }, this.options?.disk)

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
       * Add thumbnail name to `this.names` record
       */
      this.names['thumbnail'] = thumbnailImageData.name!
      /**
       * Delete buffer from `thumbnailImageData`
       */
      delete thumbnailImageData.buffer

      _.set(enhancedImageData, 'breakpoints.thumbnail', thumbnailImageData)
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
         * Add breakpoint image name to `this.names` record
         */
        this.names[key] = thumbnailImageData?.name!

        /**
         * Delete buffer from `breakpointImageData`
         */
        delete breakpointImageData.buffer

        _.set(enhancedImageData, ['breakpoints', key], breakpointImageData)
      }
    }

    const { width, height } = await getDimensions(enhancedImageData.buffer!)

    delete enhancedImageData.buffer
    delete enhancedImageData.path

    _.assign(enhancedImageData, {
      width,
      height,
    })

    this.responsiveImages = enhancedImageData

    /**
     * Images has been persisted
     */
    this.isPersisted = true

    /**
     * Compute the URL
     */
    await this.computeUrls()

    /**
     * Delete the temporary file
     */
    await this.getDisk().delete(this.path!)

    return enhancedImageData
  }

  /**
   * Delete the image from the disk
   */
  public async delete() {
    //Todo: This needs to be an iteration

    if (!this.isPersisted) {
      return
    }

    await this.getDisk().delete(this.name!)
    this.isDeleted = true
    this.isPersisted = false
  }

  /**
   * Computes the URLs for the breakpoint images
   */
  public async computeUrls() {
    /**
     * Cannot compute url for a non persisted image
     */
    if (!this.isPersisted) {
      return
    }

    /**
     * Do not compute url unless preComputeUrl is set to true
     */
    if (!this.options?.preComputeUrls) {
      return
    }

    const disk = this.getDisk()

    /**
     * Generate url using the user defined preComputeUrl method
     */
    if (typeof this.options.preComputeUrls === 'function') {
      this.urls = await this.options.preComputeUrls(disk, this)
      return
    }

    /**
     * Self compute the URL if "preComputeUrl" is set to true
     */
    for (const key in this.responsiveImages) {
      if (['name', 'breakpoints'].includes(key) === false) continue

      const value = this.responsiveImages[key]
      let url: string
      if (key === 'name') {
        const name = value
        const imageVisibility = await disk.getVisibility(name)
        if (imageVisibility === 'private') {
          url = await disk.getSignedUrl(name)
        } else {
          url = await disk.getUrl(name)
        }
        this.urls['original'] = url
        this.responsiveImages.url = url
      } else if (key === 'breakpoints') {
        for (const breakpoint in value) {
          if (Object.prototype.hasOwnProperty.call(value, breakpoint)) {
            const breakpointImageData: ImageInfo = value?.[breakpoint]
            if (breakpointImageData) {
              const imageVisibility = await disk.getVisibility(breakpointImageData.name!)
              if (imageVisibility === 'private') {
                url = await disk.getSignedUrl(breakpointImageData.name!)
                this.urls[breakpoint] = url
                this.responsiveImages.breakpoints[breakpoint].url = url
              } else {
                url = await disk.getUrl(breakpointImageData.name!)
                this.urls[breakpoint] = url
                this.responsiveImages.breakpoints[breakpoint].url = url
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns the URLs for the breakpoint images.
   */
  public async getUrls() {
    const urls = {} as UrlRecords
    for (const key in this.names) {
      if (Object.prototype.hasOwnProperty.call(this.names, key)) {
        const name = this.names[key]
        urls[key] = await this.getDisk().getUrl(name)
      }
    }
    return urls
  }

  /**
   * Returns the signed URLs for the image
   */
  public async getSignedUrls(options?: ContentHeaders & { expiresIn?: string | number }) {
    const urls = {} as UrlRecords
    for (const key in this.names) {
      if (Object.prototype.hasOwnProperty.call(this.names, key)) {
        const name = this.names[key]
        urls[key] = await this.getDisk().getSignedUrl(name, options)
      }
    }
    return urls
  }

  /**
   * Serialize attachment instance to JSON
   */
  public toJSON() {
    const { path, ...originalAttributes } = this.attributes

    return {
      ...originalAttributes,
      breakpoints: this.breakpoints,
    }
  }
}
