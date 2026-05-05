import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'node',
        paths: { '@/*': ['./src/*'] },
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // nanoid ships as pure ESM — swap in a deterministic CJS mock
    '^nanoid$': '<rootDir>/src/__tests__/__mocks__/nanoid.ts',
    // Stub CSS imports
    '\\.(css|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.ts',
  },
  // Allow ts-jest to transform ESM packages that otherwise break Jest's CJS runtime
  transformIgnorePatterns: [
    '/node_modules/(?!(nanoid|@supabase)/)',
  ],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.(ts|tsx)'],
  collectCoverageFrom: [
    'src/store/slices/**/*.ts',
    'src/lib/localStorage.ts',
    'src/lib/supabase/formSync.ts',
    'src/components/migration/LocalStorageMigrationModal.tsx',
    'src/components/providers/AuthProvider.tsx',
    'src/components/auth/UserMenu.tsx',
  ],
  coverageThreshold: {
    global: {},
    './src/store/slices/formSlice.ts': { lines: 75, functions: 55, branches: 60 },
    './src/store/slices/authSlice.ts': { lines: 80, functions: 75, branches: 50 },
    './src/store/slices/brandSlice.ts': { lines: 90, functions: 90, branches: 80 },
    './src/store/slices/uiSlice.ts': { lines: 90, functions: 90, branches: 80 },
    './src/lib/localStorage.ts': { lines: 75, functions: 80, branches: 70 },
    './src/lib/supabase/formSync.ts': { lines: 95, functions: 95, branches: 85 },
    './src/components/migration/LocalStorageMigrationModal.tsx': { lines: 90, functions: 90, branches: 85 },
    './src/components/auth/UserMenu.tsx': { lines: 90, functions: 90, branches: 60 },
  },
};

export default config;
