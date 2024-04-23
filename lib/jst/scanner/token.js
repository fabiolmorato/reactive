import { Enum } from "../../utils/enum.js";

export const tokenTypes = Enum.object(
  "TEXT",
  "STATEMENT",
  "BLOCK_START",
  "BLOCK_END",
  "EOF"
);

export class Token {
  constructor (type, lexeme, metadata = {}) {
    this.type = type;
    this.lexeme = lexeme;
    this.metadata = metadata;
  }
}
