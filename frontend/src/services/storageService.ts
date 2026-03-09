import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'knot-offline'
const STORE = 'pending-reports'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId', autoIncrement: true })
      }
    },
  })
}

export interface PendingReport {
  localId?: number
  savedAt: string
  report_type: string
  disaster_type: string
  severity: string
  title: string
  description: string
  lat: number
  lng: number
  address_text?: string
  contact_email: string
  contact_phone?: string
}

export async function saveOfflineReport(report: Omit<PendingReport, 'localId' | 'savedAt'>): Promise<void> {
  const db = await getDB()
  await db.add(STORE, { ...report, savedAt: new Date().toISOString() })
}

export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function deletePendingReport(localId: number): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, localId)
}

export async function syncOfflineReports(submitFn: (r: PendingReport) => Promise<void>): Promise<number> {
  const pending = await getPendingReports()
  let synced = 0
  for (const report of pending) {
    try {
      await submitFn(report)
      await deletePendingReport(report.localId!)
      synced++
    } catch {
      // Keep in queue, retry on next online event
    }
  }
  return synced
}
