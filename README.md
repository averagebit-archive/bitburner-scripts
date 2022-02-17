# Bitburner Scripts

These are my personal [Bitburner](https://github.com/danielyxie/bitburner) automation scripts.

## Setup

```
# Install dependencies
$ npm install

# Update Netscript TS definitions
$ npm run defs

# Autocompile on save
$ npm run watch
```

If you run `watcher.js` in game, the game will automatically detect file changes and restart the associated scripts. For debugging add `--remote-debugging-port=9222` to steam launch settings.

### Extension Recommendations

[vscode-bitburner-connector](https://github.com/bitburner-official/bitburner-vscode) ([vscode extension marketplace](https://marketplace.visualstudio.com/items?itemName=bitburner.bitburner-vscode-integration)) to upload your files into the game

[auto-snippet](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.auto-snippet) to automate inserting the file template in `.vscode/snippets.code-snippets`

### Attribution

[Original Template](https://github.com/bitburner-official/vscode-template)
