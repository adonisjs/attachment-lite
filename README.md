# Adonis Responsive Attachment

<div align="center">
  <img src="./assets/Cover-Image-Adonis-Responsive-Attachment.jpg" />
</div>

---


[![github-actions-image]][github-actions-url] [![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

The Adonis Responsive Attachment package allows you to generate and persist optimised responsive images from uploaded images. It integrates with AdonisJS Lucid by converting any column on your Lucid model to an image attachment data type via the `@responsiveAttachment` decorator.

Adonis Responsive Attachment generates very detailed metadata of the original file and generated responsive images and persists the metadata to the `decorated` column within the database. It does not require any additional database tables and stores the file metadata as JSON within the same specified/decorated column.

This add-on only accepts image files and is a fork of the [Attachment Lite](https://github.com/adonisjs/attachment-lite) add-on. The main difference between the `Adonis Responsive Attachment` and `Attachment Lite` is that `Attachment Lite` accepts all file types while `Adonis Responsive Attachment` only accepts image files. Also, `Attachment Lite` only persists the original uploaded file plus its metadata while `Adonis Responsive Attachment` persists the uploaded image and generated responsive images to disk and their metadata to the database.

## Why Use this Add-On?

The ability of your application/website to serve different sizes of the same image across different devices is an important factor for improving the performance of your application/website. If your visitor is accessing your website with a mobile device whose screen width is less than 500px, it is performant and data-friendly to serve that device a banner which isn't wider than 500px. On the other hand, if a visitor is accessing your website with a laptop with a minimum screen size of 1400px, it makes sense not to serve that device a banner whose width is less than 1200px so that the image does not appear pixelated.

The Adonis Responsive Attachment add-on provides the ability to generate unlimited number of responsive sizes from an uploaded image and utilise the `srcset` and `sizes` attributes to serve and render different sizes of the same image to a visitor based on the size of their screen. You should get familiar with this concept by studying the [Responsive Images topic on MDN](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images).

## Use Case for this Add-On

Let us assume you are developing a blog. On the article page, you need to upload a cover image. You also need to generate responsive sizes of the uploaded cover image so that you can serve different sizes to different devices based on their screen sizes. This add-on will optimise and persist the original cover image saving you up to 50% reduction is the file size. It will also generate and persist optimised responsive cover images at various breakpoints which you can customise. Additionally, for the original and responsive cover images, the add-on will generate detailed metadata of the images and persist the metadata as the value for the column within the database. 

On the frontend of your blog, you can use the `srcset` attribute of the `img` element to define and serve the different cover image sizes. You can also use the `picture` wrapper element with the `source` element to define and serve the responsive cover images.

## Features

- Turn any column in your database to an image attachment data type.
- No additional database tables are required. The metadata of the original and responsive images are stored as JSON within the same column.
- Automatically removes the old images (original and generated responsive images) from the disk when a new image is assigned to the model.
- Handles failure cases gracefully. No images will be stored if the model fails to persist.
- Similarly, no old images are removed if the model fails to persist during an update or the deletion fails.
- Provides detailed properties of the original and generated images including: `name`, `width`, `height`, `size`, `format`, `mimetype`, `hash`, `extname`, and `url`.
- Can auto-rotate images during the optimisation process.
- Allows you to customise the breakpoints for generating the responsive images
- Allows you to disable generation of responsive images.
- Allows you to disable optimisation of images.
- Converts images from one format to another. The following formats are supported: `jpeg`, `png`, `webp`, `tiff`, and `avif`.
- Allows you to disable some breakpoints.
- Allows you to disable the generation of the thumbnail image without affecting the generation of other responsive images.
- Ability to create attachments from file buffers. This is very helpful when you want to persist images outside of the HTTP life-cycle.

## Pre-requisites

The `attachment-lite` package requires `@adonisjs/lucid >= v16.3.1` and `@adonisjs/core >= 5.3.4`.

It relies on [AdonisJS drive](https://docs.adonisjs.com/guides/drive) for writing files on the disk.

It also relies heavily on the [Sharp image manipulation library](https://sharp.pixelplumbing.com/) for performing image optimisations and generation of responsive images.

## Setup

Install the package from the npm registry as follows.

```bash
yarn add adonis-responsive-attachment
```

Next, configure the package by running the following ace command.

```bash
node ace configure adonis-responsive-attachment
```

## Usage

First and very importantly, this addon generates a large metadata for the original and generated images which will persisted to the database. So, the column for storing the metadata must be a JSON data type. 

If you are creating the column for the first time, make sure that you use the JSON data type. Example:

```ts
  protected tableName = 'posts'
  
  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments()
      table.json('cover_image') // <-- Use a JSON data type
    })
  }
```

If you already have a column for storing image paths/URLs, you need to create a new migration and alter the column definition to a JSON data type. Example:

```bash
node ace make:migration change_cover_image_column_to_json --table=posts
```

```ts
  protected tableName = 'posts'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('cover_image').alter() // <-- Alter the column definition
    })
  }
```

The next step is to import the `responsiveAttachment` decorator and the `ResponsiveAttachmentContract` interface from the `adonis-responsive-attachment` package.

> Make sure NOT to use the `@column` decorator when using the `@responsiveAttachment` decorator.

```ts
import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import {
  responsiveAttachment,
  ResponsiveAttachmentContract
} from '@ioc:Adonis/Addons/ResponsiveAttachment'

class Post extends BaseModel {
  @responsiveAttachment()
  public coverImage: ResponsiveAttachmentContract
}
```

There are two ways to create responsive attachments with the `Adonis Responsive Attachment` add-on:

1. The `fromFile` static method:

    The `fromFile` method allows you to create responsive images from images upload via HTTP requests. It takes one parameter which is the `file` output of the `request.file()` method

2. The `fromBuffer` static method:

    The `fromBuffer` method creates responsive images from (image) buffers. These images buffers can come from any source you prefer as long as they are of type `Buffer`. This allows you to create responsive images from outside the HTTP life-cycle. The `fromBuffer` method accepts one parameter which must be a `Buffer`.

The example below shows the use of the `fromFile` static method.

```ts
import { ResponsiveAttachment } from '@ioc:Adonis/Addons/ResponsiveAttachment'

class PostsController {
  public store({ request }: HttpContextContract) {
    const coverImage = request.file('coverImage')!
    const post = new Post()

    post.coverImage = coverImage ? await ResponsiveAttachment.fromFile(coverImage) : null
    await post.save()
  }
}
```

The example below shows the use of the `fromBuffer` static method.

```ts
import { ResponsiveAttachment } from '@ioc:Adonis/Addons/ResponsiveAttachment'
import { readFile } from 'fs/promises'
class UsersController {
  public store() {
    const buffer = await readFile(join(__dirname, '../me.jpeg'))
    const user = new User()
    user.avatar = await ResponsiveAttachment.fromBuffer(buffer)
    await user.save()
  }
}
```

> NOTE: You should `await` the operation `ResponsiveAttachment.fromFile(coverImage)` as the uploaded image is being temporarily persisted during the `fromFile` operation. This is a bit different from the approach of the `attachment-lite` add-on. In order to offer a uniform syntax you are required to also await the method `ResponsiveAttachment.fromBuffer`.

The `ResponsiveAttachment.fromFile` or `ResponsiveAttachment.fromBuffer` static method creates an instance of the `ResponsiveAttachment` class from the uploaded image or provider buffer. When you persist the model to the database, the `adonis-responsive-attachment` add-on will write the file or buffer to the disk and generate optimised responsive images and thumbnails from the original image.

### Handling updates
You can update the property with a newly image, and the package will take care of removing the old images and generating and persisting new responsive images.

```ts
import { ResponsiveAttachment } from '@ioc:Adonis/Addons/ResponsiveAttachment'

class PostsController {
  public update({ request }: HttpContextContract) {
    const post = await Post.firstOrFail(1)
    const coverImage = request.file('coverImage')!

    post.coverImage = coverImage ? await ResponsiveAttachment.fromFile(coverImage) : null

    // Old file will be removed from the disk as well.
    await post.save()
  }
}
```

Or using the `fromBuffer` method:

```ts
import { ResponsiveAttachment } from '@ioc:Adonis/Addons/ResponsiveAttachment'
import { readFile } from 'fs/promises'

class UsersController {
  public store() {
    const buffer = await readFile(join(__dirname, '../me.jpeg'))

    const user = await User.firstOrFail(1)
    user.avatar = buffer ? await ResponsiveAttachment.fromBuffer(buffer) : null

    // Old file will be removed from the disk as well.
    await user.save()
  }
}
```

Similarly, assign `null` value to the model property to delete the file without assigning a new file. 

Also, make sure you update the property type on the model to be `null` as well.

```ts
class Post extends BaseModel {
  @responsiveAttachment()
  public coverImage: ResponsiveAttachmentContract | null
}
```

```ts
const post = await Post.first()
post.coverImage = null

// Removes the original and responsive images from the disk
await post.save()
```

### Handling deletes
Upon deleting the model instance, all the related original and responsive images will be removed from the disk.

> Do note: For attachment lite to delete files, you will have to use the `modelInstance.delete` method. Using `delete` on the query builder will not work.

```ts
const post = await Post.first()

// Removes any image attachments related to this post
await post.delete()
```

## The `responsiveAttachment` Decorator Options

The `responsiveAttachment` decorator accepts the following options:

1. `disk` - string,
2. `folder` - string,
3. `breakpoints` - object,
4. `forceFormat` - "jpeg" | "png" | "webp" | "tiff" | "avif",
5. `optimizeSize` - boolean,
6. `optimizeOrientation` - boolean,
7. `responsiveDimensions` - boolean,
8. `preComputeUrls` - boolean,
9. `disableThumbnail` - boolean.
10. `keepOriginal` - boolean.

Let's discuss these options

### 1. Specifying disk with the `disk` option

By default, all images are written/deleted from the default disk. However, you can specify a custom disk at the time of using the `responsiveAttachment` decorator.

> The `disk` property value is never persisted to the database. It means, if you first define the disk as `s3`, upload a few files and then change the disk value to `gcs`, the package will look for files using the `gcs` disk.

```ts
class Post extends BaseModel {
  @responsiveAttachment({ disk: 's3' })
  public coverImage: ResponsiveAttachmentContract
}
```

### 2. Specifying the Folder with the `folder` option

You can also store files inside the subfolder by defining the `folder` property as follows.

```ts
class Page extends BaseModel {
  @responsiveAttachment({ folder: 'cover-images/pages' })
  public coverImage: ResponsiveAttachmentContract
}

// or
class Post extends BaseModel {
  @responsiveAttachment({ folder: 'cover-images/posts' })
  public coverImage: ResponsiveAttachmentContract
}
```

### 3. The `breakpoints` 

The `breakpoints` option accepts an object which contains the definition for the breakpoints for the generation of responsive images. By default, it has the following value:

```ts
{
  large: 1000,
  medium: 750,
  small: 500,
}
```

With the above default values, the `adonis-responsive-attachment` add-on will generate three (3) responsive images whose widths are exactly `1000px`, `750px`, and `500px`. 

In addition, the `adonis-responsive-attachment` add-on will generate a thumbnail width the following resize options:

```ts
{
  width: 245,
  height: 156,
  fit: 'inside' as sharp.FitEnum['inside'],
}
```

This means that if the width of the original image is greater than `245px` or the height of th original image is greater than `156px`, a thumbnail will be generated with the `inside` fit type. Learn more [here](https://sharp.pixelplumbing.com/api-resize#resize).

If you need to customise the `breakpoints` options, you need to overwrite the default properties `large`, `medium`, and `small` with your own values. You can also add new properties to the default ones.

```ts
class Post extends BaseModel {
  @responsiveAttachment(
    { 
      breakpoints: {
        xlarge: 1400, // This is a custom/extra breakpoint
        large: 1050, // Make sure you overwrite `large`
        medium: 800, // Make sure you overwrite `medium`
        small: 550, // Make sure you overwrite `small`
      }
    }
  )
  public coverImage: ResponsiveAttachmentContract
}

const post = await Post.findOrFail(1)
post.coverImage.name // exists
post.coverImage.breakpoints.thumbnail.name // exists
post.coverImage.breakpoints.small.name // exists
post.coverImage.breakpoints.medium.name // exists
post.coverImage.breakpoints.large.name // exists
post.coverImage.breakpoints.xlarge.name // extra breakpoint exists
```

You can also choose to cherry-pick which breakpoint image you want to generate

```ts
class Post extends BaseModel {
  @responsiveAttachment(
    {
      breakpoints: {
        large: 'off', // Disable the `large` breakpoint
        medium: 'off', // Disable the `medium` breakpoint
        small: 550, // Make you overwrite `small`
      }
    }
  )
  public coverImage: ResponsiveAttachmentContract
}

const post = await Post.findOrFail(1)
post.coverImage.name // exists
post.coverImage.breakpoints.thumbnail.name // exists
post.coverImage.breakpoints.small.name // exists

post.coverImage.breakpoints.medium // does not exist
post.coverImage.breakpoints.large // does not exist
```

### 4. The `forceFormat` Option

The `forceFormat` option is used to change the image from one format to another. By default, the `adonis-responsive-attachment` addon will maintain the format of the uploaded image when persisting the original image and generating the responsive images. However, assuming you want to force the conversion of all supported formats to the `webp` format, you can do:

```ts
class Post extends BaseModel {
  @responsiveAttachment({forcedFormat: 'webp'})
  public coverImage: ResponsiveAttachmentContract
}
```

This will persist the original image and generated responsive images in the `webp` format.

```js
{
  name: 'original_ckw5lpv7v0002egvobe1b0oav.webp',
  size: 291.69,
  hash: 'ckw5lpv7v0002egvobe1b0oav',
  width: 1500,
  format: 'webp',
  height: 1000,
  extname: 'webp',
  mimeType: 'image/webp',
  url: null,
  breakpoints: {
    thumbnail: {
      name: 'thumbnail_ckw5lpv7v0002egvobe1b0oav.webp',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'webp',
      mimeType: 'image/webp',
      width: 234,
      height: 156,
      size: 7.96,
    },
    large: {
      name: 'large_ckw5lpv7v0002egvobe1b0oav.webp',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'webp',
      mimeType: 'image/webp',
      width: 1000,
      height: 667,
      size: 129.15,
    },
    medium: {
      name: 'medium_ckw5lpv7v0002egvobe1b0oav.webp',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'webp',
      mimeType: 'image/webp',
      width: 750,
      height: 500,
      size: 71.65,
    },
    small: {
      name: 'small_ckw5lpv7v0002egvobe1b0oav.webp',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'webp',
      mimeType: 'image/webp',
      width: 500,
      height: 333,
      size: 32.21,
    },
  },
}
```

### 5. The `optimizeSize` Option

The `optimizeSize` option enables the optimisation of the uploaded image and then use the optimised version of the uploaded image to persist the original image and generate the responsive images. By default, this is set to `true`. However, you can disable this behaviour by setting `optimizeSize` to `false`:

```ts
class Post extends BaseModel {
  @responsiveAttachment({optimizeSize: false})
  public coverImage: ResponsiveAttachmentContract
}
```

### 6. The `optimizeOrientation` Option

The `optimizeOrientation` option ensures that the orientation of the uploaded image is corrected through `auto-rotation` if the add-on detects that the orientation is not correct. This option is set to `true` by default but you can disable this behaviour by setting `optimizeOrientation` to `false`:

```ts
class Post extends BaseModel {
  @responsiveAttachment({optimizeOrientation: false})
  public coverImage: ResponsiveAttachmentContract
}

const post = await Post.findOrFail(1)
post.coverImage.name // exists
post.coverImage.breakpoints // undefined
```

### 7. The `responsiveDimensions` Option

The `responsiveDimensions` option allows the generation of the thumbnail and responsive images from the uploaded image. This option is set to `true` by default but if you do not need to generate responsive images, you can disable this behaviour by setting `responsiveDimensions` to `false`:

```ts
class Post extends BaseModel {
  @responsiveAttachment({responsiveDimensions: false})
  public coverImage: ResponsiveAttachmentContract
}
```

### 8. The `preComputeUrls` Option

Read more about this option in this section: [Using the preComputeUrls Option](#using-the-precomputeurls-option).

### 9. The `disableThumbnail` Option

The `disableThumbnail` option, if set to `true`, allows you to disable the generation of the thumbnail without affecting the generation of other breakpoint images.

```ts
class Post extends BaseModel {
  @responsiveAttachment({disableThumbnail: true})
  public coverImage: ResponsiveAttachmentContract
}

const post = await Post.findOrFail(1)
post.coverImage.name // exists
post.coverImage.breakpoints.small.name // exists
post.coverImage.breakpoints.medium.name // exists
post.coverImage.breakpoints.large.name // exists

post.coverImage.breakpoints.thumbnail // does not exist
```

### 10. The `keepOriginal` Option

The `keepOriginal` option allows you to decide whether to keep the original uploaded image or not. If you do not have any need for the original image in the future, there should be no need to keep it. By default `keepOriginal` is `true` but you can disable it by setting it to `false`.

```ts
class Post extends BaseModel {
  @responsiveAttachment({keepOriginal: false})
  public coverImage: ResponsiveAttachmentContract
}

const post = await Post.findOrFail(1)
post.coverImage.name // does not exist
post.coverImage.hash // does not exist
post.coverImage.width // does not exist
post.coverImage.format // does not exist
post.coverImage.height // does not exist
post.coverImage.extname // does not exist
post.coverImage.mimeType // does not exist

post.coverImage.breakpoints.small.name // exists
post.coverImage.breakpoints.medium.name // exists
post.coverImage.breakpoints.large.name // exists
post.coverImage.breakpoints.thumbnail.name // exists
```

## Generating URLs

By default, the `adonis-responsive-attachment`, will not generate the URLs of the original and responsive images to the JSON metadata which is persisted to the database. This helps reduce the size of the JSON. The same of the JSON will look as shown below. Notice that the root `url` property (which is the URL of the original image) is null while the `url` property is missing in the metadata of the breakpoint images.

```js
{
  name: 'original_ckw5lpv7v0002egvobe1b0oav.jpg',
  size: 291.69,
  hash: 'ckw5lpv7v0002egvobe1b0oav',
  width: 1500,
  format: 'jpeg',
  height: 1000,
  extname: 'jpg',
  mimeType: 'image/jpeg',
  url: null,
  breakpoints: {
    thumbnail: {
      name: 'thumbnail_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 234,
      height: 156,
      size: 7.96,
    },
    large: {
      name: 'large_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 1000,
      height: 667,
      size: 129.15,
    },
    medium: {
      name: 'medium_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 500,
      size: 71.65,
    },
    small: {
      name: 'small_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 500,
      height: 333,
      size: 32.21,
    },
  },
}
```

If you want to enable the automatic generation of the URLs of the original and responsive images, you have two options:

1. Set `preComputeUrls` option to `true` in the `responsiveAttachment` decorator,
2. Call the `ResponsiveAttachment.getUrls` method.

### Using the `preComputeUrls` Option

The `preComputeUrls` option when enabled (i.e. set to `true`) will pre-compute the URLs of the original and responsive images when you `find`, `fetch`, or `paginate` the model which the responsive attachment is defined within. For example:

```ts
class Post extends BaseModel {
  @responsiveAttachment({ preComputeUrls: true })
  public coverImage: ResponsiveAttachmentContract
}
```

#### During a `Fetch` result

```ts
const posts = await Post.all()
posts[0].coverImage.url // pre-computed
posts[0].coverImage.breakpoints.thumbnail.url // pre-computed
posts[0].coverImage.breakpoints.small.url // pre-computed
posts[0].coverImage.breakpoints.medium.url // pre-computed
posts[0].coverImage.breakpoints.large.url // pre-computed
posts[0].coverImage.urls // pre-computed
```

#### During a `Find` result

```ts
const post = await Post.findOrFail(1)
post.coverImage.url // pre-computed
post.coverImage.breakpoints.thumbnail.url // pre-computed
post.coverImage.breakpoints.small.url // pre-computed
post.coverImage.breakpoints.medium.url // pre-computed
post.coverImage.breakpoints.large.url // pre-computed
posts.coverImage.urls // pre-computed
```

#### During a `Pagination` result

```ts
const posts = await Post.query.paginate(1)
posts[0].coverImage.url // pre-computed
posts[0].coverImage.breakpoints.thumbnail.url // pre-computed
posts[0].coverImage.breakpoints.small.url // pre-computed
posts[0].coverImage.breakpoints.medium.url // pre-computed
posts[0].coverImage.breakpoints.large.url // pre-computed
posts[0].coverImage.urls // pre-computed
```

The `preComputeUrl` property will generate the URLs and set it on the ResponsiveAttachment class instance. Also, a signed URL is generated when the disk is **private**, and a normal URL is generated when the disk is **public**.

Pre-computation stores a JSON with `url` properties for the original and responsive images to the database. Typically, the JSON will look like this:

```ts
{
  name: 'original_ckw5lpv7v0002egvobe1b0oav.jpg',
  size: 291.69,
  hash: 'ckw5lpv7v0002egvobe1b0oav',
  width: 1500,
  format: 'jpeg',
  height: 1000,
  extname: 'jpg',
  mimeType: 'image/jpeg',
  url: '/uploads/original_ckw5lpv7v0002egvobe1b0oav.jpg?signature=eyJtZXNzYWdlIjoiL3VwbG9hZHMvb3JpZ2luYWxfY2t3NWxwdjd2MDAwMmVndm9iZTFiMG9hdi5qcGcifQ.ieXMlaRb8izlREvJ0E9iMY0I3iedalmv-pvOUIrfEZc',
  breakpoints: {
    thumbnail: {
      name: 'thumbnail_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 234,
      height: 156,
      size: 7.96,
      url: '/uploads/thumbnail_ckw5lpv7v0002egvobe1b0oav.jpg?signature=eyJtZXNzYWdlIjoiL3VwbG9hZHMvdGh1bWJuYWlsX2NrdzVscHY3djAwMDJlZ3ZvYmUxYjBvYXYuanBnIn0.RGGimHh6NuyPrB2ZgmudE7rH4RRCT3NL7kex9EmSyIo',
    },
    large: {
      name: 'large_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 1000,
      height: 667,
      size: 129.15,
      url: '/uploads/large_ckw5lpv7v0002egvobe1b0oav.jpg?signature=eyJtZXNzYWdlIjoiL3VwbG9hZHMvbGFyZ2VfY2t3NWxwdjd2MDAwMmVndm9iZTFiMG9hdi5qcGcifQ.eNC8DaqYCYd4khKhqS7DKI66SsLpD-vyVIaP8rzMmAA',
    },
    medium: {
      name: 'medium_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 500,
      size: 71.65,
      url: '/uploads/medium_ckw5lpv7v0002egvobe1b0oav.jpg?signature=eyJtZXNzYWdlIjoiL3VwbG9hZHMvbWVkaXVtX2NrdzVscHY3djAwMDJlZ3ZvYmUxYjBvYXYuanBnIn0.2ADmssxFC0vxmq4gJEgjb9Fxo1qcQ6tMVeKBqZ1ENkM',
    },
    small: {
      name: 'small_ckw5lpv7v0002egvobe1b0oav.jpg',
      hash: 'ckw5lpv7v0002egvobe1b0oav',
      extname: 'jpg',
      mimeType: 'image/jpeg',
      width: 500,
      height: 333,
      size: 32.21,
      url: '/uploads/small_ckw5lpv7v0002egvobe1b0oav.jpg?signature=eyJtZXNzYWdlIjoiL3VwbG9hZHMvc21hbGxfY2t3NWxwdjd2MDAwMmVndm9iZTFiMG9hdi5qcGcifQ.I8fwMRwY5azvlS_8B0K40BWKQNLuS-HqCB_3RXryOok',
    },
  },
}
```

### Using the `ResponsiveAttachment.getUrls` Method

If you manually generate signed or un-signed URLs for a given image attachment using the `getUrls` method. This method calls the `ResponsiveAttachment.preComputeUrls` method internally to compute the URLs of original and responsive images and returns the result as an object containing the various URLs. It also adds the URLs to the `this.url` and `this.breakpoints` properties so that you can access the URLs normally when you serialise the result as JSON.

```ts
// For unsigned URLs, do not pass in any options
await post.coverImage.getUrls()
// After
post.coverImage.url // computed
post.coverImage.breakpoints.thumbnail.url // computed
post.coverImage.breakpoints.small.url // computed
post.coverImage.breakpoints.medium.url // computed
post.coverImage.breakpoints.large.url // computed
posts.coverImage.urls // computed
```

```ts
// For signed URLs, you can pass in signing options.
// See the options at: https://docs.adonisjs.com/guides/drive#getsignedurl
await post.coverImage.getUrls({ expiresIn: '30mins' })
// or
await post.coverImage.getUrls({
  contentType: 'application/json',
  contentDisposition: 'attachment',
})
// After
post.coverImage.url // computed as a signed URL
post.coverImage.breakpoints.thumbnail.url // computed as a signed URL
post.coverImage.breakpoints.small.url // computed as a signed URL
post.coverImage.breakpoints.medium.url // computed as a signed URL
post.coverImage.breakpoints.large.url // computed as a signed URL
posts.coverImage.urls // computed as an object containing all signed URLs
```

## Generating URLs for the API response

The Drive API methods for generating URLs are asynchronous, whereas serializing a model to JSON is synchronous. Therefore, it is not to create URLs at the time of serializing a model.

```ts
// ❌ Does not work

const users = await Post.all()
users.map((post) => {
  post.coverImage.url = await post.coverImage.getUrls()
  return post
})
```

To address this use case, you can opt for pre-computing URLs

### Pre-Compute URLs on Demand

We recommend not enabling the `preComputeUrls` option when you need the URLs for just one or two queries and not within the rest of your application.

For those couple of queries, you can manually compute the URLs within the controller. Here's a small helper method that you can drop on the model directly.

```ts
class Post extends BaseModel {
  public static async preComputeUrls(models: Post | Post[]) {
    if (Array.isArray(models)) {
      await Promise.all(models.map((model) => this.preComputeUrls(model)))
      return
    }

    await models.avatar?.computeUrls()
    await models.coverImage?.computeUrls()
  }
}
```

And now use it as follows.

```ts
const posts = await Post.all()
await Post.preComputeUrls(posts)

return posts
```

Or for a single post

```ts
const post = await Post.findOrFail(1)
await Post.preComputeUrls(post)

return post
```
 
[github-actions-image]: https://img.shields.io/github/workflow/status/ndianabasi/adonis-responsive-attachment/test?style=for-the-badge
[github-actions-url]: https://github.com/ndianabasi/adonis-responsive-attachment/actions/workflows/test.yml "github-actions"

[npm-image]: https://img.shields.io/npm/v/adonis-responsive-attachment.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/adonis-responsive-attachment "npm"

[license-image]: https://img.shields.io/npm/l/adonis-responsive-attachment?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
