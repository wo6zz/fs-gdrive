import { MimeType } from './type';

export interface NodeOptions {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: Date | null;
  createdTime?: Date | null;
}

export interface GDriveOptions {
  root: string;
  auth: {
    email: string;
    privateKey: string;
  };
}

export interface NodeStat {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: Date;
  ctime: Date;
}

export interface NodeSearchOptions {
  name?: string;
  mimeType?: MimeType;
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  orderBy?: string;
  limit?: number;
}