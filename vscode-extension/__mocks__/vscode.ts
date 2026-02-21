// VS Code API mock
export const workspace = {
  workspaceFolders: [
    { uri: { fsPath: process.cwd() } }
  ],
};

export const window = {
  createWebviewPanel: jest.fn(),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
};

export const ExtensionContext = jest.fn();

export const Uri = {
  file: (path: string) => ({ fsPath: path }),
  joinPath: (...parts: string[]) => ({
    fsPath: parts.filter(Boolean).join('/')
  }),
};

export const env = {
  openExternal: jest.fn(),
  clipboard: {
    writeText: jest.fn(),
  },
};

export const commands = {
  executeCommand: jest.fn(),
};

export const ThemeIcon = jest.fn();

// TreeItem 相关常量
export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export class TreeItem {
  label: string;
  collapsibleState?: number;
  contextValue?: string;
  iconPath?: any;
  tooltip?: string;

  constructor(label: string, collapsibleState?: number) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}
