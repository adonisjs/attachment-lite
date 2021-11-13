/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Application' {
  import AttachmentLite from '@ioc:Adonis/Addons/ResponsiveAttachment'

  interface ContainerBindings {
    'Adonis/Addons/ResponsiveAttachment': typeof AttachmentLite
  }
}
