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
require("reflect-metadata");
const japa_1 = __importDefault(require("japa"));
const path_1 = require("path");
const supertest_1 = __importDefault(require("supertest"));
const http_1 = require("http");
const BodyParser_1 = require("@adonisjs/bodyparser/build/src/BodyParser");
const Attachment_1 = require("../src/Attachment");
const test_helpers_1 = require("../test-helpers");
const promises_1 = require("fs/promises");
let app;
japa_1.default.group('Attachment | fromDbResponse', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('create attachment instance from db response', (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({
            size: 1440,
            name: 'foo.jpg',
            extname: 'jpg',
            mimeType: 'image/jpg',
        }));
        assert.isTrue(attachment?.isPersisted);
        assert.isFalse(attachment?.isLocal);
    });
    (0, japa_1.default)('save method should result in noop when attachment is created from db response', async (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({
            size: 1440,
            name: 'foo.jpg',
            extname: 'jpg',
            mimeType: 'image/jpg',
        }));
        await attachment?.save();
        assert.equal(attachment?.name, 'foo.jpg');
    });
    (0, japa_1.default)('Attachment should be null when db response is null', async (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(null);
        assert.isNull(attachment);
    });
    (0, japa_1.default)('delete persisted file', async (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({
            size: 1440,
            name: 'foo.jpg',
            extname: 'jpg',
            mimeType: 'image/jpg',
        }));
        await attachment?.delete();
        assert.isTrue(attachment?.isDeleted);
    });
    (0, japa_1.default)('compute file url', async (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({
            size: 1440,
            name: 'foo.jpg',
            extname: 'jpg',
            mimeType: 'image/jpg',
        }));
        attachment?.setOptions({ preComputeUrl: true });
        await attachment?.computeUrl();
        assert.match(attachment?.url, /\/uploads\/foo\.jpg\?signature=/);
    });
    (0, japa_1.default)('compute file url from a custom method', async (assert) => {
        const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({
            size: 1440,
            name: 'foo.jpg',
            extname: 'jpg',
            mimeType: 'image/jpg',
        }));
        attachment?.setOptions({
            preComputeUrl: async (_, file) => {
                return `/${file.name}`;
            },
        });
        await attachment?.computeUrl();
        assert.equal(attachment?.url, '/foo.jpg');
    });
});
japa_1.default.group('Attachment | fromFile', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('create attachment from the user uploaded file', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const attachment = Attachment_1.Attachment.fromFile(file);
                await attachment.save();
                assert.isTrue(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        assert.isTrue(await Drive.exists(body.name));
    });
    (0, japa_1.default)('store attachment inside a nested folder', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const attachment = Attachment_1.Attachment.fromFile(file);
                attachment.setOptions({ folder: 'users/avatars' });
                await attachment.save();
                assert.isTrue(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        assert.isTrue(body.name.startsWith('users/avatars'));
        assert.isTrue(await Drive.exists(body.name));
    });
    (0, japa_1.default)('pre compute url for newly created file', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const attachment = Attachment_1.Attachment.fromFile(file);
                attachment.setOptions({ preComputeUrl: true });
                await attachment.save();
                assert.isTrue(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        assert.isDefined(body.url);
    });
    (0, japa_1.default)('delete local file', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const attachment = Attachment_1.Attachment.fromFile(file);
                attachment.setOptions({ preComputeUrl: true });
                await attachment.save();
                await attachment.delete();
                assert.isFalse(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                assert.isTrue(attachment.isDeleted);
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        assert.isDefined(body.url);
    });
});
japa_1.default.group('Attachment | fromBuffer', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('create attachment from the user-provided buffer', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const readableStream = await (0, promises_1.readFile)((0, path_1.join)(__dirname, 'test_image.png'));
                const attachment = await Attachment_1.Attachment.fromBuffer(readableStream);
                await attachment.save();
                assert.isTrue(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                assert.isTrue(await Drive.exists(attachment?.name));
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isTrue(await Drive.exists(body.name));
    });
    (0, japa_1.default)('pre-compute url for newly-created images', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const readableStream = await (0, promises_1.readFile)((0, path_1.join)(__dirname, 'test_image.png'));
                const attachment = await Attachment_1.Attachment.fromBuffer(readableStream);
                attachment.setOptions({ preComputeUrl: true, folder: 'users/test' });
                await attachment.save();
                assert.isTrue(attachment.isPersisted);
                assert.isTrue(attachment.isLocal);
                assert.isDefined(attachment?.url);
                assert.isNotNull(attachment?.url);
                assert.isTrue(await Drive.exists(attachment?.name));
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isDefined(body.url);
    });
    (0, japa_1.default)('delete local images', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const readableStream = await (0, promises_1.readFile)((0, path_1.join)(__dirname, 'test_image.png'));
                const attachment = await Attachment_1.Attachment.fromBuffer(readableStream);
                attachment.setOptions({ preComputeUrl: true });
                await attachment.save();
                await attachment.delete();
                assert.isFalse(attachment?.isPersisted);
                assert.isTrue(attachment?.isLocal);
                assert.isTrue(attachment?.isDeleted);
                ctx.response.send(attachment);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isDefined(body.url);
        assert.isNotNull(body.url);
        assert.isFalse(await Drive.exists(body.name));
    });
});
japa_1.default.group('Attachment | errors', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('throw error if a `falsy` value is provided to `fromFile` method', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                assert.plan(1);
                try {
                    const attachment = await Attachment_1.Attachment.fromFile(undefined);
                    ctx.response.send(attachment);
                    ctx.response.finish();
                }
                catch (error) {
                    assert.equal(error.message, 'You should provide a non-falsy value');
                    ctx.response.send(error);
                    ctx.response.finish();
                }
            });
        });
        await (0, supertest_1.default)(server).post('/');
    });
    (0, japa_1.default)('throw error if an invalid DB value is provided to `fromDbResponse` method', async (assert) => {
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                assert.plan(1);
                try {
                    const attachment = Attachment_1.Attachment.fromDbResponse(JSON.stringify({ names: 'name' }));
                    ctx.response.send(attachment);
                    ctx.response.finish();
                }
                catch (error) {
                    assert.equal(error.message, `Cannot create attachment from database response. Missing attribute "name"`);
                    ctx.response.send(error);
                    ctx.response.finish();
                }
            });
        });
        await (0, supertest_1.default)(server).post('/');
    });
});
