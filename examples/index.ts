import { column, BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { attachment, AttachmentContract } from '@ioc:Adonis/Addons/AttachmentLite'

export class User extends BaseModel {
  @column()
  public id: number

  @column()
  public email: string

  @attachment()
  public avatar: AttachmentContract
}
