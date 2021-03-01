module.exports = {
  root: true,
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: "off",
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      node: {
        paths: ["."],
      },
    },
  },
  plugins: ["@babel", "import"],
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:promise/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:prettier/recommended", // finir la configuration avec prettier
  ],
};
