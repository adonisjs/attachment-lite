"use strict";
/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attachment = void 0;
/// <reference path="../../adonis-typings/index.ts" />
const utils_1 = require("@poppinss/utils");
const helpers_1 = require("@poppinss/utils/build/helpers");
const detect_file_type_1 = __importDefault(require("detect-file-type"));
const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType'];
/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
class Attachment {
    constructor(attributes, file, buffer) {
        this.attributes = attributes;
        this.file = file;
        this.buffer = buffer;
        /**
         * The file size in bytes
         */
        this.size = this.attributes.size;
        /**
         * The file extname. Inferred from the bodyparser file extname
         * property
         */
        this.extname = this.attributes.extname;
        /**
         * The file mimetype.
         */
        this.mimeType = this.attributes.mimeType;
        /**
         * "isLocal = true" means the instance is created locally
         * using the bodyparser file object
         */
        this.isLocal = !!this.file || !!this.buffer;
        /**
         * Find if the file has been persisted or not.
         */
        this.isPersisted = false;
        if (this.attributes.name) {
            this.name = this.attributes.name;
        }
    }
    /**
     * Refrence to the drive
     */
    static getDrive() {
        return this.drive;
    }
    /**
     * Set the drive instance
     */
    static setDrive(drive) {
        this.drive = drive;
    }
    /**
     * Create attachment instance from the bodyparser
     * file
     */
    static fromFile(file) {
        if (!file) {
            throw new SyntaxError('You should provide a non-falsy value');
        }
        const attributes = {
            extname: file.extname,
            mimeType: `${file.type}/${file.subtype}`,
            size: file.size,
        };
        return new Attachment(attributes, file);
    }
    static fromBuffer(buffer) {
        return new Promise((resolve, reject) => {
            try {
                let bufferProperty;
                detect_file_type_1.default.fromBuffer(buffer, function (err, result) {
                    if (err) {
                        throw new Error(err instanceof Error ? err.message : err);
                    }
                    if (!result) {
                        throw new utils_1.Exception('Please provide a valid file buffer');
                    }
                    bufferProperty = result;
                });
                const { mime, ext } = bufferProperty;
                const attributes = {
                    extname: ext,
                    mimeType: mime,
                    size: buffer.length,
                };
                return resolve(new Attachment(attributes, null, buffer));
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    /**
     * Create attachment instance from the database response
     */
    static fromDbResponse(response) {
        if (response === null) {
            return null;
        }
        const attributes = typeof response === 'string' ? JSON.parse(response) : response;
        /**
         * Validate the db response
         */
        REQUIRED_ATTRIBUTES.forEach((attribute) => {
            if (attributes[attribute] === undefined) {
                throw new utils_1.Exception(`Cannot create attachment from database response. Missing attribute "${attribute}"`);
            }
        });
        const attachment = new Attachment(attributes);
        /**
         * Files fetched from DB are always persisted
         */
        attachment.isPersisted = true;
        return attachment;
    }
    /**
     * Generates the name for the attachment and prefixes
     * the folder (if defined)
     */
    generateName() {
        if (this.name) {
            return this.name;
        }
        const folder = this.options?.folder;
        return `${folder ? `${folder}/` : ''}${(0, helpers_1.cuid)()}.${this.extname}`;
    }
    /**
     * Returns disk instance
     */
    getDisk() {
        const disk = this.options?.disk;
        const Drive = this.constructor.getDrive();
        return disk ? Drive.use(disk) : Drive.use();
    }
    /**
     * Define persistance options
     */
    setOptions(options) {
        this.options = options;
        return this;
    }
    /**
     * Save file to the disk. Results if noop when "this.isLocal = false"
     */
    async save() {
        /**
         * Do not persist already persisted file or if the
         * instance is not local
         */
        if (!this.isLocal || this.isPersisted) {
            return;
        }
        /**
         * Write to the disk
         */
        const filename = this.generateName();
        if (this.file) {
            await this.file.moveToDisk('./', { name: filename }, this.options?.disk);
        }
        else if (this.buffer) {
            await this.getDisk().put(filename, this.buffer);
            this.buffer = null;
        }
        /**
         * Assign name to the file
         */
        this.name = this.file?.fileName ?? filename;
        /**
         * File has been persisted
         */
        this.isPersisted = true;
        /**
         * Compute the URL
         */
        await this.computeUrl();
    }
    /**
     * Delete the file from the disk
     */
    async delete() {
        if (!this.isPersisted) {
            return;
        }
        await this.getDisk().delete(this.name);
        this.isDeleted = true;
        this.isPersisted = false;
        this.buffer = null;
    }
    /**
     * Computes the URL for the attachment
     */
    async computeUrl() {
        /**
         * Cannot compute url for a non persisted file
         */
        if (!this.isPersisted) {
            return;
        }
        /**
         * Do not compute url unless preComputeUrl is set to true
         */
        if (!this.options?.preComputeUrl) {
            return;
        }
        const disk = this.getDisk();
        /**
         * Generate url using the user defined preComputeUrl method
         */
        if (typeof this.options.preComputeUrl === 'function') {
            this.url = await this.options.preComputeUrl(disk, this);
            return;
        }
        /**
         * Self compute the URL if "preComputeUrl" is set to true
         */
        const fileVisibility = await disk.getVisibility(this.name);
        if (fileVisibility === 'private') {
            this.url = await disk.getSignedUrl(this.name);
        }
        else {
            this.url = await disk.getUrl(this.name);
        }
    }
    /**
     * Returns the URL for the file. Same as "Drive.getUrl()"
     */
    getUrl() {
        return this.getDisk().getUrl(this.name);
    }
    /**
     * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
     */
    getSignedUrl(options) {
        return this.getDisk().getSignedUrl(this.name, options);
    }
    /**
     * Convert attachment to plain object to be persisted inside
     * the database
     */
    toObject() {
        return {
            name: this.name,
            extname: this.extname,
            size: this.size,
            mimeType: this.mimeType,
        };
    }
    /**
     * Convert attachment to JSON object to be sent over
     * the wire
     */
    toJSON() {
        return {
            ...(this.url ? { url: this.url } : {}),
            ...this.toObject(),
        };
    }
}
exports.Attachment = Attachment;
