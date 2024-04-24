import { defineConfig } from "cypress";
import { spawn } from "child_process";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      let exampleServerProcess;
      on("before:run", () => {
        exampleServerProcess = spawn("npm", ["run", "example"], {
          stdio: "inherit",
        }).on("exit", (code) => {
          if (code) {
            console.error("Failed to run 'npm run example'");
            process.exit(code);
          }
        });
      });

      on("after:run", () => {
        exampleServerProcess.kill();
      });
    },
  },
});
