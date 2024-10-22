import { drive_v3, auth } from '@googleapis/drive';
import { Node } from './node';
import { GDriveOptions, NodeStat, NodeSearchOptions } from '../typings/interface';
import { DriveMimeTypes } from '../typings/enum';
import { MimeType } from '../typings/type';

export class GDrive {
  public static readonly DRIVE_VERSION: string = 'v3';
  private static readonly CONNECTION_TIMEOUT: number = 3 * 60 * 60 * 1000; // 3 hours

  #drive: drive_v3.Drive | null = null;
  #options: GDriveOptions;
  #rootNode: Node | null = null;
  #lastConnect: Date | null = null;

  constructor(options: GDriveOptions) {
    this.#options = options;
  }

  public get root(): Node | null {
    return this.#rootNode;
  };

  public get isConnected(): boolean {
    return this.#drive !== null;
  }

  public get lastConnect(): Date | null {
    return this.#lastConnect;
  }

  private async autoConnect(): Promise<void> {
    const currentTime = new Date();
    if (!this.isConnected || 
        (this.#lastConnect && currentTime.getTime() - this.#lastConnect.getTime() > GDrive.CONNECTION_TIMEOUT)) {
      await this.connect();
    }
  }
  
  public async connect(): Promise<drive_v3.Drive> {
    if (!this.#options.auth?.email || !this.#options.auth?.privateKey) {
      throw new Error('Invalid authentication credentials');
    }

    try {
      const { auth: authOptions } = this.#options;
      const authClient = new auth.JWT({
        email: authOptions.email,
        key: authOptions.privateKey,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.#drive = new drive_v3.Drive({ auth: authClient });
      this.#lastConnect = new Date();

      const rootFolderData = await this.#drive.files.get({
        fileId: this.#options.root,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime',
      });
      
      const { data } = rootFolderData;
      if (!data.id || !data.name) {
        throw new Error('Invalid root folder data received');
      }

      this.#rootNode = new Node({
        id: data.id,
        name: data.name,
        mimeType: data.mimeType as MimeType,
        size: parseInt(data.size ?? '0'),
        modifiedTime: new Date(data.modifiedTime!),
        createdTime: new Date(data.createdTime!),
      });

      return this.#drive;
    } catch (error) {
      throw new Error(`Failed to connect to Google Drive: ${(error as Error).message}`);
    }
  }

  public async readdir(path: string = '/'): Promise<Node[]> {
    await this.autoConnect();
    try {
      const node = await this.#resolvePath(path);
      if (!node.isDirectory()) {
        throw new Error('Not a directory');
      }

      const res = await this.#drive!.files.list({
        q: `'${node.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
      });

      node.children = res.data.files!.map(file => {
        const childeNode = new Node({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType as MimeType,
          size: parseInt(file.size!) || 0,
          modifiedTime: new Date(file.modifiedTime!),
          createdTime: new Date(file.createdTime!)
        })
        node.addChild(childeNode);
        return childeNode;
      });

      return node.children;
    } catch (error) {
      throw new Error(`Failed to read directory: ${(error as Error).message}`);
    }
  }

  public async mkdir(path: string): Promise<Node> {
    await this.autoConnect();
    try {
      const parentPath = path.split('/').slice(0, -1).join('/') || '/';
      const folderName = path.split('/').pop()!;
      const parentNode = await this.#resolvePath(parentPath);

      const res = await this.#drive!.files.create({
        requestBody: {
          name: folderName,
          mimeType: DriveMimeTypes.Folder,
          parents: [parentNode.id],
        },
        fields: 'id, name, mimeType, modifiedTime, createdTime',
      });

      const newNode = new Node({
        id: res.data.id!,
        name: res.data.name!,
        mimeType: res.data.mimeType as MimeType,
        size: 0,
        modifiedTime: new Date(res.data.modifiedTime!),
        createdTime: new Date(res.data.createdTime!)
      });
      parentNode.addChild(newNode);

      return newNode;
    } catch (error) {
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  public async writeFile(path: string, content: string | Buffer): Promise<Node> {
    await this.autoConnect();
    try {
      const parentPath = path.split('/').slice(0, -1).join('/') || '/';
      const fileName = path.split('/').pop()!;
      const parentNode = await this.#resolvePath(parentPath);

      // Check if file already exists
      const existingFile = await this.#findFileInFolder(parentNode.id, fileName);
      
      if (existingFile) {
        // Update existing file
        const res = await this.#drive!.files.update({
          fileId: existingFile.id!,
          requestBody: {
            name: fileName,
          },
          media: {
            mimeType: 'text/plain',
            body: content,
          },
          fields: 'id, name, mimeType, size, modifiedTime, createdTime',
        });

        const updatedNode = new Node({
          id: res.data.id!,
          name: res.data.name!,
          mimeType: res.data.mimeType as MimeType,
          size: parseInt(res.data.size!) || 0,
          modifiedTime: new Date(res.data.modifiedTime!),
          createdTime: new Date(res.data.createdTime!)
        });
        
        // Update the node in parent's children
        if (parentNode.children) {
          const index = parentNode.children.findIndex(child => child.id === existingFile.id);
          if (index !== -1) {
            parentNode.children[index] = updatedNode;
          }
        }

        return updatedNode;
      } else {
        // Create new file
        const res = await this.#drive!.files.create({
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
          id: res.data.id!,
          name: res.data.name!,
          mimeType: res.data.mimeType as MimeType,
          size: parseInt(res.data.size!) || 0,
          modifiedTime: new Date(res.data.modifiedTime!),
          createdTime: new Date(res.data.createdTime!)
        });

        parentNode.addChild(newNode);
        return newNode;
      }
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  private async #findFileInFolder(folderId: string, fileName: string): Promise<drive_v3.Schema$File | null> {
    try {
      const res = await this.#drive!.files.list({
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
      });

      return res.data.files?.[0] || null;
    } catch (error) {
      throw new Error(`Failed to search for file: ${(error as Error).message}`);
    }
  }

  public async readFile(path: string): Promise<string> {
    await this.autoConnect();
    try {
      const node = await this.#resolvePath(path);
      if (node.isDirectory()) {
        throw new Error('Cannot read a directory as a file');
      }

      const res = await this.#drive!.files.get({ fileId: node.id, alt: 'media' }, { responseType: 'text' });
      return res.data as string;
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  public async unlink(path: string): Promise<void> {
    await this.autoConnect();
    try {
      const node = await this.#resolvePath(path);
      await this.#drive!.files.delete({ fileId: node.id });

      if (node.parent) {
        node.parent.removeChild(node.id);
      }
    } catch (error) {
      throw new Error(`Failed to delete file/directory: ${(error as Error).message}`);
    }
  }

  public async rename(oldPath: string, newPath: string): Promise<Node> {
    await this.autoConnect();
    try {
      const node = await this.#resolvePath(oldPath);
      const newParentPath = newPath.split('/').slice(0, -1).join('/') || '/';
      const newName = newPath.split('/').pop()!;
      const newParentNode = await this.#resolvePath(newParentPath);

      await this.#drive!.files.update({
        fileId: node.id,
        requestBody: {
          name: newName,
        },
        addParents: newParentNode.id,
        removeParents: node.parent ? node.parent.id : undefined,
        fields: 'id, name, parents',
      });

      node.name = newName;
      if (node.parent) {
        node.parent.removeChild(node.id);
      }

      newParentNode.addChild(node);
      return node;
    } catch (error) {
      throw new Error(`Failed to rename/move: ${(error as Error).message}`);
    }
  }

  public async stat(path: string): Promise<NodeStat> {
    await this.autoConnect();
    try {
      const node = await this.#resolvePath(path);
      return {
        isDirectory: node.isDirectory(),
        isFile: node.isFile(),
        size: node.getSize(),
        mtime: node.modifiedTime!,
        ctime: node.createdTime!,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${(error as Error).message}`);
    }
  }

  public async search(options: NodeSearchOptions, path: string = '/'): Promise<Node[]> {
    await this.autoConnect();
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

      const res = await this.#drive!.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
        orderBy: options.orderBy || 'modifiedTime desc',
        pageSize: options.limit || 100
      });

      return res.data.files!.map(file => new Node({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType as MimeType,
        size: parseInt(file.size!) || 0,
        modifiedTime: new Date(file.modifiedTime!),
        createdTime: new Date(file.createdTime!)
      }));
    } catch (error) {
      throw new Error(`Failed to search: ${(error as Error).message}`);
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<Node> {
    await this.autoConnect();
    try {
      const sourceNode = await this.#resolvePath(sourcePath);
      const destParentPath = destinationPath.split('/').slice(0, -1).join('/') || '/';
      const destParentNode = await this.#resolvePath(destParentPath);
      const newName = destinationPath.split('/').pop()!;

      const res = await this.#drive!.files.copy({
        fileId: sourceNode.id,
        requestBody: {
          name: newName,
          parents: [destParentNode.id],
        },
        fields: 'id, name, mimeType, size, modifiedTime, createdTime',
      });

      const newNode = new Node({
        id: res.data.id!,
        name: res.data.name!,
        mimeType: res.data.mimeType as MimeType,
        size: parseInt(res.data.size!) || 0,
        modifiedTime: new Date(res.data.modifiedTime!),
        createdTime: new Date(res.data.createdTime!)
      });

      destParentNode.addChild(newNode);
      return newNode;
    } catch (error) {
      throw new Error(`Failed to copy file: ${(error as Error).message}`);
    }
  }

  async #resolvePath(path: string): Promise<Node> {
    if (!this.#rootNode) {
      throw new Error('Root node not initialized. Please connect first.');
    }

    if (path === '/') {
      return this.#rootNode;
    }

    const parts = path.split('/').filter(Boolean);
    let currentNode = this.#rootNode;

    for (const part of parts) {
      if (!currentNode.isDirectory()) {
        throw new Error(`${currentNode.name} is not a directory`);
      }

      const childNode = currentNode.children?.find(child => child.name === part);
      if (!childNode) {
        
      const res = await this.#drive!.files.list({
          q: `'${currentNode.id}' in parents and name = '${part}' and trashed = false`,
          fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
        });

        if (!res.data.files?.length) {
          throw new Error(`Path not found: ${path}`);
        }

        const file = res.data.files[0];
        const newNode = new Node({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType as MimeType,
          size: parseInt(file.size ?? '0'),
          modifiedTime: new Date(file.modifiedTime!),
          createdTime: new Date(file.createdTime!)
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