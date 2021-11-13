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
  enhanceFile,
  generateBreakpointImages,
  generateName,
  generateThumbnail,
  getDimensions,
} from '../Helpers/ImageManipulationHelper'
import _ from 'lodash'

const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType', 'width', 'height', 'hash']

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class Attachment implements ResponsiveAttachmentContract {
  private static drive: DriveManagerContract

  /**
   * Refrence to the drive
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
  public static fromFile(file: MultipartFileContract) {
    const attributes = {
      extname: file.extname!,
      mimeType: `${file.type}/${file.subtype}`,
      size: file.size!,
    }

    return new Attachment(attributes, file)
  }

  /**
   * Create attachment instance from the database response
   */
  public static fromDbResponse(response: any) {
    const attributes = typeof response === 'string' ? JSON.parse(response) : response

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

    const attachment = new Attachment(attributes)

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
  public name: string

  /**
   * The generated names of the original and breakpoint files.
   * Available only when "isPersisted" is true.
   */
  public names: NameRecords

  /**
   * The urls of the original and breakpoint files.
   * Available only when "isPersisted" is true.
   */
  public urls: UrlRecords

  /**
   * The container object for the attributes of the
   * original and breakpoint files
   */
  public responsiveImages: any

  /**
   * The image size of the original file in bytes
   */
  public size = this.attributes.size

  /**
   * The image extname. Inferred from the bodyparser file extname
   * property
   */
  public extname = this.attributes.extname

  /**
   * The image mimetype.
   */
  public mimeType = this.attributes.mimeType

  /**
   * The image hash.
   */
  public hash = this.attributes.hash

  /**
   * The image width.
   */
  public width = this.attributes.width

  /**
   * The image height.
   */
  public height = this.attributes.height

  /**
   * The absolute path of the original uploaded file
   * Available after initial move operation in the decorator
   */
  public path = this.attributes.path

  /**
   * "isLocal = true" means the instance is created locally
   * using the bodyparser file object
   */
  public isLocal = !!this.file

  /**
   * Find if the image has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the image has been deleted or not
   */
  public isDeleted: boolean

  constructor(private attributes: AttachmentAttributes, private file?: MultipartFileContract) {
    if (this.attributes.name) {
      this.name = this.attributes.name
    }
  }

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

  /**
   * Save image to the disk. Results in noop when "this.isLocal = false"
   */
  public async save() {
    /**
     * Read the original temporary file from disk and optimise the file while
     * return the enhanced buffer and information of the enhanced buffer
     */
    const enhancedImageData = await enhanceFile(
      this.getDisk,
      this.path!,
      this.attributes,
      this.options
    )

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
    await this.computeUrls(enhancedImageData)
  }

  /**
   * Delete the image from the disk
   */
  public async delete() {
    //Todo: This needs to be an iteration

    if (!this.isPersisted) {
      return
    }

    await this.getDisk().delete(this.name)
    this.isDeleted = true
    this.isPersisted = false
  }

  /**
   * Computes the URLs for the breakpoint images
   */
  public async computeUrls(imageData: ImageInfo) {
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
    for (const key in imageData) {
      if (['name', 'breakpoints'].includes(key) === false) continue

      const value = imageData[key]
      if (key === 'name') {
        const imageVisibility = await disk.getVisibility(value)
        if (imageVisibility === 'private') {
          this.urls['original'] = await disk.getSignedUrl(value)
        } else {
          this.urls['original'] = await disk.getUrl(value)
        }
      } else if (key === 'breakpoints') {
        for (const breakpoint in value) {
          if (Object.prototype.hasOwnProperty.call(value, breakpoint)) {
            const breakpointImageData: ImageInfo = value?.[breakpoint]
            if (breakpointImageData) {
              const imageVisibility = await disk.getVisibility(breakpointImageData.name!)
              if (imageVisibility === 'private') {
                this.urls[breakpoint] = await disk.getSignedUrl(breakpointImageData.name!)
              } else {
                this.urls[breakpoint] = await disk.getUrl(breakpointImageData.name!)
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
    if (this.responsiveImages) {
      this.responsiveImages.url = this.urls.original
      for (const key in this.responsiveImages.breakpoints) {
        if (Object.prototype.hasOwnProperty.call(this.responsiveImages.breakpoints, key)) {
          this.responsiveImages['breakpoints'][key] = this.urls[key]
        }
      }
      return this.responsiveImages
    } else return null
  }
}
