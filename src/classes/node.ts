import { NodeOptions } from '../typings/interface';
import { DriveMimeTypes } from '../typings/enum';

export class Node {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: Date | null;
  createdTime: Date | null;
  children?: Node[];
  parent?: Node;

  constructor({ 
    id, 
    name, 
    mimeType, 
    size = 0, 
    modifiedTime = null, 
    createdTime = null 
  }: NodeOptions) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.size = size;
    this.modifiedTime = modifiedTime;
    this.createdTime = createdTime;
  }

  isDirectory(): boolean {
    return this.mimeType === DriveMimeTypes.Folder;
  }

  isFile(): boolean {
    return !this.isDirectory();
  }
  
  getSize(): number {
    if (this.isFile()) {
      return this.size;
    }
    return (this.children || []).reduce((total, child) => total + child.getSize(), 0);
  }

  getLastModified(): Date | null {
    if (this.isFile()) {
      return this.modifiedTime;
    }
    const childDates = (this.children || [])
      .map(child => child.getLastModified())
      .filter((date): date is Date => date !== null);
    return childDates.length ? new Date(Math.max(...childDates.map(d => d.getTime()))) : null;
  }

  addChild(child: Node): void {
    if (!this.isDirectory()) return;
    if (!this.children) this.children = [];
    this.children.push(child);
    child.parent = this;
  }

  removeChild(childId: string): boolean {
    if (!this.children) return false;
    const index = this.children.findIndex(child => child.id === childId);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  getPath(): string {
    let path = this.name;
    let currentNode: Node | undefined = this.parent;
    while (currentNode) {
      path = `${currentNode.name}/${path}`;
      currentNode = currentNode.parent;
    }
    return `/${path}`;
  }
}