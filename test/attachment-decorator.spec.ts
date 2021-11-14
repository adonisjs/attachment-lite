/*
 * @ndianabasi/adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi.udonkang@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'

import test from 'japa'
import { join } from 'path'
import supertest from 'supertest'
import { createServer } from 'http'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { ResponsiveAttachmentContract } from '@ioc:Adonis/Addons/ResponsiveAttachment'
import { BodyParserMiddleware } from '@adonisjs/bodyparser/build/src/BodyParser'

import { ResponsiveAttachment } from '../src/Attachment'
import { responsiveAttachment } from '../src/Attachment/decorator'
import { setup, cleanup, setupApplication } from '../test-helpers'

let app: ApplicationContract

test.group('@attachment | insert', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test.only('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'Ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body }: { body: { avatar: ResponsiveAttachment } } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), body.avatar)

    assert.isTrue(await Drive.exists(body.avatar.name!))
    assert.isTrue(await Drive.exists(body.avatar.breakpoints!.large.name))
    assert.isTrue(await Drive.exists(body.avatar.breakpoints!.medium.name))
    assert.isTrue(await Drive.exists(body.avatar.breakpoints!.small.name))
    assert.isTrue(await Drive.exists(body.avatar.breakpoints!.thumbnail.name))

    assert.isTrue(body.avatar.breakpoints!.thumbnail.size < body.avatar.breakpoints!.small.size)
    assert.isTrue(body.avatar.breakpoints!.small.size < body.avatar.breakpoints!.medium.size)
    assert.isTrue(body.avatar.breakpoints!.medium.size < body.avatar.breakpoints!.large.size)
    assert.isTrue(body.avatar.breakpoints!.large.size < body.avatar.size!)

    assert.exists(body.avatar.url)
    assert.exists(body.avatar.breakpoints!.large.url)
    assert.exists(body.avatar.breakpoints!.medium.url)
    assert.exists(body.avatar.breakpoints!.small.url)
    assert.exists(body.avatar.breakpoints!.thumbnail.url)
  })

  test('cleanup attachments when save call fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    await User.create({ username: 'ndianabasi' })

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.save()
        } catch (error) {}

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.isNull(users[0].avatar)
    assert.isFalse(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | insert with transaction', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.useTransaction(trx).save()

        await trx.commit()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), body.avatar)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })

  test('cleanup attachments when save call fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    await User.create({ username: 'ndianabasi' })

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.useTransaction(trx).save()
          await trx.commit()
        } catch (error) {
          await trx.rollback()
        }

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.isNull(users[0].avatar)
    assert.isFalse(await Drive.exists(body.avatar.name))
  })

  test('cleanup attachments when rollback is called after success', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.useTransaction(trx).save()
        await trx.rollback()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 0)
    assert.isFalse(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | update', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const { body: secondResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), secondResponse.avatar)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
    assert.isTrue(await Drive.exists(secondResponse.avatar.name))
  })

  test('cleanup attachments when save call fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.save()
        } catch {}

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const { body: secondResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
    assert.isFalse(await Drive.exists(secondResponse.avatar.name))
  })
})

test.group('@attachment | update with transaction', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {}, { client: trx })
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()
        await trx.commit()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const { body: secondResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), secondResponse.avatar)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
    assert.isTrue(await Drive.exists(secondResponse.avatar.name))
  })

  test('cleanup attachments when save call fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.useTransaction(trx).save()
          await trx.commit()
        } catch {
          await trx.rollback()
        }

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const { body: secondResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
    assert.isFalse(await Drive.exists(secondResponse.avatar.name))
  })

  test('cleanup attachments when rollback is called after success', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {}, { client: trx })
        const isLocal = user.$isLocal

        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.useTransaction(trx).save()

        isLocal ? await trx.commit() : await trx.rollback()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const { body: secondResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
    assert.isFalse(await Drive.exists(secondResponse.avatar.name))
  })
})

test.group('@attachment | resetToNull', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    await supertest(server).post('/')

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.isNull(users[0].avatar)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
  })

  test('do not remove old file when resetting to null fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.save()
        } catch {}

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    await supertest(server).post('/')

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
  })
})

test.group('@attachment | resetToNull with transaction', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('save attachment to the db and on disk', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')
        const trx = await Db.transaction()

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {}, { client: trx })
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.useTransaction(trx).save()
        await trx.commit()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    await supertest(server).post('/')

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.isNull(users[0].avatar)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
  })

  test('do not remove old file when resetting to null fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        try {
          await user.useTransaction(trx).save()
          await trx.commit()
        } catch {
          await trx.rollback()
        }

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    await supertest(server).post('/')

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
  })

  test('do not remove old file when rollback was performed after success', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')
        const trx = await Db.transaction()

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {}, { client: trx })
        const isLocal = user.$isLocal
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null

        await user.useTransaction(trx).save()
        isLocal ? await trx.commit() : await trx.rollback()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    await supertest(server).post('/')

    const users = await User.all()

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar)
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))
  })
})

test.group('@attachment | delete', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('delete attachment when model is deleted', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    await user.delete()

    const users = await User.all()
    assert.lengthOf(users, 0)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
  })

  test('do not delete attachment when deletion fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    User.before('delete', () => {
      throw new Error('Failed')
    })

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    try {
      await user.delete()
    } catch {}

    const users = await User.all()
    assert.lengthOf(users, 1)
    assert.deepEqual(users[0].avatar?.toJSON(), body.avatar)
    assert.isTrue(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | delete with transaction', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('delete attachment when model is deleted', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body: firstResponse } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    const trx = await Db.transaction()
    await user.useTransaction(trx).delete()
    assert.isTrue(await Drive.exists(firstResponse.avatar.name))

    await trx.commit()

    const users = await User.all()
    assert.lengthOf(users, 0)
    assert.isFalse(await Drive.exists(firstResponse.avatar.name))
  })

  test('do not delete attachment when deletion fails', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    User.after('delete', () => {
      throw new Error('Failed')
    })

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')

        const user = await User.firstOrNew({ username: 'ndianabasi' }, {})
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    const trx = await Db.transaction()

    try {
      await user.useTransaction(trx).delete()
    } catch {
      assert.isTrue(await Drive.exists(body.avatar.name))
      await trx.rollback()
    }

    const users = await User.all()
    assert.lengthOf(users, 1)
    assert.deepEqual(users[0].avatar?.toJSON(), body.avatar)
    assert.isTrue(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | find', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('pre compute url on find', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment({ preComputeUrls: true })
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    assert.instanceOf(user.avatar, ResponsiveAttachment)
    assert.isDefined(user.avatar?.urls)
    assert.isDefined(body.avatar.urls)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })

  test('do not pre compute when preComputeUrls is not enabled', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const user = await User.firstOrFail()
    assert.instanceOf(user.avatar, ResponsiveAttachment)
    assert.isUndefined(user.avatar?.urls)
    assert.isUndefined(body.avatar.url)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | fetch', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('pre compute url on fetch', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment({ preComputeUrls: true })
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.isDefined(users[0].avatar?.urls)
    assert.isDefined(body.avatar.url)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })

  test('do not pre compute when preComputeUrls is not enabled', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.all()
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.isUndefined(users[0].avatar?.urls)
    assert.isUndefined(body.avatar.url)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })
})

test.group('@attachment | paginate', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    ResponsiveAttachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.afterEach(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.after(async () => {
    await cleanup(app)
  })

  test('pre compute url on paginate', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment({ preComputeUrls: true })
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.query().paginate(1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.isDefined(users[0].avatar?.urls)
    assert.isDefined(body.avatar.url)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })

  test('do not pre compute when preComputeUrls is not enabled', async (assert) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @responsiveAttachment()
      public avatar: ResponsiveAttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!

        const user = new User()
        user.username = 'ndianabasi'
        user.avatar = file ? await ResponsiveAttachment.fromFile(file) : null
        await user.save()

        ctx.response.send(user)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../Status-of-Sardar-Vallabhbhai-Patel-1500x1000.jpg'))

    const users = await User.query().paginate(1)
    assert.instanceOf(users[0].avatar, ResponsiveAttachment)
    assert.isUndefined(users[0].avatar?.urls)
    assert.isUndefined(body.avatar.url)

    assert.isTrue(await Drive.exists(body.avatar.name))
  })
})
