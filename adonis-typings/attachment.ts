/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/ResponsiveAttachment' {
  import { ColumnOptions } from '@ioc:Adonis/Lucid/Orm'
  import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
  import {
    DisksList,
    ContentHeaders,
    DriverContract,
    DriveManagerContract,
  } from '@ioc:Adonis/Core/Drive'

  export type Breakpoints = { large: number; medium: number; small: number }

  /**
   * Options used to persist the attachment to
   * the disk
   */
  export type AttachmentOptions = {
    disk?: keyof DisksList
    folder?: string
    breakpoints?: Breakpoints
    forceFormat?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff'
    optimizeSize?: boolean
    optimizeOrientation?: boolean
    responsiveDimensions?: boolean
    preComputeUrls?:
      | boolean
      | ((disk: DriverContract, attachment: ResponsiveAttachmentContract) => Promise<UrlRecords>)
  }

  export interface ImageAttributes {
    /**
     * The name is available only when "isPersisted" is true.
     */
    name: string

    /**
     * The url is available only when "isPersisted" is true.
     */
    url: string

    /**
     * The file size in bytes
     */
    size: number

    /**
     * The file extname. Inferred from the bodyparser file extname
     * property
     */
    extname: string

    /**
     * The file mimetype.
     */
    mimeType: string

    /**
     * The hash string of the image
     */
    hash: string

    /**
     * The width of the image
     */
    width: number

    /**
     * The height of the image
     */
    height: number
  }

  /**
   * Attachment class represents an attachment data type
   * for Lucid models
   */
  export interface ResponsiveAttachmentContract {
    /**
     * The breakpoint objects
     */
    breakpoints?: Record<keyof ImageBreakpoints, ImageInfo>

    /**
     * "isLocal = true" means the instance is created locally
     * using the bodyparser file object
     */
    isLocal: boolean

    /**
     * Find if the file has been persisted or not.
     */
    isPersisted: boolean

    /**
     * Find if the file has been deleted or not
     */
    isDeleted: boolean

    /**
     * Define persistance options
     */
    setOptions(options?: AttachmentOptions): this

    /**
     * Save responsive images to the disk. Results if noop when "this.isLocal = false"
     */
    save(): Promise<void>

    /**
     * Delete the responsive images from the disk
     */
    delete(): Promise<void>

    /**
     * Computes the URLs for the responsive images.
     */
    computeUrls(imageData: ImageInfo): Promise<void>

    /**
     * Returns the URL for the file. Same as "Drive.getUrl()"
     */
    getUrls(): Promise<UrlRecords>

    /**
     * Returns the signed URLs and `ImageAttributes` for each responsive image
     */
    getSignedUrls(options?: ContentHeaders & { expiresIn?: string | number }): Promise<UrlRecords>

    /**
     * Attachment attributes
     */
    toJSON(): (AttachmentAttributes & { url?: string }) | null
  }

  /**
   * File attachment decorator
   */
  export type AttachmentDecorator = (
    options?: AttachmentOptions & Partial<ColumnOptions>
  ) => <TKey extends string, TTarget extends { [K in TKey]?: ResponsiveAttachmentContract | null }>(
    target: TTarget,
    property: TKey
  ) => void

  /**
   * Attachment class constructor
   */
  export interface AttachmentConstructorContract {
    new (attributes: ImageAttributes, file?: MultipartFileContract): ResponsiveAttachmentContract
    fromFile(file: MultipartFileContract): ResponsiveAttachmentContract
    fromDbResponse(response: string): ResponsiveAttachmentContract
    getDrive(): DriveManagerContract
    setDrive(drive: DriveManagerContract): void
  }

  export const attachment: AttachmentDecorator
  export const Attachment: AttachmentConstructorContract
}
