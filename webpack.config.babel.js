var path = require('path')

module.exports = {
  context: path.resolve(__dirname, 'src'),
  devtool: 'cheap-module-eval-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'vdoom.js',
    library: 'Vdoom'
  },
  module: {
    rules: [
      {test: /\.iota$/, use: path.resolve(__dirname, 'src/loader.js')}
    ]
  }
}
