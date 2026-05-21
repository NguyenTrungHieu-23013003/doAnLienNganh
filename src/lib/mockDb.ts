import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/mockDb');

export async function readDb<T>(collection: string): Promise<T[]> {
  try {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
}

export async function writeDb<T>(collection: string, data: T[]): Promise<void> {
  try {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
  }
}

export async function getItem<T extends { id: string }>(collection: string, id: string): Promise<T | undefined> {
  const items = await readDb<T>(collection);
  return items.find((item) => item.id === id);
}

export async function addItem<T extends { id: string }>(collection: string, item: T): Promise<void> {
  const items = await readDb<T>(collection);
  items.push(item);
  await writeDb(collection, items);
}

export async function updateItem<T extends { id: string }>(
  collection: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const items = await readDb<T>(collection);
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    await writeDb(collection, items);
  }
}

export async function deleteItem<T extends { id: string }>(collection: string, id: string): Promise<void> {
  const items = await readDb<T>(collection);
  const filtered = items.filter((item) => item.id !== id);
  await writeDb(collection, filtered);
}
