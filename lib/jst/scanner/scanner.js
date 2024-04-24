import { Enum } from "../../utils/enum.js";
import { Token, tokenTypes } from "./token.js";

const scannerContexts = Enum.object(
  "TEXT",
  "STRING"
);

export class Scanner {
  constructor (template) {
    this.code = template;
    this.position = 0;
    this.scannerContext = scannerContexts.TEXT;
    this.stringCharacter = "";
  }

  mergeNeighboringTextTokens (tokens) {
    const mergedTokens = [];
    let currentToken = tokens[0];

    for (let i = 1; i < tokens.length; i++) {
      const nextToken = tokens[i];

      if (currentToken.type === tokenTypes.TEXT && nextToken.type === tokenTypes.TEXT) {
        currentToken.lexeme += nextToken.lexeme;
      } else {
        mergedTokens.push(currentToken);
        currentToken = nextToken;
      }
    }

    if (currentToken) {
      mergedTokens.push(currentToken);
    }
    
    return mergedTokens;
  }

  lex () {
    const tokens = [];
    let token = this.getNextToken();

    while (token.type !== tokenTypes.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }

    return this.mergeNeighboringTextTokens(tokens);
  }

  end () {
    return this.code.length === this.position;
  }

  previous (displacement = 1) {
    return this.code[this.position - displacement];
  }

  peek () {
    if (this.code.length === this.position) return null;
    return this.code[this.position];
  }

  peekNext () {
    if (this.code.length === this.position - 1) return null;
    return this.code[this.position + 1];
  }

  advance () {
    return this.code[this.position++];
  }

  skipWhitespace () {
    for (;;) {
      const c = this.peek();

      switch (c) {
        case '\n': 
          this.advance();
          break;
        
        case ' ':
        case '\t':
        case '\r':
          this.advance();
          break;
        
        default:
          return;
      }
    }
  }

  textToken () {
    let lexeme = "";
    let c = this.advance();

    while (c !== "{" && this.peek() !== "{" && !this.end()) {
      lexeme += c;
      c = this.advance();
    }

    // if (this.end()) {
      lexeme += c;
    // }

    return new Token(tokenTypes.TEXT, lexeme);
  }

  statementToken () {
    this.skipWhitespace();
    let lexeme = "";
    let c = this.advance();

    while (
      (
        (!(c === "}" && this.peek() === "}")) ||
        (this.scannerContext === scannerContexts.STRING)
     ) && !this.end()) {
      if (c === '"' || c === "'" || c === "`") {
        if (this.scannerContext === scannerContexts.TEXT) {
          this.stringCharacter = c;
          this.scannerContext = scannerContexts.STRING;
        } else if (this.stringCharacter === c && this.previous(2) !== "\\") {
          this.scannerContext = scannerContexts.TEXT;
        }
      }

      lexeme += c;
      c = this.advance();
    }

    if (this.end()) {
      lexeme += c;

      if (c !== "}" || this.previous(2) !== "}") {
        throw new Error("Expected end of statement but no closing brackets }} found.");
      }
    } else {
      this.advance();
    }

    const finalLexeme = lexeme.trim();
    if (finalLexeme === "") {
      throw new Error("Expected statement to not be empty");
    }

    return new Token(tokenTypes.STATEMENT, lexeme.trim());
  }

  blockStartToken () {
    this.skipWhitespace();
    let lexeme = "";
    this.advance();
    let c = this.advance();

    while (
      (
        (!(c === "}" && this.peek() === "}")) ||
        (this.scannerContext === scannerContexts.STRING)
     ) && !this.end()) {
      if (c === '"' || c === "'" || c === "`") {
        if (this.scannerContext === scannerContexts.TEXT) {
          this.stringCharacter = c;
          this.scannerContext = scannerContexts.STRING;
        } else if (this.previous(2) !== "\\" && this.stringCharacter === c) {
          this.scannerContext = scannerContexts.TEXT;
        }
      }

      lexeme += c;
      c = this.advance();
    }

    if (this.end()) {
      throw new Error("Unterminated block");
    } else {
      this.advance();
    }

    const name = lexeme.trim().split(" ")[0];
    const remainder = lexeme.split(name)[1].trim();

    return new Token(tokenTypes.BLOCK_START, remainder, { name });
  }

  blockEndToken () {
    this.skipWhitespace();
    let lexeme = "";
    this.advance();
    let c = this.advance();

    while (!(c === "}" && this.peek() === "}") && !this.end()) {
      lexeme += c;
      c = this.advance();
    }

    if (this.end()) {
      throw new Error("Unterminated block");
    } else {
      this.advance();
    }

    const name = lexeme.trim().split(" ")[0];
    const remainder = lexeme.split(name)[1].trim();

    return new Token(tokenTypes.BLOCK_END, remainder, { name });
  }

  getNextToken () {
    // this.skipWhitespace();

    if (this.end()) {
      return new Token(tokenTypes.EOF, "");
    }

    if (this.peek() === "{" && this.peekNext() === "{") {
      this.advance();
      this.advance();

      if (this.peek() === "#") {
        return this.blockStartToken();
      } else if (this.peek() === "/") {
        return this.blockEndToken();
      } else {
        return this.statementToken();
      }
    } else {
      return this.textToken();
    }
  }
}
