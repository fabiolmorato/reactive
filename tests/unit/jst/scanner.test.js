import { Scanner } from "../../../lib/jst/scanner/scanner.js";
import { tokenTypes } from "../../../lib/jst/scanner/token.js";

describe("JST Scanner", () => {
  it("should lex an empty template", () => {
    const scanner = new Scanner("");
    const tokens = scanner.lex();

    expect(tokens.length).toBe(0);
  });

  it("should generate a list of tokens containing 1 text token", () => {
    const template = "some text\nwith\twhitespaces   ";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(tokenTypes.TEXT);
    expect(tokens[0].lexeme).toBe(template);
  });

  it("should not include token type EOF in the list of tokens", () => {
    const scanner = new Scanner("no eofs here");
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(tokenTypes.TEXT);
  });

  it("should generate a list of tokens containing a statement", () => {
    const template = "here goes some {{ \nstatement }}";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();
    
    expect(tokens.length).toBe(2);
    expect(tokens[0].type).toBe(tokenTypes.TEXT);
    expect(tokens[1].type).toBe(tokenTypes.STATEMENT);
  });

  it("should ignore whitespaces around a statement", () => {
    const template = "some {{  statement   }}";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(2);
    expect(tokens[1].lexeme).toBe("statement");
  });

  it("should not ignore whitespaces outside of statements", () => {
    const template = "   \tsome  \n   {{statement}} \n";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(3);
    expect(tokens[0].lexeme).toBe(template.split("{{")[0]);
    expect(tokens[2].lexeme).toBe(template.split("}}")[1]);
  });

  it("should generate a list of tokens containing a block", () => {
    const template = "{{#blockStart}} something {{/blockEnd}}";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(tokenTypes.BLOCK_START);
    expect(tokens[2].type).toBe(tokenTypes.BLOCK_END);
  });

  it("should ignore double closing brackets inside double quote strings in statements", () => {
    const template = `{{ "}}" }}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].lexeme).toBe("\"}}\"");
  });

  it("should ignore double closing brackets inside single quote strings in statements", () => {
    const template = `{{ '}}' }}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].lexeme).toBe("'}}'");
  });

  it("should ignore double closing brackets inside backtick strings in statements", () => {
    const template = "{{ `}}` }}";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].lexeme).toBe("`}}`");
  });

  it("should ignore double closing brackets inside double quote strings in blocks", () => {
    const template = `{{#blockStart "}}"}} hallo {{/blockEnd}}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(3);
    expect(tokens[1].lexeme).toBe(" hallo ");
  });

  it("should ignore double closing brackets inside single quote strings in blocks", () => {
    const template = `{{#blockStart '}}'}} hallo {{/blockEnd}}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(3);
    expect(tokens[1].lexeme).toBe(" hallo ");
  });

  it("should ignore double closing brackets inside backtick strings in blocks", () => {
    const template = "{{#blockStart `}}`}} hallo {{/blockEnd}}";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(3);
    expect(tokens[1].lexeme).toBe(" hallo ");
  });

  it("should throw an error if statement has no closing brackets", () => {
    const template = "{{ statement";
    const scanner = new Scanner(template);

    expect(() => scanner.lex()).toThrow("Expected end of statement but no closing brackets }} found.");
  });

  it("should throw an error if block has no closing brackets", () => {
    const template = "{{#blockStart statement";
    const scanner = new Scanner(template);

    expect(() => scanner.lex()).toThrow("Unterminated block");
  });

  it("should throw an error if end block has no closing brackets", () => {
    const template = "{{/blockEnd";
    const scanner = new Scanner(template);

    expect(() => scanner.lex()).toThrow("Unterminated block");
  });

  it("should throw an error if statement is empty", () => {
    const template = "{{}}";
    const scanner = new Scanner(template);

    expect(() => scanner.lex()).toThrow("Expected statement to not be empty");
  });

  it("should not create a statement token if only one bracket is used", () => {
    const template = "{ hello there }";
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(tokenTypes.TEXT);
  });

  it("should not ignore escaped string quotes", () => {
    const template = `{{ "escaped \\" quotes" }}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(1);
    expect(tokens[0].lexeme).toBe(`"escaped \\" quotes"`);
  });

  it("should throw an error for unterminated statement", () => {
    const template = "{{ unterminated }";
    const scanner = new Scanner(template);

    expect(() => scanner.lex()).toThrow("Expected end of statement but no closing brackets }} found.");
  });

  it("should not ignore escaped string quotes in blocks", () => {
    const template = `{{#blockStart "escaped \\" quotes"}}{{/blockEnd}}`;
    const scanner = new Scanner(template);
    const tokens = scanner.lex();

    expect(tokens.length).toBe(2);
    expect(tokens[0].lexeme).toBe(`"escaped \\" quotes"`);
  });
});
