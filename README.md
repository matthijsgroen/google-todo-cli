# Google Todo cli

Command line app to manage your TODO lists. Ideal when working in a TMUX setup
and you want a todo list next to your editor and tests 😎

## Installation

`yarn global add google-todo-cli`

`todo-list`

And follow the instructions.

I use the task setup from the API example of Google, so the app is not
'verified'. Since its a major hassle to arrange that, I will not verify it
either.

## Usage

`todo-list`

## Keys:

- `q/Ctrl-c` - quit

Bottom bar:

- `1` - previous list
- `2` - next list
- `3` - refresh list
- `4` - clear all completed tasks

Navigation:

- `j/k`/arrows - move selection
- `g/G` - top/bottom of list

Tasks:

- `x` - Complete/open task
- Enter - edit item
- `a` - add new item underneath selected item
- `s` - add new item as subtask of selected item
- `D` - Delete task
- `m` - Move item. use arrows/`j/k` to move item. Enter to confirm, Esc to
  cancel
