/// <reference path="../../adonis-typings/index.d.ts" />
/// <reference types="@adonisjs/drive/build/adonis-typings" />
/// <reference types="@adonisjs/bodyparser/build/adonis-typings" />
/// <reference types="node" />
import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser';
import type { DriveManagerContract, ContentHeaders } from '@ioc:Adonis/Core/Drive';
import type { AttachmentOptions, AttachmentContract, AttachmentAttributes } from '@ioc:Adonis/Addons/AttachmentLite';
/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export declare class Attachment implements AttachmentContract {
    private attributes;
    private file?;
    private buffer?;
    private static drive;
    /**
     * Refrence to the drive
     */
    static getDrive(): DriveManagerContract;
    /**
     * Set the drive instance
     */
    static setDrive(drive: DriveManagerContract): void;
    /**
     * Create attachment instance from the bodyparser
     * file
     */
    static fromFile(file: MultipartFileContract): Attachment;
    static fromBuffer(buffer: Buffer): Promise<Attachment>;
    /**
     * Create attachment instance from the database response
     */
    static fromDbResponse(response: any): Attachment | null;
    /**
     * Attachment options
     */
    private options?;
    /**
     * The name is available only when "isPersisted" is true.
     */
    name: string;
    /**
     * The url is available only when "isPersisted" is true.
     */
    url: string;
    /**
     * The file size in bytes
     */
    size: number;
    /**
     * The file extname. Inferred from the bodyparser file extname
     * property
     */
    extname: string;
    /**
     * The file mimetype.
     */
    mimeType: string;
    /**
     * "isLocal = true" means the instance is created locally
     * using the bodyparser file object
     */
    isLocal: boolean;
    /**
     * Find if the file has been persisted or not.
     */
    isPersisted: boolean;
    /**
     * Find if the file has been deleted or not
     */
    isDeleted: boolean;
    constructor(attributes: AttachmentAttributes, file?: MultipartFileContract | null | undefined, buffer?: Buffer | null | undefined);
    /**
     * Generates the name for the attachment and prefixes
     * the folder (if defined)
     */
    private generateName;
    /**
     * Returns disk instance
     */
    private getDisk;
    /**
     * Define persistance options
     */
    setOptions(options?: AttachmentOptions): this;
    /**
     * Save file to the disk. Results if noop when "this.isLocal = false"
     */
    save(): Promise<void>;
    /**
     * Delete the file from the disk
     */
    delete(): Promise<void>;
    /**
     * Computes the URL for the attachment
     */
    computeUrl(): Promise<void>;
    /**
     * Returns the URL for the file. Same as "Drive.getUrl()"
     */
    getUrl(): Promise<string>;
    /**
     * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
     */
    getSignedUrl(options?: ContentHeaders & {
        expiresIn?: string | number;
    }): Promise<string>;
    /**
     * Convert attachment to plain object to be persisted inside
     * the database
     */
    toObject(): AttachmentAttributes;
    /**
     * Convert attachment to JSON object to be sent over
     * the wire
     */
    toJSON(): AttachmentAttributes & {
        url?: string;
    };
}
