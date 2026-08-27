import chalk from 'chalk';

let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export const logger = {
  info(message: string): void {
    console.log(message);
  },
  success(message: string): void {
    console.log(chalk.green('✔'), message);
  },
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  },
  error(message: string): void {
    console.error(chalk.red('✖'), message);
  },
  debug(message: string): void {
    if (debugEnabled) {
      console.error(chalk.dim(`[debug] ${message}`));
    }
  },
};
