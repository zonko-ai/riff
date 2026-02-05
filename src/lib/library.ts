export type LibraryTrack = {
  id: string;
  title: string;
  caption: string;
  lyrics: string;
  duration: number;
  createdAt: number;
  audio: Blob;
};

const DB_NAME = "riff_library";
const STORE_NAME = "tracks";
const DB_VERSION = 1;

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track: LibraryTrack): Promise<void> {
  const db = await openLibrary();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllTracks(): Promise<LibraryTrack[]> {
  const db = await openLibrary();
  const tracks = await new Promise<LibraryTrack[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as LibraryTrack[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return tracks.sort((a, b) => b.createdAt - a.createdAt);
}

export function makeTitle(caption: string) {
  const trimmed = caption.trim();
  if (!trimmed) return "Untitled";
  const firstSentence = trimmed.split(/[\n.!?]/)[0];
  return firstSentence.length > 60 ? `${firstSentence.slice(0, 57)}...` : firstSentence;
}
