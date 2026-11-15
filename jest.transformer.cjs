const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  presets: ['babel-preset-expo'],
  plugins: [
    ({ types }) => ({
      visitor: {
        JSXExpressionContainer(path) {
          if (
            !types.isStringLiteral(path.node.expression) ||
            !/^\s*$/.test(path.node.expression.value)
          ) {
            return;
          }
          const element = path.parentPath;
          const name = element.isJSXElement() && element.node.openingElement.name;
          const isText =
            name &&
            ((types.isJSXIdentifier(name) && name.name === 'Text') ||
              (types.isJSXMemberExpression(name) && name.property.name === 'Text'));
          if (!isText) path.remove();
        },
      },
    }),
  ],
});
