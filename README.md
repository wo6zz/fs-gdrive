<div align="center">
  <h1>Fs GDrive</h1>
</div>

[![npm version](https://img.shields.io/npm/v/fs-gdrive)](https://www.npmjs.com/package/fs-gdrive)
[![npm downloads](https://img.shields.io/npm/dm/fs-gdrive)](https://www.npmjs.com/package/fs-gdrive)
[![GitHub stars](https://img.shields.io/github/stars/wo6zz/fs-gdrive?style=social)](https://github.com/wo6zz/fs-gdrive/stargazers)
[![License](https://img.shields.io/github/license/wo6zz/fs-gdrive)](https://github.com/wo6zz/fs-gdrive/blob/main/LICENSE)

---

fs-gdrive, is a Node.js package that provides a file system-like interface for interacting with Google Drive. It simplifies operations such as reading, writing, and managing files and directories in Google Drive, making it easier to integrate Google Drive functionality into your Node.js applications.

## Features

- Connect to Google Drive using service account authentication
- Read directory contents
- Create directories
- Read and write files
- Delete files and directories
- Rename or move files and directories
- Get file/directory stats
- Search for files and directories based on various criteria
- Copy files

## Installation

```bash
npm install fs-gdrive
```

## Usage

First, import the `GDrive` class:

```javascript
import { GDrive } from 'fs-gdrive'; // esm
// OR
const { GDrive } = require('fs-gdrive'); // cjs
```

Then, create an instance of GDriveFS with your Google Drive authentication details:

```javascript
const fsGDrive = new GDrive({
  folderId: 'your-root-folder-id',
  auth: {
    email: 'your-service-account-email@example.com',
    privateKey: 'your-private-key',
  },
});
```

Connect to Google Drive:

```javascript
await fsGDrive.connect();
```

Now you can use various methods to interact with Google Drive:

```javascript
// Read directory contents
const files = await fsGDrive.readdir('/path/to/directory');

// Create a directory
await fsGDrive.mkdir('/path/to/new/directory');

// Write a file
await fsGDrive.writeFile('/path/to/file.txt', 'File content');

// Read a file
const content = await fsGDrive.readFile('/path/to/file.txt');

// Delete a file or directory
await fsGDrive.unlink('/path/to/file-or-directory');

// Rename or move a file or directory
await fsGDrive.rename('/old/path', '/new/path');

// Get file or directory stats
const stats = await fsGDrive.stat('/path/to/file-or-directory');

// Search for files
const searchResults = await fsGDrive.search({
  name: 'example',
  mimeType: 'text/plain',
  minSize: 1000,
  maxSize: 10000,
  modifiedAfter: new Date('2023-01-01'),
  modifiedBefore: new Date('2023-12-31'),
});

// Copy a file
await fsGDrive.copy('/path/to/source/file.txt', '/path/to/destination/file.txt');
```

## API Reference

### `constructor(options)`

Creates a new GDrive instance.

- `options.folderId`: The root folder ID in Google Drive.
- `options.auth.email`: Service account email.
- `options.auth.privateKey`: Private key for authentication.

### `connect()`

Connects to Google Drive using the provided authentication details.

### `readdir(path = '/')`

Reads the contents of a directory.

### `mkdir(path)`

Creates a new directory.

### `writeFile(path, content)`

Writes content to a file.

### `readFile(path)`

Reads the content of a file.

### `unlink(path)`

Deletes a file or directory.

### `rename(oldPath, newPath)`

Renames or moves a file or directory.

### `stat(path)`

Retrieves the stats of a file or directory.

### `search(options, path = '/')`

Searches for files and directories based on specific criteria.

### `copy(sourcePath, destinationPath)`

Copies a file from one location to another.

## Error Handling

All methods in GDrive throw errors when operations fail. It's recommended to use try-catch blocks or .catch() methods when using these functions to handle potential errors.

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/wo6zz/gdrive-fs/pulls).

## License

This project is licensed under the [MIT](./LICENSE) License.
