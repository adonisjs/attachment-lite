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
      const { ResponsiveAttachment } = require('../src/Attachment')
      const { responsiveAttachment } = require('../src/Attachment/decorator')

      return {
        ResponsiveAttachment: ResponsiveAttachment,
        responsiveAttachment: responsiveAttachment,
      }
    })
  }

  public boot() {
    this.application.container.withBindings(
      ['Adonis/Addons/ResponsiveAttachment', 'Adonis/Core/Drive'],
      (ResponsiveAttachmentAddon, Drive) => {
        ResponsiveAttachmentAddon.ResponsiveAttachment.setDrive(Drive)
      }
    )
  }
}
