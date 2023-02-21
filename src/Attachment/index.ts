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
  AttachmentConfig,
  VariantAttributes,
} from '@ioc:Adonis/Addons/AttachmentLite'
import { Variant } from './variant'

const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType']

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class Attachment implements AttachmentContract {
  private static drive: DriveManagerContract
  private static config: AttachmentConfig = { variants: {} }

  /**
   * Refrence to the config
   */
  public static getConfig() {
    return this.config
  }

  /**
   * Set the config instance
   */
  public static setConfig(config: AttachmentConfig) {
    this.config = config
  }

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
      variants: {},
    }

    return new Attachment(attributes, file)
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
     * Variants should be empty object incase it is not available
     */
    if (!attachment.variants) attachment.variants = {}

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
  public isLocal = !!this.file

  /**
   * Find if the file has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the file has been deleted or not
   */
  public isDeleted: boolean

  /**
   * Find variants which should be regenerated
   */
  public shouldBeRegenerateFor?: string | Array<string>

  /**
   * Stores variants of the current file
   */
  public variants: { [name: string]: VariantAttributes & { url?: string } }

  constructor(private attributes: AttachmentAttributes, private file?: MultipartFileContract) {
    if (this.attributes.name) {
      this.name = this.attributes.name
    }

    if (this.attributes.variants) {
      this.variants = this.attributes.variants
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
    if (this.shouldBeRegenerateFor) {
      await this.createVariants(this.name)
      await this.computeUrl()
    }

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
    await this.file!.moveToDisk('./', { name: this.generateName() }, this.options?.disk)

    /**
     * Generate file variants
     */
    await this.createVariants(this.file!.filePath!)

    /**
     * Assign name to the file
     */
    this.name = this.file!.fileName!

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

    /**
     * Delete all file variants
     */
    if (this.variants) {
      await Promise.all(
        Object.keys(this.variants).map((k) => this.getDisk().delete(this.variants[k].name))
      )
    }

    this.isDeleted = true
    this.isPersisted = false
  }

  private getVariantsConfig() {
    /**
     * Get Attachment configuration
     */
    let { variants } = Attachment.getConfig()

    /**
     * Store variants combined from Attachment config and @attachment() decorator.
     */
    let versions: AttachmentConfig['variants'] = {}

    /**
     * Return if no variants are specified.
     */
    if (!variants || !this.options?.variants) return false

    /**
     * Extract variants from @attachment() decorator
     * and map config for each variant.
     */
    if (this.options?.variants && Array.isArray(this.options.variants)) {
      this.options?.variants.forEach((v) => {
        versions[v] = variants[v]
      })
    }

    /**
     * Update versions incase we don't have options specified in @attachment() decorator
     */
    if (Object.keys(versions).length === 0) {
      versions = variants
    }

    /**
     * Add all variant names who should be regenerated.
     */
    if (this.shouldBeRegenerateFor && this.shouldBeRegenerateFor !== 'all') {
      const data = {}

      if (typeof this.shouldBeRegenerateFor === 'string') {
        this.shouldBeRegenerateFor = [this.shouldBeRegenerateFor]
      }

      for (const v of this.shouldBeRegenerateFor) {
        if (!versions[v]) continue

        data[v] = versions[v]
      }

      return data
    }

    /**
     * Return processed variants
     */
    return versions
  }

  /**
   * Create file variants
   */
  private async createVariants(filePath: string | Buffer) {
    /**
     * Get variant configuration
     */
    const variantsConfig = this.getVariantsConfig()

    /**
     * Return noop if there are no variants to generate
     */
    if (variantsConfig === false) return

    /**
     * Generate all specified variants
     */
    await Promise.all(
      Object.keys(variantsConfig).map(async (key) => {
        const variant = new Variant(filePath)
        const buffer = await variant.generate({
          ...variantsConfig[key],
          folder: this.options?.folder,
        })

        /**
         * Delete old variant from disk
         */
        if (this.variants[key]) {
          await this.getDisk().delete(this.variants[key].name)
        }

        /**
         * Save variant to disk
         */
        await this.getDisk().put(variant.name, buffer!)

        /**
         * Replace variant details with updated filename and metadata
         */
        this.variants[key] = variant.toObject()
      })
    )
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

    /**
     * Compute urls for all variants
     */
    for (const key in this.variants) {
      const fileVariantVisibility = await disk.getVisibility(this.variants[key].name)
      if (fileVariantVisibility === 'private') {
        this.variants[key].url = await disk.getSignedUrl(this.variants[key].name)
      } else {
        this.variants[key].url = await disk.getUrl(this.variants[key].name)
      }
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
      variants: this.variants || {},
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
