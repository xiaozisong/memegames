import { getConfig, spawnParticles } from "../../../packages/game-core/src"

export const GameLogic = {
  state: {
    phase: "start", // start | play | end
    player: { x: 0, y: 0, vx: 0, vy: 0 },
    score: 0
  },

  init(ctx) {
    this.ctx = ctx
    this.state.player = {
      x: Number(getConfig("gameplay.params.startX") ?? 100),
      y: Number(getConfig("gameplay.params.startY") ?? 200),
      vx: 0,
      vy: 0
    }
  },

  onClick() {
    if (this.state.phase === "start") {
      this.state.phase = "play"
      return
    }

    if (this.state.phase === "play") {
      this.state.player.vy = Number(getConfig("gameplay.params.jumpForce") ?? -10)

      // 🔥 粒子反馈（关键）
      spawnParticles(this.state.player.x, this.state.player.y)
    }

    if (this.state.phase === "end") {
      this.reset()
    }
  },

  update(dt) {
    if (this.state.phase !== "play") return

    const gravity = Number(getConfig("gameplay.params.gravity") ?? 0.5)
    const speed = Number(getConfig("gameplay.params.playerSpeed") ?? 6)
    const groundY = Number(getConfig("gameplay.params.groundY") ?? 400)

    const p = this.state.player

    // physics
    p.vy += gravity
    p.y += p.vy
    p.x += speed * 0.1

    // ground
    if (p.y > groundY) {
      p.y = groundY
      p.vy = 0
      this.state.phase = "end"
    }

    this.state.score += 1
  },

  render(ctx) {
    const { player, phase, score } = this.state
    const playerRadius = Number(getConfig("gameplay.params.playerRadius") ?? 20)
    const playerColor = String(getConfig("theme.colors.primary") ?? "#6366f1")

    // player
    ctx.fillStyle = playerColor
    ctx.beginPath()
    ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2)
    ctx.fill()

    // UI（模板级）
    this.renderUI(ctx, phase, score)
  },

  renderUI(ctx, phase, score) {
    const textColor = String(getConfig("theme.colors.text") ?? "#fff")
    const overlayColor = String(getConfig("theme.colors.panel") ?? "rgba(0,0,0,0.4)")
    const uiWidth = Number(getConfig("gameplay.params.uiWidth") ?? 800)
    const uiHeight = Number(getConfig("gameplay.params.uiHeight") ?? 600)
    const centerX = Number(getConfig("gameplay.params.centerX") ?? 400)
    const centerY = Number(getConfig("gameplay.params.centerY") ?? 300)

    // score
    ctx.fillStyle = textColor
    ctx.font = "bold 24px sans-serif"
    ctx.fillText(`Score: ${score}`, 20, 40)

    // overlay
    if (phase !== "play") {
      ctx.fillStyle = overlayColor
      ctx.fillRect(0, 0, uiWidth, uiHeight)

      ctx.fillStyle = textColor
      ctx.font = "bold 40px sans-serif"
      ctx.textAlign = "center"

      const text =
        phase === "start" ? "Tap to Start" : "Game Over\nTap to Restart"

      ctx.fillText(text, centerX, centerY)
    }
  },

  reset() {
    this.state.phase = "start"
    this.state.player = {
      x: Number(getConfig("gameplay.params.startX") ?? 100),
      y: Number(getConfig("gameplay.params.startY") ?? 200),
      vx: 0,
      vy: 0
    }
    this.state.score = 0
  }
}