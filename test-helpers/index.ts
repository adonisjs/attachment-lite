/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export const fs = new Filesystem(join(__dirname, '__app'))

/**
 * Setup AdonisJS application
 */
export async function setupApplication(
  additionalProviders?: string[],
  environment: 'web' | 'repl' | 'test' = 'test'
) {
  await fs.add('.env', '')
  await fs.add(
    'config/app.ts',
    `
    export const appKey = 'averylong32charsrandomsecretkey',
    export const http = {
      cookie: {},
      trustProxy: () => true,
    }
  `
  )

  await fs.add(
    'config/bodyparser.ts',
    `
    const config = {
      whitelistedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
      json: {
        encoding: 'utf-8',
        limit: '1mb',
        strict: true,
        types: [
          'application/json',
        ],
      },
      form: {
        encoding: 'utf-8',
        limit: '1mb',
        queryString: {},
        types: ['application/x-www-form-urlencoded'],
      },
      raw: {
        encoding: 'utf-8',
        limit: '1mb',
        queryString: {},
        types: ['text/*'],
      },
      multipart: {
        autoProcess: true,
        convertEmptyStringsToNull: true,
        processManually: [],
        encoding: 'utf-8',
        maxFields: 1000,
        limit: '20mb',
        types: ['multipart/form-data'],
      },
    }

    export default config
  `
  )

  await fs.add(
    'config/drive.ts',
    `
    export const disk = 'local',
    export const disks = {
      local: {
        driver: 'local',
        visibility: 'private',
        root: '${join(fs.basePath, 'uploads').replace(/\\/g, '/')}',
        serveFiles: true,
        basePath: '/uploads'
      }
    }
  `
  )

  await fs.add(
    'config/database.ts',
    `const databaseConfig = {
      connection: 'sqlite',
      connections: {
        sqlite: {
          client: 'sqlite3',
          connection: {
            filename: '${join(fs.basePath, 'db.sqlite3').replace(/\\/g, '/')}',
          },
        },
      }
    }
    export default databaseConfig`
  )

  const app = new Application(fs.basePath, environment, {
    providers: ['@adonisjs/core', '@adonisjs/lucid'].concat(additionalProviders || []),
  })

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  return app
}

/**
 * Create users table
 */
async function createUsersTable(client: QueryClientContract) {
  await client.schema.createTable('users', (table) => {
    table.increments('id').notNullable().primary()
    table.string('username').notNullable().unique()
    table.string('avatar').nullable()
    table.string('cover_image').nullable()
  })
}

/**
 * Setup for tests
 */
export async function setup(application: ApplicationContract) {
  const db = application.container.use('Adonis/Lucid/Database')
  await createUsersTable(db.connection())
}

/**
 * Performs cleanup
 */
export async function cleanup(application: ApplicationContract) {
  const db = application.container.use('Adonis/Lucid/Database')
  await db.connection().schema.dropTableIfExists('users')
  await db.manager.closeAll()
  await fs.cleanup()
}
