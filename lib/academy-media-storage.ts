"use client";

const ACADEMY_MEDIA_DB_NAME = "ev-academy-media-db";
const ACADEMY_MEDIA_STORE = "academy-media";
const ACADEMY_MEDIA_REF_PREFIX = "academy-media://";

type AcademyMediaKind = "thumbnail" | "video";

type AcademyMediaRecord = {
  id: string;
  kind: AcademyMediaKind;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
};

function openAcademyMediaDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(ACADEMY_MEDIA_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(ACADEMY_MEDIA_STORE)) {
        db.createObjectStore(ACADEMY_MEDIA_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open Academy media storage."));
  });
}

function createAcademyMediaRef(kind: AcademyMediaKind) {
  return `${ACADEMY_MEDIA_REF_PREFIX}${kind}-${Math.random()
    .toString(36)
    .slice(2, 10)}-${Date.now().toString(36)}`;
}

export function isAcademyMediaRef(value: unknown) {
  return typeof value === "string" && value.startsWith(ACADEMY_MEDIA_REF_PREFIX);
}

export async function saveAcademyMediaData(
  kind: AcademyMediaKind,
  dataUrl: string,
  mimeType: string
) {
  const db = await openAcademyMediaDb();
  const id = createAcademyMediaRef(kind);

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ACADEMY_MEDIA_STORE, "readwrite");
    const store = transaction.objectStore(ACADEMY_MEDIA_STORE);
    const record: AcademyMediaRecord = {
      id,
      kind,
      mimeType,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Unable to save Academy media."));
    store.put(record);
  });

  return id;
}

export async function readAcademyMediaData(mediaRef: string) {
  if (!isAcademyMediaRef(mediaRef)) {
    return null;
  }

  const db = await openAcademyMediaDb();

  return new Promise<AcademyMediaRecord | null>((resolve, reject) => {
    const transaction = db.transaction(ACADEMY_MEDIA_STORE, "readonly");
    const store = transaction.objectStore(ACADEMY_MEDIA_STORE);
    const request = store.get(mediaRef);

    request.onsuccess = () => resolve((request.result as AcademyMediaRecord) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to read Academy media."));
  });
}

export async function deleteAcademyMediaData(mediaRef: string) {
  if (!isAcademyMediaRef(mediaRef)) {
    return;
  }

  const db = await openAcademyMediaDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ACADEMY_MEDIA_STORE, "readwrite");
    const store = transaction.objectStore(ACADEMY_MEDIA_STORE);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Unable to delete Academy media."));

    store.delete(mediaRef);
  });
}
