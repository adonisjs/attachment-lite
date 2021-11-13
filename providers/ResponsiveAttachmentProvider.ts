/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class ResponsiveAttachmentProvider {
  constructor(protected application: ApplicationContract) {}

  public register() {
    this.application.container.bind('Adonis/Addons/ResponsiveAttachment', () => {
      const { Attachment } = require('../src/Attachment/index')
      const { attachment } = require('../src/Attachment/decorator')

      return {
        Attachment: Attachment,
        attachment: attachment,
      }
    })
  }

  public boot() {
    this.application.container.withBindings(
      ['Adonis/Addons/ResponsiveAttachment', 'Adonis/Core/Drive'],
      (AttachmentLite, Drive) => {
        AttachmentLite.Attachment.setDrive(Drive)
      }
    )
  }
}
