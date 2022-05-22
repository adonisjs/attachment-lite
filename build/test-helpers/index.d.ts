/// <reference types="@adonisjs/application/build/adonis-typings" />
import { Filesystem } from '@poppinss/dev-utils';
import { Application } from '@adonisjs/core/build/standalone';
import { ApplicationContract } from '@ioc:Adonis/Core/Application';
export declare const fs: Filesystem;
/**
 * Setup AdonisJS application
 */
export declare function setupApplication(additionalProviders?: string[], environment?: 'web' | 'repl' | 'test'): Promise<Application>;
/**
 * Setup for tests
 */
export declare function setup(application: ApplicationContract): Promise<void>;
/**
 * Performs cleanup
 */
export declare function cleanup(application: ApplicationContract): Promise<void>;
