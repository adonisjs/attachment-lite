# Attachment Lite

<div align="center">
  <img src="./assets/banner.jpeg" />
</div>

---

[![github-actions-image]][github-actions-url] [![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

A simple, opinionated package to convert any column on your Lucid model to an attachment data type.

Attachment lite allows you to store a reference of user uploaded files within the database. It does not require any additional database tables and stores the file metadata as JSON within the same column.

## How it works?
The `attachment-lite` package is **an alternative to the media library approach**. I believe media libraries are great when creating a CMS that wants a central place to keep all the images/documents.

However, many applications like a SAAS product or a community forum do not need media libraries.

For example, websites like Twitter or dev.to don't have a media library section where you upload and choose images from. Instead, images on these platforms are tightly coupled with the resource.

When you update your profile image on Twitter, the old image disappears, and the new one appears. There is no central gallery of images to choose the profile picture from.

A very long story to tell you that the `attachment-lite` package is an excellent solution for managing one-off file uploads in your application.

## Features
- Turn any column in your database to an attachment data type.
- No additional database tables are required. The file metadata is stored as JSON within the same column.
- Automatically removes the old file from the disk when a new file is assigned.
- Handles failure cases gracefully. No files will be stored if the model fails to persist.
- Similarly, no old files are removed if the model fails to persist during an update or the deletion fails.

## Pre-requisites
The `attachment-lite` package requires `@adonisjs/lucid >= v16.3.1` and `@adonisjs/core >= 5.3.4`.

Also, it relies on [AdonisJS drive](https://docs.adonisjs.com/guides/drive) for writing files on the disk.

## Setup
Install the package from the npm registry as follows.

```sh
npm i @adonisjs/attachment-lite
```

Next, configure the package by running the following ace command.

```sh
node ace configure @adonisjs/attachment-lite
```

## Usage

Often times, the size of the image metadata could exceed the allowable length of an SQL `String` data type. So, it is recommended to create/modify the column which will hold the metadata to use a `JSON` data type. 

If you are creating the column for the first time, make sure that you use the JSON data type. Example:

```ts
  // Within the migration file

  protected tableName = 'users'
  
  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments()
      table.json('avatar') // <-- Use a JSON data type
    })
  }
```

If you already have a column for storing image paths/URLs, you need to create a new migration and alter the column definition to a JSON data type. Example:

```bash
# Create a new migration file
node ace make:migration change_avatar_column_to_json --table=users
```

```ts
  // Within the migration file
  
  protected tableName = 'users'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('avatar').alter() // <-- Alter the column definition
    })
  }
```

Next, in the model, import the `attachment` decorator and the `AttachmentContract` interface from the package.

> Make sure NOT to use the `@column` decorator when using the `@attachment` decorator.

```ts
import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import {
  attachment,
  AttachmentContract
} from '@ioc:Adonis/Addons/AttachmentLite'

class User extends BaseModel {
  @attachment()
  public avatar: AttachmentContract
}
```

Now you can create an attachment from the user uploaded file as follows.

```ts
import { Attachment } from '@ioc:Adonis/Addons/AttachmentLite'

class UsersController {
  public store({ request }: HttpContextContract) {
    const avatar = request.file('avatar')!
    const user = new User()

    user.avatar = Attachment.fromFile(avatar)
    await user.save()
  }
}
```

The `Attachment.fromFile` creates an instance of the Attachment class from the user uploaded file. When you persist the model to the database, the attachment-lite will write the file to the disk.

### Handling updates
You can update the property with a newly uploaded user file, and the package will take care of removing the old file and storing the new one.

```ts
import { Attachment } from '@ioc:Adonis/Addons/AttachmentLite'

class UsersController {
  public update({ request }: HttpContextContract) {
    const user = await User.firstOrFail()
    const avatar = request.file('avatar')!

    user.avatar = Attachment.fromFile(avatar)

    // Old file will be removed from the disk as well.
    await user.save()
  }
}
```

Similarly, assign `null` value to the model property to delete the file without assigning a new file. 

Also, make sure you update the property type on the model to be `null` as well.

```ts
class User extends BaseModel {
  @attachment()
  public avatar: AttachmentContract | null
}
```

```ts
const user = await User.first()
user.avatar = null

// Removes the file from the disk
await user.save()
```

### Handling deletes
Upon deleting the model instance, all the related attachments will be removed from the disk.

> Do note: For attachment lite to delete files, you will have to use the `modelInstance.delete` method. Using `delete` on the query builder will not work.

```ts
const user = await User.first()

// Removes any attachments related to this user
await user.delete()
```

## Specifying disk
By default, all files are written/deleted from the default disk. However, you can specify a custom disk at the time of using the `attachment` decorator.

> The `disk` property value is never persisted to the database. It means, if you first define the disk as `s3`, upload a few files and then change the disk value to `gcs`, the package will look for files using the `gcs` disk.

```ts
class User extends BaseModel {
  @attachment({ disk: 's3' })
  public avatar: AttachmentContract
}
```

## Specifying subfolder

You can also store files inside the subfolder by defining the `folder` property as follows.

```ts
class User extends BaseModel {
  @attachment({ folder: 'avatars' })
  public avatar: AttachmentContract
}
```

## Generating URLs

You can generate a URL for a given attachment using the `getUrl` or `getSignedUrl` methods. They are identical to the [Drive methods](https://docs.adonisjs.com/guides/drive#generating-urls), just that you don't have to specify the file name.

```ts
await user.avatar.getSignedUrl({ expiresIn: '30mins' })
```

## Generating URLs for the API response

The Drive API methods for generating URLs are asynchronous, whereas serializing a model to JSON is synchronous. Therefore, it is not to create URLs at the time of serializing a model.

```ts
// ❌ Does not work

const users = await User.all()
users.map((user) => {
  user.avatar.url = await user.avatar.getSignedUrl()
  return user
})
```

To address this use case, you can opt for pre-computing URLs

### Pre compute URLs

Enable the `preComputeUrl` flag to pre compute the URLs after SELECT queries. For example:

```ts
class User extends BaseModel {
  @attachment({ preComputeUrl: true })
  public avatar: AttachmentContract
}
```

Fetch result

```ts
const users = await User.all()
users[0].avatar.url // pre computed already 
```

Find result

```ts
const user = await User.findOrFail(1)
user.avatar.url // pre computed already 
```

Pagination result

```ts
const users = await User.query.paginate(1)
users[0].avatar.url // pre computed already 
```

The `preComputeUrl` property will generate the URL and set it on the Attachment class instance. Also, a signed URL is generated when the disk is **private**, and a normal URL is generated when the disk is **public**.

### Pre compute on demand

We recommend not enabling the `preComputeUrl` option when you need the URL for just one or two queries and not within the rest of your application.

For those couple of queries, you can manually compute the URLs within the controller. Here's a small helper method that you can drop on the model directly.

```ts
class User extends BaseModel {
  public static async preComputeUrls(models: User | User[]) {
    if (Array.isArray(models)) {
      await Promise.all(models.map((model) => this.preComputeUrls(model)))
      return
    }

    await models.avatar?.computeUrl()
    await models.coverImage?.computeUrl()
  }
}
```

And now use it as follows.

```
const users = await User.all()
await User.preComputeUrls(users)

return users
```

Or for a single user

```ts
const user = await User.findOrFail(1)
await User.preComputeUrls(user)

return user
```
 
[github-actions-image]: https://img.shields.io/github/workflow/status/adonisjs/attachment-lite/test?style=for-the-badge
[github-actions-url]: https://github.com/adonisjs/attachment-lite/actions/workflows/test.yml "github-actions"

[npm-image]: https://img.shields.io/npm/v/@adonisjs/attachment-lite.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@adonisjs/attachment-lite "npm"

[license-image]: https://img.shields.io/npm/l/@adonisjs/attachment-lite?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
