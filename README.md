# GDriveFS

GDriveFS is a Node.js package that provides a file system-like interface for interacting with Google Drive. It simplifies operations such as reading, writing, and managing files and directories in Google Drive, making it easier to integrate Google Drive functionality into your Node.js applications.

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
npm install gdrivefs
```

## Usage

First, import the GDriveFS class:

```javascript
import GDriveFS from 'gdrivefs';
```

Then, create an instance of GDriveFS with your Google Drive authentication details:

```javascript
const gdriveFS = new GDriveFS({
  folderId: 'your-root-folder-id',
  auth: {
    email: 'your-service-account-email@example.com',
    privateKey: 'your-private-key',
  },
});
```

Connect to Google Drive:

```javascript
await gdriveFS.connect();
```

Now you can use various methods to interact with Google Drive:

```javascript
// Read directory contents
const files = await gdriveFS.readdir('/path/to/directory');

// Create a directory
await gdriveFS.mkdir('/path/to/new/directory');

// Write a file
await gdriveFS.writeFile('/path/to/file.txt', 'File content');

// Read a file
const content = await gdriveFS.readFile('/path/to/file.txt');

// Delete a file or directory
await gdriveFS.unlink('/path/to/file-or-directory');

// Rename or move a file or directory
await gdriveFS.rename('/old/path', '/new/path');

// Get file or directory stats
const stats = await gdriveFS.stat('/path/to/file-or-directory');

// Search for files
const searchResults = await gdriveFS.search({
  name: 'example',
  mimeType: 'text/plain',
  minSize: 1000,
  maxSize: 10000,
  modifiedAfter: new Date('2023-01-01'),
  modifiedBefore: new Date('2023-12-31'),
});

// Copy a file
await gdriveFS.copy('/path/to/source/file.txt', '/path/to/destination/file.txt');
```

## API Reference

### `constructor(options)`

Creates a new GDriveFS instance.

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

All methods in GDriveFS throw errors when operations fail. It's recommended to use try-catch blocks or .catch() methods when using these functions to handle potential errors.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

Would you like me to explain or elaborate on any part of this README?