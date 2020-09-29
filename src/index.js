const { execFile, exec, execFileSync, execSync, spawn, spawnSync } = require('child_process');
const { readFileSync } = require('fs');
const { fstat, mkdirSync, copyFileSync } = require('fs');
const { writeFileSync } = require('jsonfile');
const { exit, chdir, cwd } = require('process');
const yargs = require('yargs');

const VALID_TEMPLATES = [
  'typescript',
];

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

  chdir(`./${projectName}`);
};

const tailwindDepsCmd = `yarn add tailwindcss autoprefixer@^9.4.5 postcss-cli@^7.0.11 -D`;
const tailwindConfigCmd = `npx tailwind init --full -p`;

// Install Tailwind dependencies
const installTailwind = () => {
  console.info('Installing Tailwind dependencies...');
  spawnSync(tailwindDepsCmd, {
    shell: true,
  });
}

// Initialise Tailwind config + PostCSS
const configureTailwind = () => {
  console.info('Initialising Tailwind configuration');
  spawnSync(tailwindConfigCmd, {
    shell: true,
  });

  mkdirSync('./src/assets');

  chdir('../');

  copyFileSync('./stubs/tailwind.stub.css', `./${projectName}/src/assets/tailwind.css`);
}

const updateScripts = () => {
  const packageJsonFile = readFileSync('./stubs/package.stub.json', {
    encoding: 'utf8',
  })
  const withReplacedPackageName = packageJsonFile.replace(/\<project\-name\>/g, projectName);

  console.log(withReplacedPackageName);

  writeFileSync(
    `./${projectName}/package.json`, 
    withReplacedPackageName,
  );
};

// createReactApp();
// installTailwind();
// configureTailwind();
updateScripts();

console.info(`🎉 ${projectName} is ready!`);