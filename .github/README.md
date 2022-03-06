<img src="../resources/icon.png" align="right" width="128" />

# **{find+}**
[![Chrome Users](https://img.shields.io/chrome-web-store/users/fddffkdncgkkdjobemgbpojjeffmmofb.svg?style=flat&label=chrome%20users)](https://chrome.google.com/webstore/detail/find%2B/fddffkdncgkkdjobemgbpojjeffmmofb)
[![Firefox Users](https://img.shields.io/amo/users/brandon1024-find.svg?label=firefox%20users&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/brandon1024-find/)
[![Last Commit on GitHub](https://img.shields.io/github/last-commit/brandon1024/find.svg?style=flat)](https://github.com/brandon1024/find/commits/develop)

**{find+}** is a powerful _find-in-page_ extension for Chrome and Firefox that allows you to search for content in a web page or document by regular expression. It is a feature-rich alternative to the native _find-in-page_ tool built into your browser.

Some notable features:
- match a regular expression against text in a web page
- quickly search for text using the browser omnibox
- find and replace text in a page
- copy occurrences of a regular expression to your clipboard
- store frequently-used patterns
- adjust colours and search settings

![](screencast.gif)

## Getting Started
The **{find+}** extension is available through the Chrome Web Store and through the Firefox Add-ons Store.

<img src="chrome-icon.png" width="16"/> Download the extension here: [find+ | Regex Find-in-Page Tool](https://chrome.google.com/webstore/detail/find%2B/fddffkdncgkkdjobemgbpojjeffmmofb).

<img src="firefox-icon.png" width="16"/> Download the extension here: [{find+} – Get this Extension for 🦊 Firefox](https://addons.mozilla.org/en-US/firefox/addon/brandon1024-find/).

## Keyboard Shortcuts
In Firefox, you can use <kbd>CTRL</kbd>+<kbd>⇧</kbd>+<kbd>F</kbd> to open the extension popup.

To open the extension popup in Chrome using a keyboard shortcut, you must first assign a keyboard shortcut to the extension through the Chrome settings. You can do this by following these steps:
1. Navigate to the `Extensions` settings page in Chrome, or type `chrome://extensions/` into the navigation bar.
2. In the top left click on the ☰ menu icon, then click `Keyboard shortcuts`.
3. Locate the shortcut settings for find+. Click the input field located to the right of the label `Activate the extension`.
4. Press the combination of keys you would like to use, and once complete press `OK`. We recommend using <kbd>CTRL</kbd>+<kbd>⇧</kbd>+<kbd>F</kbd>, since it shouldn't conflict with any other browser keyboard shortcut mappings.

When the extension popup is open, there are a number of keyboard shortcuts you can use. These settings cannot be remapped.

| Windows Shortcut                                   | macOS Shortcut                                     | Action                                                                 |
| :------------------------------------------------- | :------------------------------------------------- | :--------------------------------------------------------------------- |
| <kbd>↵</kbd>                                       | <kbd>↵</kbd>                                       | Advance to the next occurrence of the regular expression in the page   |
| <kbd>⇧</kbd>+<kbd>↵</kbd>                          | <kbd>⇧</kbd>+<kbd>↵</kbd>                          | Return to the previous occurrence of the regular expression in the page|
| <kbd>CTRL</kbd>+<kbd>⇧</kbd>+<kbd>↵</kbd>          | <kbd>^</kbd>+<kbd>⇧</kbd>+<kbd>↵</kbd>             | Follow the first highlighted link in the current occurrence focus      |
| <kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>C</kbd>        | <kbd>^</kbd>+<kbd>⌥</kbd>+<kbd>C</kbd>             | Copy to the clipboard the currently highlighted text on the page.      |
| <kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>A</kbd>        | <kbd>^</kbd>+<kbd>⌥</kbd>+<kbd>A</kbd>             | Copy to the clipboard the all highlighted text on the page.            |
| <kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>O</kbd>        | <kbd>^</kbd>+<kbd>⌥</kbd>+<kbd>O</kbd>             | Expand or Collapse Options Pane                                        |
| <kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>R</kbd>        | <kbd>^</kbd>+<kbd>⌥</kbd>+<kbd>R</kbd>             | Expand or Collapse Replace Text Pane                                   |
| <kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>H</kbd>        | <kbd>^</kbd>+<kbd>⌥</kbd>+<kbd>H</kbd>             | Expand or Collapse Saved Expressions Pane                              |
| <kbd>CTRL</kbd>+<kbd>↵</kbd> or <kbd>ESC</kbd>     | <kbd>^</kbd>+<kbd>↵</kbd> or <kbd>ESC</kbd>        | Close the extension popup                                              |

## Omnibox Support
In version 1.4.0, we introduced omnibox support! This allows you to highlight text on a page without even opening the extension. To use this feature, type `find` in your browser's address bar, press <kbd>␣</kbd> or <kbd>⇥</kbd>, and then enter a regular expression. Occurrences of the regular expression will become highlighted on the page as you type.

Pressing `ENTER` will leave the highlights in the page. To remove the highlights, simply refresh the page. If you don't want to leave the highlights in the page, just erase the text entered in the address bar.

<img src="omni.png"/>

## Contributing
We can use your help! Our [CONTRIBUTING](CONTRIBUTING.md) doc should help get you started.

## Contributors
[<img src="https://avatars3.githubusercontent.com/u/22732449?v=3&s=460" width="64" style="border-radius:50%">](https://github.com/brandon1024) [<img src="https://avatars3.githubusercontent.com/u/25009878?s=460&u=ba1d4eb8abb2ad96c514aeb911adf1b34949e32f&v=4" width="64" style="border-radius:50%">](https://github.com/MichaelWalz) [<img src="https://avatars3.githubusercontent.com/u/184316?s=460&u=beed843205b1fd652277562e715f517d3082b4be&v=4" width="64" style="border-radius:50%">](https://github.com/muescha) [<img src="https://avatars3.githubusercontent.com/u/7383028?s=460&v=4" width="64" style="border-radius:50%">](https://github.com/amit-gshe) [<img src="https://avatars2.githubusercontent.com/u/8235338?s=460&v=4" width="64" style="border-radius:50%">](https://github.com/ReporterX)

## License
This project is licensed under the [GPLv3 License](https://www.gnu.org/licenses/gpl-3.0.en.html).

