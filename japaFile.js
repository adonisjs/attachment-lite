require('@adonisjs/require-ts/build/register')

const { configure } = require('japa')

configure({
  files: ['test/**/*.spec.ts'],
  timeout: 10000,
})