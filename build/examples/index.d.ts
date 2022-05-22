import { BaseModel } from '@ioc:Adonis/Lucid/Orm';
import { AttachmentContract } from '@ioc:Adonis/Addons/AttachmentLite';
export declare class User extends BaseModel {
    id: number;
    email: string;
    avatar: AttachmentContract;
}
