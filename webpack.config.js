const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
  // Main process
  {
    mode: 'development',
    entry: './src/main.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/ui/*.html', to: ({ context, absoluteFilename }) => {
            const relativePath = path.relative(context, absoluteFilename);
            const targetPath = relativePath.replace('src/', '');
            return targetPath;
          }},
          { from: 'src/ui/styles/*.css', to: ({ context, absoluteFilename }) => {
            const relativePath = path.relative(context, absoluteFilename);
            const targetPath = relativePath.replace('src/', '');
            return targetPath;
          }},
          { from: 'assets', to: 'assets' }
        ]
      })
    ]
  },
  // Preload script
  {
    mode: 'development',
    entry: './src/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    }
  },
  // Renderer process for the mini window
  {
    mode: 'development',
    entry: './src/renderer.ts',
    target: 'electron-renderer',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    }
  },
  // Renderer process for the main chat window
  {
    mode: 'development',
    entry: './src/ui/main-chat.ts',
    target: 'electron-renderer',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist/ui'),
      filename: 'main-chat.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    }
  },
  // Type definitions
  {
    mode: 'development',
    entry: './src/types.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'types.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/ui/*.html', to: 'ui/[name][ext]' },
          { from: 'assets', to: 'assets' }
        ]
      })
    ]
  }
]; 