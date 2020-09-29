const chalk = require('chalk');
const { spawnSync } = require('child_process');
const { writeFileSync, readFile } = require('fs');
const { mkdirSync, copyFileSync } = require('fs');
const { exit, chdir } = require('process');
const path = require('path');
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

const createReactApp = () => {
  console.info('Running `create-react-app`...');
  spawnSync('npx', args, {
    shell: true,
  });

  chdir(path.join(__dirname, '..', projectName));
};

// Install Tailwind dependencies
const installTailwind = () => {
  console.info('Installing Tailwind dependencies...');
  spawnSync(INSTALL_TAILWIND_DEPS_CMD, {
    shell: true,
  });
}

// Initialise Tailwind config + PostCSS
const configureTailwind = () => {
  console.info('Initialising Tailwind configuration');
  spawnSync(SPAWN_TAILWIND_CONFIG_CMD, {
    shell: true,
  });

  // Create assets directory and navigate back to root
  mkdirSync('./src/assets', {
    recursive: true,
  });
  chdir(path.join(__dirname, '..'));

  // Copy the `tailwind.css` stub
  copyFileSync('./stubs/tailwind.stub.css', `./${projectName}/src/assets/tailwind.css`);
}

const updateScripts = () => {
  readFile('./stubs/package.stub.json', {
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
  })

  readFile('./stubs/App.stub.tsx', {
    encoding: 'utf8',
  }, (err, data) => {
    const withReplacedImport = data.replace(/\<tailwind\>/g, `import './assets/main.css'`);

    writeFileSync(
      path.join(__dirname, '..', projectName, 'src', 'App.tsx'),
      withReplacedImport,
      {
        encoding: 'utf8',
      },
    )
  })
};

createReactApp();
installTailwind();
configureTailwind();
updateScripts();

console.info(`\n🎉 ${projectName} is ready! To get started:\n`);
console.info(`\t${chalk.blue('cd')} ${projectName}`);
console.info(`\t${chalk.blue('yarn')} start\n`);