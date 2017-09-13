# js13k-lost

An entry in the http://js13kgames.com/ competition.

Originally going to be a procedurally generated game about surviving and searching for lost artifacts.

Right now it's more about being lost on an island with some drunk sheep.

## Controls

    Q W E
     \|/
    A-S-D
     / \
    Z   C

## Build Requirements

- Node >= 7.10.0 (least known to work)
- Yarn

## Building

From the base directory where `package.json` lives:

    $> yarn
    $> make

You should end up with a `game.zip` and a `dist/` directory.

### TODO

- Fix uglify UTF-8 encoded glyph mangling
