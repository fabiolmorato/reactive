export const commands = [];

export function command (name, handler, chainCommands = []) {
  if (commands.find((command) => command.name === name)) {
    throw new Error(`Command ${name} already exists`);
  }

  commands.push({ name, handler, chainCommands });
}

export function run (name, block, generate) {
  const command = commands.find((command) => command.name === name);
  return command.handler(block.commandArgs, block, generate, block.chainBlocks);
}

command("if", (arg, block, generate, chainBlocks) => {
  return `
    if (${arg}) {
      ${generate(block)}
    } ${chainBlocks.map((block) => `
        ${block.name === "elif" ? `
          else if (${block.commandArgs}) {
            ${generate(block)}
          }
        ` : `
          else {
            ${generate(block)}
          }
        `}
      `
    ).join("\n")}
  `;
}, ["else", "elif"]);

command("for", (arg, block, generate) => {
  const [rawItem, rawIterable] = arg.split("of");
  const item = rawItem.trim();
  const iterable = rawIterable.trim();
  const random_iterable_suffix = Math.random().toString(36).slice(2);

  return `
    for (let __reactive__index__${random_iterable_suffix} = 0; __reactive__index__${random_iterable_suffix} < ${iterable}.length; __reactive__index__${random_iterable_suffix}++) {
      const ${item} = ${iterable}[__reactive__index__${random_iterable_suffix}];
      const $index = __reactive__index__${random_iterable_suffix};
      const $${item}Index = $index;
      ${generate(block)}
    }
  `
});
