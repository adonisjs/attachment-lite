/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/AttachmentLite' {
  import { ColumnOptions } from '@ioc:Adonis/Lucid/Orm'
  import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
  import {
    DisksList,
    ContentHeaders,
    DriverContract,
    DriveManagerContract,
  } from '@ioc:Adonis/Core/Drive'

  /**
   * Attachment attributes. Required in order
   * to new up an attachment instance
   */
  export type AttachmentAttributes = {
    name?: string
    size: number
    extname: string
    mimeType: string
  }

  /**
   * Options used to persist the attachment to
   * the disk
   */
  export type AttachmentOptions = {
    disk?: keyof DisksList
    folder?: string
    preComputeUrl?:
      | boolean
      | ((disk: DriverContract, attachment: AttachmentContract) => Promise<string>)
  }

  /**
   * Attachment class represents an attachment data type
   * for Lucid models
   */
  export interface AttachmentContract {
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
     * Attachment options
     */
    options?: AttachmentOptions

    /**
     * Save file to the disk. Results if noop when "this.isLocal = false"
     */
    save(): Promise<void>

    /**
     * Delete the file from the disk
     */
    delete(): Promise<void>

    /**
     * Computes the URL for the attachment
     */
    computeUrl(): Promise<void>

    /**
     * Returns the URL for the file. Same as "Drive.getUrl()"
     */
    getUrl(): Promise<string>

    /**
     * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
     */
    getSignedUrl(options?: ContentHeaders & { expiresIn?: string | number }): Promise<string>

    /**
     * Convert attachment to plain object to be persisted inside
     * the database
     */
    toObject(): AttachmentAttributes

    /**
     * Convert attachment to JSON object to be sent over
     * the wire
     */
    toJSON(): AttachmentAttributes & { url?: string }
  }

  /**
   * File attachment decorator
   */
  export type AttachmentDecorator = (
    options?: AttachmentOptions & Partial<ColumnOptions>
  ) => <TKey extends string, TTarget extends { [K in TKey]?: AttachmentContract | null }>(
    target: TTarget,
    property: TKey
  ) => void

  /**
   * Attachment class constructor
   */
  export interface AttachmentConstructorContract {
    new (attributes: AttachmentAttributes, file?: MultipartFileContract): AttachmentContract
    fromFile(file: MultipartFileContract): AttachmentContract
    fromDbResponse(response: string): AttachmentContract
    getDrive(): DriveManagerContract
    setDrive(drive: DriveManagerContract): void
  }

  export const attachment: AttachmentDecorator
  export const Attachment: AttachmentConstructorContract
}
