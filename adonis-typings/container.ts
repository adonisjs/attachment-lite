/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Application' {
  import AttachmentLite from '@ioc:Adonis/Addons/AttachmentLite'

  interface ContainerBindings {
    'Adonis/Addons/AttachmentLite': typeof AttachmentLite
  }
}
