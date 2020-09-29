#!/usr/bin/env node

const chalk = require('chalk');
const { spawn } = require('child_process');
const {
  copyFile, mkdirSync, readFile, writeFileSync,
} = require('fs');
const ora = require('ora');
const path = require('path');
const { exit, chdir, cwd } = require('process');
const yargs = require('yargs');

const VALID_TEMPLATES = [
  'typescript',
];

const START_SCRIPT_WITH_CSS_CMD = 'npm run css && react-scripts start';
const BUILD_CSS_SCRIPT = 'postcss src/assets/tailwind.css -o src/assets/main.css';
const INSTALL_TAILWIND_DEPS_CMD = 'yarn add tailwindcss autoprefixer@^9.4.5 postcss-cli@^7.0.11 -D';
const SPAWN_TAILWIND_CONFIG_CMD = 'npx tailwind init --full -p';

const { argv } = yargs.option('t', {
  alias: 'template',
  demandOption: false,
  type: 'string',
  choices: ['typescript'],
}).option('v', {
  alias: 'verbose',
  demandOption: false,
});

const projectName = argv._.pop();
if (projectName && path.isAbsolute(projectName)) {
  // eslint-disable-next-line no-console
  console.error('You can only create projects in your current directory.');
  exit(1);
}

const { template, verbose } = argv;
const args = [
  'create-react-app',
  projectName,
];

if (template && VALID_TEMPLATES.includes(template)) {
  args.push(`--template ${template}`);
} else if (template && !VALID_TEMPLATES.includes(template)) {
  // eslint-disable-next-line no-console
  console.error(`${template} is not a valid template.`);
  exit(1);
}

const projectDir = path.join(cwd(), projectName);
const baseDir = path.resolve(__dirname, '../');

const spinner = verbose ? {
  start: () => undefined,
  succeed: () => undefined,
} : ora();

const createReactApp = () => {
  spinner.start('Running `create-react-app`...');

  return new Promise((res) => {
    const npx = spawn('npx', args, {
      stdio: verbose ? 'inherit' : 'ignore',
      shell: true,
    });

    npx.on('close', () => {
      // TODO(shannon): Fix this when the project path/name isn't relative
      chdir(projectDir);
      spinner.succeed();
      res();
    });
  });
};

/**
 * Installs Tailwind dependencies including `postcss-cli`, `autoprefixer`, and `tailwindcss`.
 */
const installTailwind = () => {
  // ora('Installing Tailwind dependencies...').start();
  spinner.start('Installing Tailwind dependencies...');

  return new Promise((res) => {
    const deps = spawn(INSTALL_TAILWIND_DEPS_CMD, {
      stdio: verbose ? 'inherit' : 'ignore',
      shell: true,
    });

    deps.on('close', () => {
      spinner.succeed();
      res();
    });
  });
};

/**
 * Initialises the Tailwind configuration file.
 */
const configureTailwind = () => {
  spinner.start('Initialising Tailwind configuration...');

  return new Promise((res) => {
    const config = spawn(SPAWN_TAILWIND_CONFIG_CMD, {
      stdio: verbose ? 'inherit' : 'ignore',
      shell: true,
    });

    config.on('close', () => {
      // Create assets directory and navigate back to root
      mkdirSync(path.join(__dirname, 'src', 'assets'), {
        recursive: true,
      });
      chdir(baseDir);

      spinner.succeed();
      res();
    });
  });
};

/**
 * Updates all replaceable stubs in the generated React project.
 */
const updateStubs = async () => {
  const promises = [];

  // Copy the `tailwind.css` stub
  promises.push(copyFile(
    path.join(baseDir, 'stubs', 'tailwind.stub.css'),
    path.join(projectDir, 'src', 'assets', 'tailwind.css'),
    () => undefined,
  ));

  promises.push(readFile(path.join(baseDir, 'stubs', 'package.stub.json'), {
    encoding: 'utf8',
  }, (err, data) => {
    // eslint-disable-next-line no-console
    if (err) return console.error(err);

    const asJson = JSON.parse(data);
    asJson.name = projectName;
    asJson.scripts.start = START_SCRIPT_WITH_CSS_CMD;
    asJson.scripts.css = BUILD_CSS_SCRIPT;

    writeFileSync(
      path.join(projectName, 'package.json'),
      JSON.stringify(asJson, null, 2),
      {
        encoding: 'utf8',
      },
    );

    return true;
  }));

  promises.push(readFile(path.join(baseDir, 'stubs', 'App.stub.tsx'), {
    encoding: 'utf8',
  }, (err, data) => {
    // eslint-disable-next-line no-console
    if (err) return console.error(err);

    const withReplacedImport = data.replace(/<tailwind>/g, 'import \'./assets/main.css\'');

    writeFileSync(
      path.join(projectDir, 'src', 'App.tsx'),
      withReplacedImport,
      {
        encoding: 'utf8',
      },
    );

    return true;
  }));

  await Promise.all(promises);
};

const main = async () => {
  await createReactApp();
  await installTailwind();
  await configureTailwind();
  await updateStubs();
};

if (process.env.NODE_ENV !== 'test') {
  main().then(() => {
    console.info(`\n🎉 ${projectName} is ready! To get started:\n`); // eslint-disable-line no-console
    console.info(`\t${chalk.blue('cd')} ${projectName}`); // eslint-disable-line no-console
    console.info(`\t${chalk.blue('yarn')} start\n`); // eslint-disable-line no-console
  });
}
