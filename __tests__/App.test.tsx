/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mocks for native modules
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: { pdf: 'application/pdf' },
  isCancel: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  scanFile: jest.fn(() => Promise.resolve()),
  CachesDirectoryPath: '/tmp/cache',
  DownloadDirectoryPath: '/tmp/downloads',
  DocumentDirectoryPath: '/tmp/documents',
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: (props: any) => <View {...props} />,
    default: (props: any) => <View {...props} />,
  };
});

jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
