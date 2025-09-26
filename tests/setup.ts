import { vi } from 'vitest';

// Mock Dexie to prevent IndexedDB errors in the JSDOM test environment.
// This mock provides a more complete, non-functional version of Dexie that allows
// services using it to run without crashing during tests. It simulates the
// table structure expected by logService.
vi.mock('dexie', () => {
  const mockTable = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue('mock-id'), // `createRun` expects a return value
    delete: vi.fn().mockResolvedValue(undefined),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    each: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(1),
  };

  class MockDexie {
    public workflow_runs: typeof mockTable;
    public node_logs: typeof mockTable;

    constructor() {
      // Create separate mock objects for each table to avoid state pollution
      // between table interactions in tests.
      this.workflow_runs = { ...mockTable, where: vi.fn().mockReturnThis() };
      this.node_logs = { ...mockTable, where: vi.fn().mockReturnThis() };
    }

    version(versionNumber: number) {
      return this;
    }

    stores(schema: any) {
      // This is part of the Dexie setup chain, just return `this`.
      return this;
    }

    table(name: string) {
      if (name === 'workflow_runs') return this.workflow_runs;
      if (name === 'node_logs') return this.node_logs;
      // Return a generic mock if an unexpected table is requested.
      return { ...mockTable, where: vi.fn().mockReturnThis() };
    }

    open() {
      return Promise.resolve(this);
    }

    close() {}

    transaction(mode: string, tables: any, scope: () => any) {
      // Execute the transaction scope immediately.
      return Promise.resolve(scope());
    }
  }

  // Export the mock class as the default and named export to match Dexie's module structure.
  return {
    default: MockDexie,
    Dexie: MockDexie,
  };
});