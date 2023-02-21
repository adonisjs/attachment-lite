/*
 * @adonisjs/attachment-lite
 *
 * (c) Jayant Malik <work.jayantmalik@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import type { VariantAttributes, VariantContract } from '@ioc:Adonis/Addons/AttachmentLite'
import { cuid } from '@poppinss/utils/build/helpers'
import FileType from 'file-type'
import sharp from 'sharp'

export class Variant implements VariantContract {
  public name: string
  public format: string
  public extname?: string
  public mimeType?: string
  public size: string
  public width: string
  public height: string
  public isProgressive: boolean
  public hasAlpha: boolean
  public orientation: number
  public url: string

  constructor(private file?: string | Buffer) {}

  public async generate(config) {
    let format = config.format ? config.format : 'jpg'
    let formatoptions = {}

    if (Array.isArray(config.format)) {
      format = config.format[0] ? config.format[0] : 'jpg'
      formatoptions = config.format[1]
    }

    const buffer = await sharp(this.file)
      .withMetadata()
      .resize(config.resize!)
      .toFormat(format, formatoptions)
      .toBuffer()

    const metadata = await sharp(buffer).metadata()
    const type = await FileType.fromBuffer(buffer)
    this.format = metadata.format!
    this.size = metadata.size!.toString()
    this.width = metadata.width!.toString()
    this.height = metadata.height!.toString()
    this.isProgressive = metadata.isProgressive!
    this.hasAlpha = metadata.hasAlpha!
    this.orientation = metadata.orientation!
    this.extname = type?.ext
    this.mimeType = type?.mime

    this.name = this.generateName(config.folder)

    return buffer
  }

  public toObject(): VariantAttributes {
    return {
      name: this.name,
      format: this.format,
      size: this.size,
      width: this.width,
      height: this.height,
      isProgressive: this.isProgressive,
      hasAlpha: this.hasAlpha,
      orientation: this.orientation,
      extname: this.extname,
      mimeType: this.mimeType,
    }
  }

  private generateName(folder = null): string {
    return `${folder ? `${folder}/` : ''}${cuid()}.${this.extname}`
  }
}
