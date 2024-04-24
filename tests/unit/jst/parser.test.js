import { Parser, nodeTypes } from "../../../lib/jst/parser/parser.js";
import { Token, tokenTypes } from "../../../lib/jst/scanner/token.js";
import { command } from "../../../lib/jst/commands/command.js";

describe("JST Parser", () => {
  it("should parse an empty template", () => {
    const tokens = [];
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe(nodeTypes.ROOT);
    expect(ast.children.length).toBe(0);
  });

  it("should parse a template containing only text", () => {
    const tokens = [
      textToken("some text\nwith\twhitespaces   ")
    ];
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].text).toBe("some text\nwith\twhitespaces   ");
  });

  it("should parse a template containing a statement", () => {
    const tokens = [
      statementToken("some statement")
    ];
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.STATEMENT);
    expect(ast.children[0].code).toBe("some statement");
  });

  it("should parse a template containing a block", () => {
    const tokens = [
      blockStartToken("if", "some block"),
      textToken("some text"),
      blockEndToken("if")
    ];

    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.BLOCK);
    expect(ast.children[0].name).toBe("if");
    expect(ast.children[0].children.length).toBe(1);
    expect(ast.children[0].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].children[0].text).toBe("some text");
  });

  it("should not parse a template with unregistered commands in a block", () => {
    const tokens = [
      blockStartToken("unregistered", "some block"),
      textToken("some text"),
      blockEndToken("unregistered")
    ];

    const parser = new Parser(tokens);
    expect(() => parser.parse()).toThrow("Unknown command unregistered");
  });

  it("should merge chaining blocks into one block", () => {
    const tokens = [
      blockStartToken("if", "some condition"),
      textToken("some text"),
      blockStartToken("elif", "some other condition"),
      textToken("some other text"),
      blockStartToken("else"),
      textToken("some other text"),
      blockEndToken("if"),
    ];

    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.BLOCK);
    expect(ast.children[0].name).toBe("if");
    expect(ast.children[0].children.length).toBe(1);
    expect(ast.children[0].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].children[0].text).toBe("some text");
    expect(ast.children[0].chainBlocks.length).toBe(2);
    expect(ast.children[0].chainBlocks[0].name).toBe("elif");
    expect(ast.children[0].chainBlocks[0].children.length).toBe(1);
    expect(ast.children[0].chainBlocks[0].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].chainBlocks[0].children[0].text).toBe("some other text");
    expect(ast.children[0].chainBlocks[1].name).toBe("else");
    expect(ast.children[0].chainBlocks[1].children.length).toBe(1);
    expect(ast.children[0].chainBlocks[1].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].chainBlocks[1].children[0].text).toBe("some other text");
  });

  it("should parse blocks within blocks", () => {
    const tokens = [
      blockStartToken("if", "some condition"),
      textToken("some text"),
      blockStartToken("if", "some inner condition"),
      textToken("some inner text"),
      blockEndToken("if"),
      blockEndToken("if"),
    ];

    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.BLOCK);
    expect(ast.children[0].name).toBe("if");
    expect(ast.children[0].children.length).toBe(2);
    expect(ast.children[0].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].children[0].text).toBe("some text");
    expect(ast.children[0].children[1].type).toBe(nodeTypes.BLOCK);
    expect(ast.children[0].children[1].name).toBe("if");
    expect(ast.children[0].children[1].children.length).toBe(1);
    expect(ast.children[0].children[1].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].children[1].children[0].text).toBe("some inner text");
  });

  it("should throw an error if blocks are terminated in wrong order", () => {
    const tokens = [
      blockStartToken("if", "some condition"),
      textToken("some text"),
      blockStartToken("for", "a of b"),
      textToken("some inner text"),
      blockEndToken("if"),
      blockEndToken("for"),
    ];

    const parser = new Parser(tokens);
    expect(() => parser.parse()).toThrow("Unexpected token BLOCK_END");
  });
});

describe("JST Parser Command Register", () => {
  it("should allow for new commands to be registered", () => {
    command("newcommand", () => {});

    const tokens = [
      blockStartToken("newcommand", "some block"),
      textToken("some text"),
      blockEndToken("newcommand"),
    ];

    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe(nodeTypes.BLOCK);
    expect(ast.children[0].name).toBe("newcommand");
    expect(ast.children[0].children.length).toBe(1);
    expect(ast.children[0].children[0].type).toBe(nodeTypes.TEXT);
    expect(ast.children[0].children[0].text).toBe("some text");
  });

  it("should throw an error if a command is already registered", () => {
    command("alreadyexists", () => {});
    
    expect(() => command("alreadyexists", () => {})).toThrow("Command alreadyexists already exists");
  });
});

function textToken (lexeme) {
  return new Token(tokenTypes.TEXT, lexeme);
}

function statementToken (lexeme) {
  return new Token(tokenTypes.STATEMENT, lexeme);
}

function blockStartToken (name, lexeme) {
  return new Token(tokenTypes.BLOCK_START, lexeme, { name });
}

function blockEndToken (name, lexeme) {
  return new Token(tokenTypes.BLOCK_END, lexeme, { name });
}
