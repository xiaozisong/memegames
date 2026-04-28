import { getSetting } from "../config.js";
import { MbtiKernel } from "../kernels/mbtiKernel.js";

export function createKernel() {
  const mode = getSetting("gameplay.mode", "mbti-quiz");
  if (mode === "mbti-quiz") return new MbtiKernel();
  return new MbtiKernel();
}
