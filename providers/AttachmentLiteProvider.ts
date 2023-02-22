/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AttachmentConfig } from '@ioc:Adonis/Addons/AttachmentLite'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AttachmentLiteProvider {
  constructor(protected application: ApplicationContract) {}

  public register() {
    this.application.container.bind('Adonis/Addons/AttachmentLite', () => {
      const { Attachment } = require('../src/Attachment')
      const { attachment } = require('../src/Attachment/decorator')

      return {
        Attachment: Attachment,
        attachment: attachment,
      }
    })
  }

  public boot() {
    this.application.container.withBindings(
      ['Adonis/Addons/AttachmentLite', 'Adonis/Core/Drive', 'Adonis/Core/Config'],
      (AttachmentLite, Drive, Config) => {
        AttachmentLite.Attachment.setDrive(Drive)
        AttachmentLite.Attachment.setConfig(
          Config.get('attachment', { variants: {} } as AttachmentConfig)
        )
      }
    )
  }
}
