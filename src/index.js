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
});

const projectName = argv._.pop();
if (path.isAbsolute(projectName)) {
  // eslint-disable-next-line no-console
  console.error('You can only create projects in your current directory.');
  exit(1);
}

const { template } = argv;
const args = [
  'create-react-app',
  projectName,
];

if (template && VALID_TEMPLATES.includes(template)) {
  args.push(`--template ${template}`);
} else {
  // eslint-disable-next-line no-console
  console.error(`${template} is not a valid template.`);
  exit(1);
}

const baseDir = cwd();

const spinner = ora('Running `create-react-app`...');
const createReactApp = () => {
  spinner.start();

  return new Promise((res) => {
    const npx = spawn('npx', args, {
      shell: true,
    });

    npx.on('close', () => {
      // TODO(shannon): Fix this when the project path/name isn't relative
      chdir(path.join(projectName));
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
      shell: true,
    });

    config.on('close', () => {
      // Create assets directory and navigate back to root
      mkdirSync('./src/assets', {
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
    path.join(projectName, 'src', 'assets', 'tailwind.css'),
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

    chdir(baseDir);
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

    chdir(baseDir);
    writeFileSync(
      path.join(projectName, 'src', 'App.tsx'),
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

main().then(() => {
  console.info(`\n🎉 ${projectName} is ready! To get started:\n`); // eslint-disable-line no-console
  console.info(`\t${chalk.blue('cd')} ${projectName}`); // eslint-disable-line no-console
  console.info(`\t${chalk.blue('yarn')} start\n`); // eslint-disable-line no-console
});
