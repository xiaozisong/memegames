import { createGame } from "@game/core";
import { ShooterGame } from "./Game";

const game = createGame("#app", ShooterGame);
void game.start();
