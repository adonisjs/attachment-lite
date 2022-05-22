"use strict";
/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class AttachmentLiteProvider {
    constructor(application) {
        this.application = application;
    }
    register() {
        this.application.container.bind('Adonis/Addons/AttachmentLite', () => {
            const { Attachment } = require('../src/Attachment');
            const { attachment } = require('../src/Attachment/decorator');
            return {
                Attachment: Attachment,
                attachment: attachment,
            };
        });
    }
    boot() {
        this.application.container.withBindings(['Adonis/Addons/AttachmentLite', 'Adonis/Core/Drive'], (AttachmentLite, Drive) => {
            AttachmentLite.Attachment.setDrive(Drive);
        });
    }
}
exports.default = AttachmentLiteProvider;
