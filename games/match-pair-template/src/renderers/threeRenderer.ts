import { domRendererPlugin } from "./domRenderer";
import { RendererPlugin } from "./types";

// This preset keeps gameplay identical while presenting a pseudo-3D card style.
export const threeRendererPlugin: RendererPlugin = {
  id: "three",
  mount: async (context) => {
    const handle = await domRendererPlugin.mount(context);
    context.root.style.perspective = "1000px";
    context.root.style.transformStyle = "preserve-3d";
    return {
      render: (snapshot) => {
        handle.render(snapshot);
        const shell = context.root.querySelector(".game-shell") as HTMLElement | null;
        if (shell) {
          shell.style.transform = "rotateX(2deg)";
          shell.style.boxShadow = "0 26px 58px rgba(0,0,0,0.32)";
        }
      },
      destroy: handle.destroy
    };
  }
};
