/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/ResponsiveAttachment' {
  export type ImageBreakpoints = {
    thumbnail: ImageAttributes
    large: ImageAttributes
    medium: ImageAttributes
    small: ImageAttributes
  }

  export type ImageInfo = {
    name?: string
    hash?: string
    extname: string
    mimeType: string
    size: number
    path?: string | null
    buffer?: Buffer | null
    width?: number
    height?: number
    /**
     * The image format used by sharp to force conversion
     * to different file types/formats
     */
    format?: AttachmentOptions['forceFormat']
    breakpoints?: ImageBreakpoints | null
    url?: string | null
  }

  export type ImageData = {
    data: { fileInfo: ImageInfo | ImageInfo[] }
    files: AttachedImage
  }

  export type AttachedImage = { filePath?: string; name?: string; type?: string; size: number }

  export type EnhancedImageInfo = { absoluteFilePath: string; type: string; size: number }

  export type OptimizedOutput = {
    buffer?: Buffer
    info?: {
      width: number
      height: number
      size: number
      format: AttachmentOptions['forceFormat']
      mimeType: string
      extname: string
    }
  }

  export type ImageDimensions = {
    width: number | undefined
    height: number | undefined
  }

  export type BreakpointFormat = ({ key: keyof ImageBreakpoints } & { file: ImageInfo }) | null

  export type AttachmentAttributes = Partial<ImageInfo>

  export type FileDimensions = {
    width?: number
    height?: number
  }

  export type UrlRecords = {
    url: string
    breakpoints: Record<keyof ImageBreakpoints, { url: string }>
  }

  export type NameRecords = {
    name: string
    breakpoints: Record<keyof ImageBreakpoints, { name: string }>
  }
}
