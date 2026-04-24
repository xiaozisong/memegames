import { createGame } from "@game/core";
import { StackGame } from "./Game";

const game = createGame("#app", StackGame);
void game.start();
