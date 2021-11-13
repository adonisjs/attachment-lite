import { column, BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { attachment, ResponsiveAttachmentContract } from '@ioc:Adonis/Addons/ResponsiveAttachment'

export class User extends BaseModel {
  @column()
  public id: number

  @column()
  public email: string

  @attachment()
  public avatar: ResponsiveAttachmentContract
}
