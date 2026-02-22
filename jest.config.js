/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/webview/**',
  ],

  // 模块路径映射
  moduleNameMapper: {
    '^vscode$': '<rootDir>/__mocks__/vscode.ts',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@webview/(.*)$': '<rootDir>/webview/src/$1',
  },

  // 只测试 __tests__ 目录下的文件（跳过 setup 文件）
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/jest.setup.ts',
  ],

  // 全局 setup 文件
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'],

  // 超时时间（集成测试可能需要更长时间）
  testTimeout: 30000,
};
