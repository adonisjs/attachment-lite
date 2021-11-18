/*
 * adonis-responsive-attachment
 *
 * (c) Ndianabasi Udonkang <ndianabasi@furnish.ng>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import type { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Orm'
import type {
  AttachmentOptions,
  ResponsiveAttachmentContract,
  ResponsiveAttachmentDecorator,
} from '@ioc:Adonis/Addons/ResponsiveAttachment'

import { ResponsiveAttachment } from './index'

/**
 * Default breakpoint options
 */
const DEFAULT_BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
}

/**
 * Persist attachment for a given attachment property
 */
async function persistAttachment(
  modelInstance: LucidRow,
  property: string,
  options?: AttachmentOptions
) {
  const existingFile = modelInstance.$original[property] as ResponsiveAttachmentContract
  const newFile = modelInstance[property] as ResponsiveAttachmentContract

  /**
   * Skip when the attachment property hasn't been updated
   */
  if (existingFile === newFile) {
    return
  }

  /**
   * There was an existing file, but there is no new file. Hence we must
   * remove the existing file.
   */
  if (existingFile && !newFile) {
    existingFile.setOptions(options)
    modelInstance['attachments'].detached.push(existingFile)
    return
  }

  /**
   * If there is a new file and its local then we must save this
   * file.
   */
  if (newFile && newFile.isLocal) {
    newFile.setOptions(options)
    modelInstance['attachments'].attached.push(newFile)

    /**
     * If there was an existing file, then we must get rid of it
     */
    if (existingFile) {
      existingFile.setOptions(options)
      modelInstance['attachments'].detached.push(existingFile)
    }

    /**
     * Also write the file to the disk right away
     */
    const finalImageData = await newFile.save()

    /**
     * Use this `finalImageData` as the value to be persisted
     * on the column for the `property`
     */
    modelInstance[property] = finalImageData
  }
}

/**
 * During commit, we should cleanup the old detached files
 */
async function commit(modelInstance: LucidRow) {
  await Promise.allSettled(
    modelInstance['attachments'].detached.map((attachment: ResponsiveAttachmentContract) => {
      return attachment.delete()
    })
  )
}

/**
 * During rollback we should remove the attached files.
 */
async function rollback(modelInstance: LucidRow) {
  await Promise.allSettled(
    modelInstance['attachments'].attached.map((attachment: ResponsiveAttachmentContract) => {
      return attachment.delete()
    })
  )
}

/**
 * Implementation of the model save method.
 */
async function saveWithAttachments() {
  this['attachments'] = this['attachments'] || {
    attached: [],
    detached: [],
  }

  /**
   * Persist attachments before saving the model to the database. This
   * way if file saving fails we will not write anything to the
   * database
   */
  await Promise.all(
    this.constructor['attachments'].map(
      (attachmentField: { property: string; options?: AttachmentOptions }) =>
        persistAttachment(this, attachmentField.property, attachmentField.options)
    )
  )

  try {
    await this['originalSave']()

    /**
     * If model is using transaction, then wait for the transaction
     * to settle
     */
    if (this.$trx) {
      this.$trx!.after('commit', () => commit(this))
      this.$trx!.after('rollback', () => rollback(this))
    } else {
      await commit(this)
    }
  } catch (error) {
    await rollback(this)
    throw error
  }
}

/**
 * Implementation of the model delete method.
 */
async function deleteWithAttachments() {
  this['attachments'] = this['attachments'] || {
    attached: [],
    detached: [],
  }

  /**
   * Mark all attachments for deletion
   */
  this.constructor['attachments'].forEach(
    (attachmentField: { property: string; options?: AttachmentOptions }) => {
      if (this[attachmentField.property]) {
        this['attachments'].detached.push(this[attachmentField.property])
      }
    }
  )

  await this['originalDelete']()

  /**
   * If model is using transaction, then wait for the transaction
   * to settle
   */
  if (this.$trx) {
    this.$trx!.after('commit', () => commit(this))
  } else {
    await commit(this)
  }
}

/**
 * Pre-compute URLs after a row has been fetched from the database
 */
async function afterFind(modelInstance: LucidRow) {
  await Promise.all(
    modelInstance.constructor['attachments'].map(
      (attachmentField: { property: string; options?: AttachmentOptions }) => {
        if (modelInstance[attachmentField.property]) {
          ;(modelInstance[attachmentField.property] as ResponsiveAttachment).setOptions(
            attachmentField.options
          )
          return (modelInstance[attachmentField.property] as ResponsiveAttachment).computeUrls()
        }
      }
    )
  )
}

/**
 * Pre-compute URLs after more than one rows are fetched
 */
async function afterFetch(modelInstances: LucidRow[]) {
  await Promise.all(modelInstances.map((row) => afterFind(row)))
}

/**
 * Attachment decorator
 */
export const responsiveAttachment: ResponsiveAttachmentDecorator = (options) => {
  return function (target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()

    /**
     * Separate attachment options from the column options
     */
    const {
      disk,
      folder,
      preComputeUrls = false,
      breakpoints = DEFAULT_BREAKPOINTS,
      forceFormat = false,
      optimizeOrientation = true,
      optimizeSize = true,
      responsiveDimensions = true,
      ...columnOptions
    } = options || {}

    /**
     * Define attachments array on the model constructor
     */
    Model.$defineProperty('attachments' as any, [], 'inherit')

    /**
     * Push current column (the one using the @attachment decorator) to
     * the attachments array
     */
    Model['attachments'].push({
      property,
      options: {
        disk,
        folder,
        preComputeUrls,
        breakpoints,
        forceFormat,
        optimizeOrientation,
        optimizeSize,
        responsiveDimensions,
      },
    })

    /**
     * Define the property as a column too
     */
    Model.$addColumn(property, {
      ...columnOptions,
      consume: (value) => (value ? ResponsiveAttachment.fromDbResponse(value) : null),
      prepare: (value) => (value ? JSON.stringify(value) : null),
    })

    /**
     * Overwrite the "save" method to save the model with attachments. We
     * will get rid of it once models will have middleware support
     */
    if (!Model.prototype['originalSave']) {
      Model.prototype.originalSave = Model.prototype.save
      Model.prototype.save = saveWithAttachments
    }

    /**
     * Overwrite the "delete" method to delete files when row is removed. We
     * will get rid of it once models will have middleware support
     */
    if (!Model.prototype['originalDelete']) {
      Model.prototype.originalDelete = Model.prototype.delete
      Model.prototype.delete = deleteWithAttachments
    }

    /**
     * Do not register hooks when "preComputeUrl" is not defined
     * inside the options
     */
    if (!options?.preComputeUrls) {
      return
    }

    /**
     * Registering all hooks only once
     */
    if (!Model.$hooks.has('after', 'find', afterFind)) {
      Model.after('find', afterFind)
    }
    if (!Model.$hooks.has('after', 'fetch', afterFetch)) {
      Model.after('fetch', afterFetch)
    }
    if (!Model.$hooks.has('after', 'paginate', afterFetch)) {
      Model.after('paginate', afterFetch)
    }
  }
}
