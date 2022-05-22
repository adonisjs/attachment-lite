/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'

import { test } from '@japa/runner'
import { join } from 'path'
import supertest from 'supertest'
import { createServer } from 'http'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { BodyParserMiddleware } from '@adonisjs/bodyparser/build/src/BodyParser'

import { Attachment } from '../src/Attachment'
import { setup, cleanup, setupApplication } from '../test-helpers'
import { readFile } from 'fs/promises'

let app: ApplicationContract

test.group('Attachment | fromDbResponse', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  test('create attachment instance from db response', ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    assert.isTrue(attachment?.isPersisted)
    assert.isFalse(attachment?.isLocal)
  })

  test('save method should result in noop when attachment is created from db response', async ({
    assert,
  }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    await attachment?.save()
    assert.equal(attachment?.name, 'foo.jpg')
  })

  test('Attachment should be null when db response is null', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(null)
    assert.isNull(attachment)
  })

  test('delete persisted file', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    await attachment?.delete()
    assert.isTrue(attachment?.isDeleted)
  })

  test('compute file url', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    attachment?.setOptions({ preComputeUrl: true })

    await attachment?.computeUrl()
    assert.match(attachment?.url!, /\/uploads\/foo\.jpg\?signature=/)
  })

  test('compute file url from a custom method', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    attachment?.setOptions({
      preComputeUrl: async (_, file) => {
        return `/${file.name}`
      },
    })

    await attachment?.computeUrl()
    assert.equal(attachment?.url, '/foo.jpg')
  })
})

test.group('Attachment | fromFile', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  test('create attachment from the user uploaded file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../cat.jpeg'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(await Drive.exists(body.name))
  })

  test('store attachment inside a nested folder', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ folder: 'users/avatars' })
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../cat.jpeg'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(body.name.startsWith('users/avatars'))
    assert.isTrue(await Drive.exists(body.name))
  })

  test('pre compute url for newly created file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ preComputeUrl: true })
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../cat.jpeg'))

    assert.isDefined(body.url)
  })

  test('delete local file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ preComputeUrl: true })
        await attachment.save()
        await attachment.delete()

        assert.isFalse(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)
        assert.isTrue(attachment.isDeleted)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../cat.jpeg'))

    assert.isDefined(body.url)
  })
})

test.group('Attachment | fromBuffer', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('create attachment from the user-provided buffer', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')

    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const readableStream = await readFile(join(__dirname, 'test_image.png'))
        const attachment = await Attachment.fromBuffer(readableStream)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        assert.isTrue(await Drive.exists(attachment?.name!))
        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server).post('/')

    assert.isTrue(await Drive.exists(body.name))
  })

  test('pre-compute url for newly-created images', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')

    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const readableStream = await readFile(join(__dirname, 'test_image.png'))
        const attachment = await Attachment.fromBuffer(readableStream)
        attachment.setOptions({ preComputeUrl: true, folder: 'users/test' })
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        assert.isDefined(attachment?.url)
        assert.isNotNull(attachment?.url)

        assert.isTrue(await Drive.exists(attachment?.name!))
        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server).post('/')

    assert.isDefined(body.url)
  })

  test('delete local images', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')

    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const readableStream = await readFile(join(__dirname, 'test_image.png'))
        const attachment = await Attachment.fromBuffer(readableStream)
        attachment.setOptions({ preComputeUrl: true })
        await attachment.save()
        await attachment.delete()

        assert.isFalse(attachment?.isPersisted)
        assert.isTrue(attachment?.isLocal)
        assert.isTrue(attachment?.isDeleted)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server).post('/')

    assert.isDefined(body.url)
    assert.isNotNull(body.url)
    assert.isFalse(await Drive.exists(body.name))
  })
})

test.group('Attachment | errors', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('throw error if a `falsy` value is provided to `fromFile` method', async (assert) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        assert.plan(1)

        try {
          const attachment = await Attachment.fromFile(undefined!)
          ctx.response.send(attachment)
          ctx.response.finish()
        } catch (error) {
          assert.equal(error.message, 'You should provide a non-falsy value')
          ctx.response.send(error)
          ctx.response.finish()
        }
      })
    })

    await supertest(server).post('/')
  })

  test('throw error if an invalid DB value is provided to `fromDbResponse` method', async (assert) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        assert.plan(1)

        try {
          const attachment = Attachment.fromDbResponse(JSON.stringify({ names: 'name' }))
          ctx.response.send(attachment)
          ctx.response.finish()
        } catch (error) {
          assert.equal(
            error.message,
            `Cannot create attachment from database response. Missing attribute "name"`
          )
          ctx.response.send(error)
          ctx.response.finish()
        }
      })
    })

    await supertest(server).post('/')
  })
})
