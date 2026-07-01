declare module 'y-indexeddb' {
  import * as Y from 'yjs'

  export class IndexeddbPersistence {
    constructor(name: string, doc: Y.Doc)
    on(event: 'synced', handler: (isSynced: boolean) => void): void
    on(event: string, handler: Function): void
    destroy(): void
    clearData(): Promise<void>
  }
}
