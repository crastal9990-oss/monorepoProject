
function readPackage(pkg, context) {
  // 统一 React 版本
  if (pkg.dependencies && pkg.dependencies.react) {
    pkg.dependencies.react = '^18.2.0'
  }

  // 统一 TypeScript 版本
  if (pkg.devDependencies && pkg.devDependencies.typescript) {
    pkg.devDependencies.typescript = '^5.0.0'
  }

  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
