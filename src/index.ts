import { version } from '../package.json';

export const VERSION = version;

export * from './typings/enum';
export * from './typings/interface';

export { GDrive } from './classes/gdrive';
export { Node } from './classes/node';