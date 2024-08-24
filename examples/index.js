import {GDrive} from "fs-gdrive";

const gdrive = new GDrive({
  folderId: process.env.GD_FOLDER_ID, // folderId
  auth: {
    email: process.env.GD_EMAIL, // JWT email
    privateKey: process.env.GD_PRIVATE_KEY.replace(/\\n/g, '\n'), // JWT private key
  }
});

async function main() {
  try {
    await gdrive.connect();

    // Create a directory
    const newFolder = await gdrive.mkdir('/new_folder');
    console.log('New folder:', newFolder);

    // Write a file
    const newFile = await gdrive.writeFile('/new_folder/test.txt', 'Hello, World!');
    console.log('New file:', newFile);

    // Read a file
    const content = await gdrive.readFile('/new_folder/test.txt');
    console.log('test.txt file content:', content);

    // Get file stats
    const stats = await gdrive.stat('/new_folder/test.txt');
    console.log('test.txt file stats:', stats);

    // Rename/move a file
    const renamedFile = await gdrive.rename('/new_folder/test.txt', '/new_folder/renamed.txt');
    console.log('Renamed file:', renamedFile);

    // Copy a file
    const copiedFile = await gdrive.copy('/new_folder/renamed.txt', '/copied_file.txt');
    console.log('Copied file:', copiedFile);

    // List files and folders
    const contents = await gdrive.readdir('/');
    console.log('Contents:', contents);

    // Search for files
    const searchResults = await gdrive.search({
      name: 'copied_file'
    });
    console.log('Search results:', searchResults);

    // Delete a file/folder ✓
    await gdrive.unlink('/new_folder/renamed.txt');
    await gdrive.unlink('/copied_file.txt');
    await gdrive.unlink('/new_folder');
    console.log('deleted: renamed.txt, copied_file.txt, new_folder');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();