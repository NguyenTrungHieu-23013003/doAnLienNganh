import { supabase } from './supabase';

export async function readDb<T>(collection: string): Promise<T[]> {
  const { data, error } = await supabase.from(collection).select('*');
  if (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
  return (data || []) as T[];
}

export async function writeDb<T>(collection: string, data: T[]): Promise<void> {
  const { error } = await supabase.from(collection).upsert(data as never[]);
  if (error) {
    console.error(`Error writing ${collection}:`, error);
  }
}

export async function getItem<T extends { id: string }>(collection: string, id: string): Promise<T | undefined> {
  const { data, error } = await supabase.from(collection).select('*').eq('id', id).single();
  if (error) return undefined;
  return data as T;
}

export async function addItem<T extends { id: string }>(collection: string, item: T): Promise<void> {
  const { error } = await supabase.from(collection).insert(item as never);
  if (error) {
    console.error(`Error adding item to ${collection}:`, error);
  }
}

export async function updateItem<T extends { id: string }>(
  collection: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const { error } = await supabase.from(collection).update(updates as never).eq('id', id);
  if (error) {
    console.error(`Error updating item in ${collection}:`, error);
  }
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  const { error } = await supabase.from(collection).delete().eq('id', id);
  if (error) {
    console.error(`Error deleting item in ${collection}:`, error);
  }
}
