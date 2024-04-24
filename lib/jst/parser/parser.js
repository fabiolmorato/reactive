import { tokenTypes } from "../scanner/token.js";
import { Enum } from "../../utils/enum.js";
import { htmlDecode } from "../../utils/html-decode.js";
import { commands } from "../commands/command.js";

export const nodeTypes = Enum.object(
  "ROOT",
  "TEXT",
  "STATEMENT",
  "BLOCK",
  "CHAIN_BLOCK"
);

export class Parser {
  constructor (tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse () {
    const root = {
      type: nodeTypes.ROOT,
      children: []
    };

    while (!this.end()) {
      root.children.push(this.getNextNode());
    }

    return this.clearAst(root);
  }

  end () {
    return this.position >= this.tokens.length;
  }

  peek () {
    if (this.end()) return null;
    return this.tokens[this.position];
  }

  advance () {
    if (this.end()) return null;
    return this.tokens[this.position++];
  }

  match (...types) {
    const type = this.peek()?.type;
    return types.indexOf(type) !== -1;
  }

  matchBlock (blockName) {
    return this.match(tokenTypes.BLOCK_END) && this.peek().metadata.name === blockName;
  }

  matchChainBlock (blockName) {
    const command = commands.find((command) => command.name === blockName);
    return this.match(tokenTypes.BLOCK_START) && command.chainCommands.indexOf(this.peek().metadata.name) !== -1;
  }

  expect (...types) {
    if (!this.match(...types)) throw new Error(`Expected ${types.join(" or ")} but got ${this.peek()?.type}`);
  }

  textNode () {
    const token = this.advance();
    return {
      type: nodeTypes.TEXT,
      text: token.lexeme
    };
  }

  statementNode () {
    const token = this.advance();
    return {
      type: nodeTypes.STATEMENT,
      code: htmlDecode(token.lexeme)
    };
  }

  getChainBlock (blockName) {
    const children = [];

    while (!this.matchBlock(blockName) && !this.end()) {
      children.push(this.getNextNode());
    }

    return {
      type: nodeTypes.CHAIN_BLOCK,
      code: blockName,
      children
    };
  }

  getBlockChildrenAndChainBlocks (blockName) {
    const children = [];
    const chainBlocks = [];

    while (!this.matchBlock(blockName) && !this.matchChainBlock(blockName) && !this.end()) {
      children.push(this.getNextNode());
    }

    while (this.matchChainBlock(blockName)) {
      chainBlocks.push(this.getChainBlock(blockName));
    }

    return {
      children,
      chainBlocks
    };
  }

  blockNode () {
    const token = this.advance();

    const command = commands.find((command) => command.name === token.metadata.name || command.chainCommands.includes(token.metadata.name));
    if (!command) {
      throw new Error(`Unknown command ${token.metadata.name}`);
    }

    const { children, chainBlocks } = this.getBlockChildrenAndChainBlocks(command.name);

    this.expect(tokenTypes.BLOCK_END);
    if (command.name === token.metadata.name) {
      this.advance();
    }

    return {
      type: nodeTypes.BLOCK,
      name: token.metadata.name,
      commandArgs: htmlDecode(token.lexeme),
      children,
      chainBlocks
    };
  }

  getNextNode () {
    if (this.match(tokenTypes.TEXT)) {
      return this.textNode();
    } else if (this.match(tokenTypes.STATEMENT)) {
      return this.statementNode();
    } else if (this.match(tokenTypes.BLOCK_START)) {
      return this.blockNode();
    } else if (this.match(tokenTypes.EOF)) {
      return null;
    } else {
      throw new Error(`Unexpected token ${this.peek()?.type}`);
    }
  }

  flattenChainBlocks (root) {
    const chainBlocks = [];

    for (const rawChainBlock of root.chainBlocks) {
      const [chainBlock] = rawChainBlock.children;

      chainBlocks.push({
        type: chainBlock.type,
        name: chainBlock.name,
        commandArgs: htmlDecode(chainBlock.commandArgs),
        children: chainBlock.children.map((child) => this.clearAst(child)),
      });

      chainBlocks.push(...this.flattenChainBlocks(chainBlock));
    }

    return chainBlocks;
  }

  clearAst (root) {
    if ([nodeTypes.TEXT, nodeTypes.STATEMENT].includes(root.type)) {
      return root;
    }

    const newRoot = {
      type: root.type,
      children: root.children.map((child) => this.clearAst(child)),
      ...(root.type === nodeTypes.BLOCK && {
        name: root.name,
        commandArgs: root.commandArgs,
        chainBlocks: this.flattenChainBlocks(root)
      })
    };

    return newRoot;
  }
}
