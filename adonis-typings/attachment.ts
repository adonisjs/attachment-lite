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

  export type Breakpoints = Partial<{
    large: number | 'off'
    medium: number | 'off'
    small: number | 'off'
  }> &
    Record<string, number | 'off'>

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
    disableThumbnail?: boolean
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
    url: string | null

    /**
     * The file size in bytes
     */
    size: number

    /**
     * The file extname. Inferred from the BodyParser file extname
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

    /**
     * The format of the image
     */
    format: AttachmentOptions['forceFormat']

    /**
     * The breakpoints object for the image
     */
    breakpoints: ImageBreakpoints | undefined
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
     * The URLs object
     */
    urls?: UrlRecords | null

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
    save(): Promise<any>

    /**
     * Delete the responsive images from the disk
     */
    delete(): Promise<void>

    /**
     * Computes the URLs for the responsive images.
     * @param options
     * @param options.forced Force the URLs to be completed whether
     * `preComputedURLs` is true or not
     */
    computeUrls(options?: {
      forced: boolean
      signedUrlOptions?: ContentHeaders & { expiresIn?: string | number }
    }): Promise<void>

    /**
     * Returns the signed or unsigned URL for each responsive image
     */
    getUrls(
      signingOptions?: ContentHeaders & { expiresIn?: string | number }
    ): Promise<UrlRecords | null>

    /**
     * Attachment attributes
     */
    toJSON(): (AttachmentAttributes & { url?: string | null }) | null
  }

  /**
   * File attachment decorator
   */
  export type ResponsiveAttachmentDecorator = (
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

  export const responsiveAttachment: ResponsiveAttachmentDecorator
  export const ResponsiveAttachment: AttachmentConstructorContract
}
