const chalk = require('chalk');
const { spawn } = require('child_process');
const { copyFile, mkdirSync, readFile, writeFileSync } = require('fs');
const ora = require('ora');
const path = require('path');
const { exit, chdir } = require('process');
const yargs = require('yargs');

const VALID_TEMPLATES = [
  'typescript',
];

const START_SCRIPT_WITH_CSS_CMD = 'npm run css && react-scripts start';
const BUILD_CSS_SCRIPT = 'postcss src/assets/tailwind.css -o src/assets/main.css';
const INSTALL_TAILWIND_DEPS_CMD = `yarn add tailwindcss autoprefixer@^9.4.5 postcss-cli@^7.0.11 -D`;
const SPAWN_TAILWIND_CONFIG_CMD = `npx tailwind init --full -p`;

const argv = yargs
  .command('name', 'the project name', (yargs) => {
    yargs.option('t', {
      alias: 'template',
      demandOption: false,
      type: 'string',
      choices: ['typescript']
    })
  })
  .argv;

const projectName = argv._.pop();
const { template } = argv;
const args = [
  'create-react-app',
  projectName,
];

if (template && VALID_TEMPLATES.includes(template)) {
  args.push(`--template ${template}`);
} else {
  console.error(`${template} is not a valid template.`);
  exit(1);
}

let spinner = ora('Running `create-react-app`...');
const createReactApp = () => {
  spinner.start();

  return new Promise((res, rej) => {
    const npx = spawn('npx', args, {
      shell: true,
    });

    npx.on('close', () => {
      chdir(path.join(__dirname, '..', projectName));
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

  return new Promise((res, rej) => {
    const deps = spawn(INSTALL_TAILWIND_DEPS_CMD, {
      shell: true,
    });

    deps.on('close', () => {
      spinner.succeed();
      res();
    });
  });
}

/**
 * Initialises the Tailwind configuration file.
 */
const configureTailwind = () => {
  spinner.start('Initialising Tailwind configuration...');

  return new Promise((res, rej) => {
    const config = spawn(SPAWN_TAILWIND_CONFIG_CMD, {
      shell: true,
    });

    config.on('close', () => {
      // Create assets directory and navigate back to root
      mkdirSync('./src/assets', {
        recursive: true,
      });
      chdir(path.join(__dirname, '..'));
      
      spinner.succeed();
      res();
    })
  })
}

/**
 * Updates all replaceable stubs in the generated React project.
 */
const updateStubs = async () => {
  let promises = [];
  
  // Copy the `tailwind.css` stub
  promises.push(copyFile('./stubs/tailwind.stub.css', `./${projectName}/src/assets/tailwind.css`, () => void 0));

  promises.push(readFile(path.join(__dirname, '..', 'stubs', 'package.stub.json'), {
    encoding: 'utf8',
  }, (err, data) => {
    if (err) return console.error(err);

    const asJson = JSON.parse(data);
    asJson.name = projectName;
    asJson.scripts.start = START_SCRIPT_WITH_CSS_CMD;
    asJson.scripts.css = BUILD_CSS_SCRIPT;
  
    writeFileSync(
      path.join(__dirname, '..', projectName, 'package.json'),
      JSON.stringify(asJson, null, 4),
      {
        encoding: 'utf8',
      },
    );
  }));

  promises.push(readFile(path.join(__dirname, '..', 'stubs', 'App.stub.tsx'), {
    encoding: 'utf8',
  }, (err, data) => {
    if (err) return console.error(err);

    const withReplacedImport = data.replace(/\<tailwind\>/g, `import './assets/main.css'`);

    writeFileSync(
      path.join(__dirname, '..', projectName, 'src', 'App.tsx'),
      withReplacedImport,
      {
        encoding: 'utf8',
      },
    )
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
  console.info(`\n🎉 ${projectName} is ready! To get started:\n`);
  console.info(`\t${chalk.blue('cd')} ${projectName}`);
  console.info(`\t${chalk.blue('yarn')} start\n`);
});
