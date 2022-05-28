/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { cuid } from '@poppinss/utils/build/helpers'
import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import type { DriveManagerContract, ContentHeaders } from '@ioc:Adonis/Core/Drive'
import type {
  AttachmentOptions,
  AttachmentContract,
  AttachmentAttributes,
  AttachmentConstructorContract,
} from '@ioc:Adonis/Addons/AttachmentLite'
import detect from 'detect-file-type'

const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType']

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class Attachment implements AttachmentContract {
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
    if (!file) {
      throw new SyntaxError('You should provide a non-falsy value')
    }

    const attributes = {
      extname: file.extname!,
      mimeType: `${file.type}/${file.subtype}`,
      size: file.size!,
    }

    return new Attachment(attributes, file)
  }

  public static fromBuffer(buffer: Buffer): Promise<Attachment> {
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
        const attributes = {
          extname: ext,
          mimeType: mime,
          size: buffer.length,
        }

        return resolve(new Attachment(attributes, null, buffer))
      } catch (error) {
        return reject(error)
      }
    })
  }

  /**
   * Create attachment instance from the database response
   */
  public static fromDbResponse(response: any) {
    if (response === null) {
      return null
    }

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
     * Files fetched from DB are always persisted
     */
    attachment.isPersisted = true
    return attachment
  }

  /**
   * Attachment options
   */
  private options?: AttachmentOptions

  /**
   * The name is available only when "isPersisted" is true.
   */
  public name: string

  /**
   * The url is available only when "isPersisted" is true.
   */
  public url: string

  /**
   * The file size in bytes
   */
  public size = this.attributes.size

  /**
   * The file extname. Inferred from the bodyparser file extname
   * property
   */
  public extname = this.attributes.extname

  /**
   * The file mimetype.
   */
  public mimeType = this.attributes.mimeType

  /**
   * "isLocal = true" means the instance is created locally
   * using the bodyparser file object
   */
  public isLocal = !!this.file || !!this.buffer

  /**
   * Find if the file has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the file has been deleted or not
   */
  public isDeleted: boolean

  constructor(
    private attributes: AttachmentAttributes,
    private file?: MultipartFileContract | null,
    private buffer?: Buffer | null
  ) {
    if (this.attributes.name) {
      this.name = this.attributes.name
    }
  }

  /**
   * Generates the name for the attachment and prefixes
   * the folder (if defined)
   */
  private generateName(): string {
    if (this.name) {
      return this.name
    }

    const folder = this.options?.folder
    return `${folder ? `${folder}/` : ''}${cuid()}.${this.extname}`
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
   * Save file to the disk. Results if noop when "this.isLocal = false"
   */
  public async save() {
    /**
     * Do not persist already persisted file or if the
     * instance is not local
     */
    if (!this.isLocal || this.isPersisted) {
      return
    }

    /**
     * Write to the disk
     */

    const filename = this.generateName()
    if (this.file) {
      await this.file!.moveToDisk('./', { name: filename }, this.options?.disk)
    } else if (this.buffer) {
      await this.getDisk().put(filename, this.buffer)
      this.buffer = null
    }

    /**
     * Assign name to the file
     */
    this.name = this.file?.fileName ?? filename

    /**
     * File has been persisted
     */
    this.isPersisted = true

    /**
     * Compute the URL
     */
    await this.computeUrl()
  }

  /**
   * Delete the file from the disk
   */
  public async delete() {
    if (!this.isPersisted) {
      return
    }

    await this.getDisk().delete(this.name)
    this.isDeleted = true
    this.isPersisted = false
    this.buffer = null
  }

  /**
   * Computes the URL for the attachment
   */
  public async computeUrl() {
    /**
     * Cannot compute url for a non persisted file
     */
    if (!this.isPersisted) {
      return
    }

    /**
     * Do not compute url unless preComputeUrl is set to true
     */
    if (!this.options?.preComputeUrl) {
      return
    }

    const disk = this.getDisk()

    /**
     * Generate url using the user defined preComputeUrl method
     */
    if (typeof this.options.preComputeUrl === 'function') {
      this.url = await this.options.preComputeUrl(disk, this)
      return
    }

    /**
     * Self compute the URL if "preComputeUrl" is set to true
     */
    const fileVisibility = await disk.getVisibility(this.name)
    if (fileVisibility === 'private') {
      this.url = await disk.getSignedUrl(this.name)
    } else {
      this.url = await disk.getUrl(this.name)
    }
  }

  /**
   * Returns the URL for the file. Same as "Drive.getUrl()"
   */
  public getUrl() {
    return this.getDisk().getUrl(this.name)
  }

  /**
   * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
   */
  public getSignedUrl(options?: ContentHeaders & { expiresIn?: string | number }) {
    return this.getDisk().getSignedUrl(this.name, options)
  }

  /**
   * Convert attachment to plain object to be persisted inside
   * the database
   */
  public toObject(): AttachmentAttributes {
    return {
      name: this.name,
      extname: this.extname,
      size: this.size,
      mimeType: this.mimeType,
    }
  }

  /**
   * Convert attachment to JSON object to be sent over
   * the wire
   */
  public toJSON(): AttachmentAttributes & { url?: string } {
    return {
      ...(this.url ? { url: this.url } : {}),
      ...this.toObject(),
    }
  }
}
