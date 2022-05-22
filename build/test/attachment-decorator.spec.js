"use strict";
/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
const decorator_1 = require("../src/Attachment/decorator");
const test_helpers_1 = require("../test-helpers");
let app;
japa_1.default.group('@attachment | insert', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.isUndefined(users[0].avatar?.url);
        assert.deepEqual(users[0].avatar?.toJSON(), body.avatar);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when save call fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        await User.create({ username: 'virk' });
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                try {
                    await user.save();
                }
                catch (error) { }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.isNull(users[0].avatar);
        assert.isFalse(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | insert with transaction', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.useTransaction(trx).save();
                await trx.commit();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), body.avatar);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when save call fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        await User.create({ username: 'virk' });
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                try {
                    await user.useTransaction(trx).save();
                    await trx.commit();
                }
                catch (error) {
                    await trx.rollback();
                }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.isNull(users[0].avatar);
        assert.isFalse(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when rollback is called after success', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.useTransaction(trx).save();
                await trx.rollback();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 0);
        assert.isFalse(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | update', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const { body: secondResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), secondResponse.avatar);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
        assert.isTrue(await Drive.exists(secondResponse.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when save call fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                try {
                    await user.save();
                }
                catch { }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const { body: secondResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
        assert.isFalse(await Drive.exists(secondResponse.avatar.name));
    });
});
japa_1.default.group('@attachment | update with transaction', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = await User.firstOrNew({ username: 'virk' }, {}, { client: trx });
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                await trx.commit();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const { body: secondResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), secondResponse.avatar);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
        assert.isTrue(await Drive.exists(secondResponse.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when save call fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                try {
                    await user.useTransaction(trx).save();
                    await trx.commit();
                }
                catch {
                    await trx.rollback();
                }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const { body: secondResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
        assert.isFalse(await Drive.exists(secondResponse.avatar.name));
    });
    (0, japa_1.default)('cleanup attachments when rollback is called after success', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = await User.firstOrNew({ username: 'virk' }, {}, { client: trx });
                const isLocal = user.$isLocal;
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.useTransaction(trx).save();
                isLocal ? await trx.commit() : await trx.rollback();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const { body: secondResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
        assert.isFalse(await Drive.exists(secondResponse.avatar.name));
    });
});
japa_1.default.group('@attachment | resetToNull', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        await (0, supertest_1.default)(server).post('/');
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.isNull(users[0].avatar);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
    });
    (0, japa_1.default)('do not remove old file when resetting to null fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                try {
                    await user.save();
                }
                catch { }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        await (0, supertest_1.default)(server).post('/');
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
    });
});
japa_1.default.group('@attachment | resetToNull with transaction', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('save attachment to the db and on disk', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = await User.firstOrNew({ username: 'virk' }, {}, { client: trx });
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.useTransaction(trx).save();
                await trx.commit();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        await (0, supertest_1.default)(server).post('/');
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.isNull(users[0].avatar);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
    });
    (0, japa_1.default)('do not remove old file when resetting to null fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = new User();
                user.username = 'virk';
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                try {
                    await user.useTransaction(trx).save();
                    await trx.commit();
                }
                catch {
                    await trx.rollback();
                }
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        await (0, supertest_1.default)(server).post('/');
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
    });
    (0, japa_1.default)('do not remove old file when rollback was performed after success', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const trx = await Db.transaction();
                const user = await User.firstOrNew({ username: 'virk' }, {}, { client: trx });
                const isLocal = user.$isLocal;
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.useTransaction(trx).save();
                isLocal ? await trx.commit() : await trx.rollback();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        await (0, supertest_1.default)(server).post('/');
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.deepEqual(users[0].avatar?.toJSON(), firstResponse.avatar);
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
    });
});
japa_1.default.group('@attachment | delete', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('delete attachment when model is deleted', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        await user.delete();
        const users = await User.all();
        assert.lengthOf(users, 0);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
    });
    (0, japa_1.default)('do not delete attachment when deletion fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        User.before('delete', () => {
            throw new Error('Failed');
        });
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        try {
            await user.delete();
        }
        catch { }
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.deepEqual(users[0].avatar?.toJSON(), body.avatar);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | delete with transaction', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('delete attachment when model is deleted', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body: firstResponse } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        const trx = await Db.transaction();
        await user.useTransaction(trx).delete();
        assert.isTrue(await Drive.exists(firstResponse.avatar.name));
        await trx.commit();
        const users = await User.all();
        assert.lengthOf(users, 0);
        assert.isFalse(await Drive.exists(firstResponse.avatar.name));
    });
    (0, japa_1.default)('do not delete attachment when deletion fails', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const Db = app.container.resolveBinding('Adonis/Lucid/Database');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        User.after('delete', () => {
            throw new Error('Failed');
        });
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = await User.firstOrNew({ username: 'virk' }, {});
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        const trx = await Db.transaction();
        try {
            await user.useTransaction(trx).delete();
        }
        catch {
            assert.isTrue(await Drive.exists(body.avatar.name));
            await trx.rollback();
        }
        const users = await User.all();
        assert.lengthOf(users, 1);
        assert.deepEqual(users[0].avatar?.toJSON(), body.avatar);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | find', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('pre compute url on find', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        assert.instanceOf(user.avatar, Attachment_1.Attachment);
        assert.isDefined(user.avatar?.url);
        assert.isDefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('Attachment response should be null when column value is null', async (assert) => {
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                let user = new User();
                user.username = 'virk';
                user.avatar = file ? Attachment_1.Attachment.fromFile(file) : null;
                await user.save();
                user = await User.firstOrFail();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isNull(body.avatar);
    });
    (0, japa_1.default)('do not pre compute when preComputeUrl is not enabled', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const user = await User.firstOrFail();
        assert.instanceOf(user.avatar, Attachment_1.Attachment);
        assert.isUndefined(user.avatar?.url);
        assert.isUndefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | fetch', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('pre compute url on fetch', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.isDefined(users[0].avatar?.url);
        assert.isDefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('Attachment response should be null when column value is null', async (assert) => {
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                await Promise.all(['virk', 'ndianabasi'].map((username) => User.firstOrCreate({ username })));
                const users = await User.all();
                ctx.response.send(users);
                ctx.response.finish();
            });
        });
        await (0, supertest_1.default)(server).post('/');
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isNull(body[0].avatar);
        assert.isNull(body[1].avatar);
    });
    (0, japa_1.default)('do not pre compute when preComputeUrl is not enabled', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.all();
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.isUndefined(users[0].avatar?.url);
        assert.isUndefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
});
japa_1.default.group('@attachment | paginate', (group) => {
    group.before(async () => {
        app = await (0, test_helpers_1.setupApplication)();
        await (0, test_helpers_1.setup)(app);
        app.container.resolveBinding('Adonis/Core/Route').commit();
        Attachment_1.Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'));
    });
    group.afterEach(async () => {
        await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users');
    });
    group.after(async () => {
        await (0, test_helpers_1.cleanup)(app);
    });
    (0, japa_1.default)('pre compute url on paginate', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.query().paginate(1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.isDefined(users[0].avatar?.url);
        assert.isDefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
    (0, japa_1.default)('Attachment response should be null when column value is null', async (assert) => {
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)({ preComputeUrl: true }),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                await Promise.all(['virk', 'ndianabasi'].map((username) => User.firstOrCreate({ username })));
                const users = await User.query().paginate(1);
                ctx.response.send(users);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server).post('/');
        assert.isNull(body.data[0].avatar);
        assert.isNull(body.data[1].avatar);
    });
    (0, japa_1.default)('do not pre compute when preComputeUrl is not enabled', async (assert) => {
        const Drive = app.container.resolveBinding('Adonis/Core/Drive');
        const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm');
        const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext');
        class User extends BaseModel {
        }
        __decorate([
            column({ isPrimary: true }),
            __metadata("design:type", String)
        ], User.prototype, "id", void 0);
        __decorate([
            column(),
            __metadata("design:type", String)
        ], User.prototype, "username", void 0);
        __decorate([
            (0, decorator_1.attachment)(),
            __metadata("design:type", Object)
        ], User.prototype, "avatar", void 0);
        const server = (0, http_1.createServer)((req, res) => {
            const ctx = HttpContext.create('/', {}, req, res);
            app.container.make(BodyParser_1.BodyParserMiddleware).handle(ctx, async () => {
                const file = ctx.request.file('avatar');
                const user = new User();
                user.username = 'virk';
                user.avatar = Attachment_1.Attachment.fromFile(file);
                await user.save();
                ctx.response.send(user);
                ctx.response.finish();
            });
        });
        const { body } = await (0, supertest_1.default)(server)
            .post('/')
            .attach('avatar', (0, path_1.join)(__dirname, '../cat.jpeg'));
        const users = await User.query().paginate(1);
        assert.instanceOf(users[0].avatar, Attachment_1.Attachment);
        assert.isUndefined(users[0].avatar?.url);
        assert.isUndefined(body.avatar.url);
        assert.isTrue(await Drive.exists(body.avatar.name));
    });
});
