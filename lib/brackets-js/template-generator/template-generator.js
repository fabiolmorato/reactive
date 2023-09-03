import { Scanner } from "../scanner/scanner.js";
import { Parser, nodeTypes } from "../parser/parser.js";
import { run } from "../commands/command.js";

function generateFromAst (root) {
  let code = "";

  if (root.type === nodeTypes.TEXT) {
    code += "templateResult += ` " + root.text.replaceAll("`", "\\`") + " `;\n";
  } else if (root.type === nodeTypes.STATEMENT) {
    code += `
      tmpResultValue = ${root.code};
      templateResult += tmpResultValue;
      templateResult += " ";
    `;
  } else {
    for (const child of root.children) {
      if (child.type === nodeTypes.BLOCK) {
        code += run(child.name, child, generateFromAst);
      } else {
        code += generateFromAst(child);
      }

      code += "\n";
    }
  }

  return code;
}

export function compile (template) {
  const scanner = new Scanner(template);
  const tokens = scanner.lex();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const compiled = new Function("state", `
    let templateResult = "";
    let tmpResultValue;
    const windowBackup = Object.keys(state).reduce((acc, key) => ({ ...acc, [key]: window[key] }), {});
    Object.assign(window, state);
    ${generateFromAst(ast)}
    Object.assign(window, windowBackup);
    return templateResult;
  `);

  compiled.variables = extractVariableNamesFromAST(ast);

  return compiled;
}

function extractVariableNamesFromAST (ast) {
  const variables = new Set();
  const reserved = ["if", "else", "for", "of", "in", "true", "false", "null", "undefined", "class", "function", "return", "new", "this", "const", "let", "var", "async", "await", "try", "catch", "finally", "while", "do", "switch", "case", "break", "continue", "delete", "typeof", "instanceof", "void", "throw", "extends", "yield"];

  if (ast.children) {
    for (const child of ast.children) {
      if (child.type === nodeTypes.STATEMENT) {
        const tokens = child.code.split(" ").filter(variablesFilter);

        for (const token of tokens) {
          if (reserved.includes(token)) continue;
          variables.add(token);
        }
      } else if (child.type === nodeTypes.BLOCK) {
        const commandArgsVariables = child.commandArgs?.split(" ")?.filter((variable) => variablesFilter(variable) && !reserved.includes(variable)) || [];
        const childrenVariables = extractVariableNamesFromAST(child);
        const chainBlocksVariables = child.chainBlocks.map((chainBlock) => extractVariableNamesFromAST(chainBlock)).flat();
  
        for (const variable of [...commandArgsVariables, ...childrenVariables, ...chainBlocksVariables]) {
          variables.add(variable);
        }
      }
    }
  }

  return [...variables];
}

function variablesFilter (name) {
  return /^[a-zA-Z_]([a-zA-Z0-9_])*$/.test(name);
}
