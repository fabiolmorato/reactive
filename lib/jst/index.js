import { compile } from "./template-generator/template-generator.js";
import { command } from "./commands/command.js";

export { compile, command };
if (window) {
  window.jst = { compile, command };
}
