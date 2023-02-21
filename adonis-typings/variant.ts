/*
 * @adonisjs/attachment-lite
 *
 * (c) Jayant Malik <work.jayantmalik@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/AttachmentLite' {
  /**
   * Shape of config accepted by the attachment module.
   */
  export type AttachmentConfig = {
    variants: {
      [key: string]: {
        resize:
          | number
          | { width: number; height: number; fit: 'contain' | string; position: string }
        format: 'jpg' | 'png' | ['jpeg' | 'png', { mozjpeg: boolean }]
      }
    }
  }

  export interface VariantContract {
    name: string
    format: string
    extname?: string
    mimeType?: string
    size: string
    width: string
    height: string
    isProgressive: boolean
    hasAlpha: boolean
    orientation: number
    url: string

    toObject(): VariantAttributes
    generate(config: object): Promise<Buffer>
  }

  export type VariantAttributes = {
    name: string
    format: string
    extname?: string
    mimeType?: string
    size: string
    width: string
    height: string
    isProgressive: boolean
    hasAlpha: boolean
    orientation: number
  }
}
