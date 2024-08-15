import { drive as createDrive, auth as GoogleAuth } from "@googleapis/drive";
import { promises as fs } from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import path from 'path';
import { Node } from './node.js';
import { MimeTypes } from './types.js';

const pipeline = promisify(stream.pipeline);

export default class GDrive {
  #drive;
  #options;
  #rootNode;

  /**
   * Constructs a new GDrive instance.
   * @param {Object} options - Configuration options.
   * @param {string} options.folderId - The root folder ID in Google Drive.
   * @param {Object} options.auth - Authentication details for Google Drive.
   * @param {string} options.auth.email - Service account email.
   * @param {string} options.auth.privateKey - Private key for authentication.
   */
  constructor(options) {
    this.#options = options;
    this.#rootNode = new Node({ id: options.folderId, mimeType: 'application/vnd.google-apps.folder' });
  }

  /**
   * Connects to Google Drive using the provided authentication details.
   * @returns {Promise<Object>} The Google Drive client.
   * @throws {Error} If connection fails.
   */
  async connect() {
    try {
      const { auth } = this.#options;
      const authClient = new GoogleAuth.JWT(
        auth.email,
        null,
        auth.privateKey,
        ['https://www.googleapis.com/auth/drive']
      );
      this.#drive = createDrive({
        version: 'v3',
        auth: authClient,
      });
      return this.#drive;
    } catch (error) {
      throw new Error(`Failed to connect to Google Drive: ${error.message}`);
    }
  }

  /**
   * Reads the contents of a directory in Google Drive.
   * @param {string} [path='/'] - The path of the directory to read.
   * @returns {Promise<Node[]>} The list of nodes in the directory.
   * @throws {Error} If the path is not a directory or if reading fails.
   */
  async readdir(path = '/') {
    try {
      const node = await this.#resolvePath(path);
      if (!node.isDirectory()) {
        throw new Error('Not a directory');
      }

      const res = await this.#drive.files.list({
        q: `'${node.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
      });

      node.children = res.data.files.map(file => new Node({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        modifiedTime: new Date(file.modifiedTime),
        createdTime: new Date(file.createdTime)
      }));

      return node.children;
    } catch (error) {
      throw new Error(`Failed to read directory: ${error.message}`);
    }
  }

  /**
   * Creates a new directory in Google Drive.
   * @param {string} path - The path of the directory to create.
   * @returns {Promise<Node>} The newly created directory node.
   * @throws {Error} If creating the directory fails.
   */
  async mkdir(path) {
    try {
      const parentPath = path.split('/').slice(0, -1).join('/') || '/';
      const folderName = path.split('/').pop();
      const parentNode = await this.#resolvePath(parentPath);

      const res = await this.#drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentNode.id],
        },
        fields: 'id, name, mimeType, modifiedTime, createdTime',
      });

      const newNode = new Node({
        id: res.data.id,
        name: res.data.name,
        mimeType: res.data.mimeType,
        size: 0,
        modifiedTime: new Date(res.data.modifiedTime),
        createdTime: new Date(res.data.createdTime)
      });
      parentNode.addChild(newNode);

      return newNode;
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Writes a file to Google Drive.
   * @param {string} path - The path where the file will be written.
   * @param {string|Buffer} content - The content to write to the file.
   * @returns {Promise<Node>} The newly created file node.
   * @throws {Error} If writing the file fails.
   */
  async writeFile(path, content) {
    try {
      const parentPath = path.split('/').slice(0, -1).join('/') || '/';
      const fileName = path.split('/').pop();
      const parentNode = await this.#resolvePath(parentPath);

      const res = await this.#drive.files.create({
        requestBody: {
          name: fileName,
          parents: [parentNode.id],
        },
        media: {
          mimeType: 'text/plain',
          body: content,
        },
        fields: 'id, name, mimeType, size, modifiedTime, createdTime',
      });

      const newNode = new Node({
        id: res.data.id,
        name: res.data.name,
        mimeType: res.data.mimeType,
        size: parseInt(res.data.size) || 0,
        modifiedTime: new Date(res.data.modifiedTime),
        createdTime: new Date(res.data.createdTime)
      });
      parentNode.addChild(newNode);

      return newNode;
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Reads the content of a file from Google Drive.
   * @param {string} path - The path of the file to read.
   * @returns {Promise<string>} The file content.
   * @throws {Error} If the path is a directory or if reading fails.
   */
  async readFile(path) {
    try {
      const node = await this.#resolvePath(path);
      if (node.isDirectory()) {
        throw new Error('Cannot read a directory as a file');
      }

      const res = await this.#drive.files.get({ fileId: node.id, alt: 'media' }, { responseType: 'text' });
      return res.data;
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Deletes a file or directory from Google Drive.
   * @param {string} path - The path of the file or directory to delete.
   * @returns {Promise<void>} 
   * @throws {Error} If deletion fails.
   */
  async unlink(path) {
    try {
      const node = await this.#resolvePath(path);
      await this.#drive.files.delete({ fileId: node.id });

      // Remove the node from its parent's children
      const parentPath = path.split('/').slice(0, -1).join('/') || '/';
      const parentNode = await this.#resolvePath(parentPath);
      parentNode.children = parentNode.children.filter(child => child.id !== node.id);
    } catch (error) {
      throw new Error(`Failed to delete file/directory: ${error.message}`);
    }
  }

  /**
   * Renames or moves a file or directory in Google Drive.
   * @param {string} oldPath - The current path of the file or directory.
   * @param {string} newPath - The new path for the file or directory.
   * @returns {Promise<Node>} The renamed or moved node.
   * @throws {Error} If renaming or moving fails.
   */
  async rename(oldPath, newPath) {
    try {
      const node = await this.#resolvePath(oldPath);
      const newParentPath = newPath.split('/').slice(0, -1).join('/') || '/';
      const newName = newPath.split('/').pop();
      const newParentNode = await this.#resolvePath(newParentPath);

      await this.#drive.files.update({
        fileId: node.id,
        requestBody: {
          name: newName,
        },
        addParents: newParentNode.id,
        removeParents: node.parents ? node.parents[0] : undefined,
        fields: 'id, name, parents',
      });

      // Update the node
      node.name = newName;

      // Remove the node from its old parent's children
      if (oldPath !== '/') {
        const oldParentPath = oldPath.split('/').slice(0, -1).join('/') || '/';
        const oldParentNode = await this.#resolvePath(oldParentPath);
        oldParentNode.children = oldParentNode.children.filter(child => child.id !== node.id);
      }

      // Add the node to its new parent's children
      newParentNode.addChild(node);

      return node;
    } catch (error) {
      throw new Error(`Failed to rename/move: ${error.message}`);
    }
  }

  /**
   * Retrieves the stats of a file or directory in Google Drive.
   * @param {string} path - The path of the file or directory.
   * @returns {Promise<Object>} An object containing stats like isDirectory, size, mtime, and ctime.
   * @throws {Error} If retrieving stats fails.
   */
  async stat(path) {
    try {
      const node = await this.#resolvePath(path);
      return {
        isDirectory: node.isDirectory(),
        size: node.size,
        mtime: node.modifiedTime,
        ctime: node.createdTime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  /**
   * Searches for files and directories in Google Drive based on specific criteria.
   * @param {Object} options - Search criteria.
   * @param {string} [options.name] - The name pattern to search for.
   * @param {string} [options.mimeType] - The MIME type to search for.
   * @param {number} [options.minSize] - The minimum size of files to search for.
   * @param {number} [options.maxSize] - The maximum size of files to search for.
   * @param {Date} [options.modifiedAfter] - Search for files modified after this date.
   * @param {Date} [options.modifiedBefore] - Search for files modified before this date.
   * @param {string} [path='/'] - The path to search within.
   * @returns {Promise<Node[]>} The list of nodes that match the search criteria.
   * @throws {Error} If the search fails.
   */
  async search(options, path = '/') {
    try {
      const parentNode = await this.#resolvePath(path);
      const queryParts = [`'${parentNode.id}' in parents`, 'trashed = false'];

      if (options.name) {
        queryParts.push(`name contains '${options.name}'`);
      }
      if (options.mimeType) {
        queryParts.push(`mimeType = '${options.mimeType}'`);
      }
      if (options.minSize) {
        queryParts.push(`size >= ${options.minSize}`);
      }
      if (options.maxSize) {
        queryParts.push(`size <= ${options.maxSize}`);
      }
      if (options.modifiedAfter) {
        queryParts.push(`modifiedTime > '${options.modifiedAfter.toISOString()}'`);
      }
      if (options.modifiedBefore) {
        queryParts.push(`modifiedTime < '${options.modifiedBefore.toISOString()}'`);
      }

      const query = queryParts.join(' and ');

      const res = await this.#drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
        orderBy: options.orderBy || 'modifiedTime desc',
        pageSize: options.limit || 100
      });

      return res.data.files.map(file => new Node({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        modifiedTime: new Date(file.modifiedTime),
        createdTime: new Date(file.createdTime)
      }));
    } catch (error) {
      throw new Error(`Failed to search: ${error.message}`);
    }
  }

  /**
   * Copies a file in Google Drive from one location to another.
   * @param {string} sourcePath - The source path of the file.
   * @param {string} destinationPath - The destination path for the copy.
   * @returns {Promise<Node>} The newly created node for the copied file.
   * @throws {Error} If copying the file fails.
   */
  async copy(sourcePath, destinationPath) {
    try {
      const sourceNode = await this.#resolvePath(sourcePath);
      const destParentPath = destinationPath.split('/').slice(0, -1).join('/') || '/';
      const destParentNode = await this.#resolvePath(destParentPath);
      const newName = destinationPath.split('/').pop();

      const res = await this.#drive.files.copy({
        fileId: sourceNode.id,
        requestBody: {
          name: newName,
          parents: [destParentNode.id],
        },
        fields: 'id, name, mimeType, size, modifiedTime, createdTime',
      });

      const newNode = new Node({
        id: res.data.id,
        name: res.data.name,
        mimeType: res.data.mimeType,
        size: parseInt(res.data.size) || 0,
        modifiedTime: new Date(res.data.modifiedTime),
        createdTime: new Date(res.data.createdTime)
      });
      destParentNode.addChild(newNode);

      return newNode;
    } catch (error) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Resolves a path in Google Drive to its corresponding node.
   * @param {string} path - The path to resolve.
   * @returns {Promise<Node>} The node corresponding to the path.
   * @private
   * @throws {Error} If the path is not found.
   */
  async #resolvePath(path) {
    const parts = path.split('/').filter(Boolean);
    let currentNode = this.#rootNode;

    for (const part of parts) {
      const childNode = currentNode.children?.find(child => child.name === part);
      if (!childNode) {
        const res = await this.#drive.files.list({
          q: `'${currentNode.id}' in parents and name = '${part}' and trashed = false`,
          fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
        });

        if (res.data.files.length === 0) {
          throw new Error(`Path not found: ${path}`);
        }

        const file = res.data.files[0];
        const newNode = new Node({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: parseInt(file.size) || 0,
          modifiedTime: new Date(file.modifiedTime),
          createdTime: new Date(file.createdTime)
        });
        currentNode.addChild(newNode);
        currentNode = newNode;
      } else {
        currentNode = childNode;
      }
    }

    return currentNode;
  }
}