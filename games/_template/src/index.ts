import {
  renderParticles,
  setConfig,
  updateParticles
} from "../../../packages/game-core/src"
import config from "./config.json"
import { GameLogic } from "./GameLogic"

const root = document.querySelector<HTMLDivElement>("#game-root")
if (!root) {
  throw new Error("Missing #game-root")
}
const gameRoot = root

setConfig(config)

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")
if (!ctx) {
  throw new Error("Canvas 2D context not available")
}
const context = ctx

gameRoot.appendChild(canvas)

function resize() {
  canvas.width = gameRoot.clientWidth || 800
  canvas.height = gameRoot.clientHeight || 600
}

resize()
window.addEventListener("resize", resize)

GameLogic.init(context)
canvas.addEventListener("click", () => {
  GameLogic.onClick()
})

let lastTime = performance.now()

function frame(now: number) {
  const dt = Math.min((now - lastTime) / 16.67, 2)
  lastTime = now

  context.clearRect(0, 0, canvas.width, canvas.height)

  GameLogic.update(dt)
  updateParticles(dt / 60)

  GameLogic.render(context)
  renderParticles(context)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
