module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
  plugins: [
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    ["@babel/plugin-proposal-class-properties"],
    ["@babel/plugin-syntax-class-properties"],
  ],
  overrides: [
    {
      test: "../../node_modules/ethers",
      plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-private-methods",
        "@babel/plugin-syntax-class-properties",
      ],
    },
    {
      test: "../../node_modules/mises-js-sdk",
      plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-private-methods",
        "@babel/plugin-syntax-class-properties",
      ],
    },
  ],
};
