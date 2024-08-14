import { MimeTypes } from './types.js';

export class Node {
  /**
   * Create a Node.
   * @param {Object} options - The options for creating a Node.
   * @param {string} options.id - The unique identifier of the Node.
   * @param {string} options.name - The name of the Node.
   * @param {string} options.mimeType - The MIME type of the Node.
   * @param {number} [options.size=0] - The size of the Node in bytes.
   * @param {Date|null} [options.modifiedTime=null] - The last modified time of the Node.
   * @param {Date|null} [options.createdTime=null] - The creation time of the Node.
   */
  constructor({ id, name, mimeType, size = 0, modifiedTime = null, createdTime = null }) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.size = size;
    this.modifiedTime = modifiedTime;
    this.createdTime = createdTime;
  }

  /**
   * Check if the Node is a directory.
   * @returns {boolean} True if the Node is a directory, false otherwise.
   */
  isDirectory() {
    return this.mimeType === MimeTypes.Folder;
  }

  /**
   * Add a child Node to this Node.
   * @param {Node} child - The child Node to add.
   */
  addChild(child) {
    if (!this.isDirectory()) return;
    if (!this.children) this.children = [];
    this.children.push(child);
  }
}