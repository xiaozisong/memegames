import { BlockBlastEngine, BlockBlastSnapshot } from "../blockBlastEngine";

export type RendererContext = {
  root: HTMLElement;
  engine: BlockBlastEngine;
};

export type RendererHandle = {
  render: (snapshot: BlockBlastSnapshot) => void;
  destroy?: () => void;
};

export type RendererPlugin = {
  id: string;
  mount: (context: RendererContext) => Promise<RendererHandle> | RendererHandle;
};
