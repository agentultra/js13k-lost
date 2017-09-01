let canvas, stage
const tileWidth = 10, tileHeight = 10
const tiles = {
    GRASS: 0,
    WATER: 1,
    SAND: 2,
    DEEPWATER: 3,
    FOREST: 4,
    MOUNTAIN: 5
}
let island = {tiles: new Map(), width: 0, height: 0}
let running = true

// utilities

const randRange = (min, max) =>
      Math.floor(Math.random() * max) + min

const choose = list =>
      list[randRange(0, list.length)]

// world gen

const emptyArray = (width, height, fill=0) => {
    const arr = []
    for (let j = 0; j < height; j++) {
        arr.push(Array(width).fill(fill))
    }
    return arr
}

const randPointWithinR = r => {
    let a = Math.random()
    ,   b = Math.random()
    if (b < a) [a, b] = [b, a]
    return [Math.floor(b * r * Math.cos(2 * Math.PI * a / b)),
            Math.floor(b * r * Math.sin(2 * Math.PI * a / b))]
}

const generateIsland = (width, height) => {

    const Volcano = ([x, y], strength) => ({
        eruptions: randRange(strength, 2 * strength),
        x,
        y
    })

    const directions = {
        N: [[-1, -1], [0, -1], [1, -1]],
        NE: [[0, -1], [1, -1], [1, 0]],
        E: [[1, -1], [1, 0], [1, 1]],
        SE: [[1, 0], [1, 1], [0, 1]],
        S: [[1, 1], [0, 1], [-1, 1]],
        SW: [[0, 1], [-1, 1], [-1, 0]],
        W: [[-1, 1], [-1, 0], [-1, -1]],
        NW: [[-1, 0], [-1, -1], [0, -1]]
    }

    const neighbours = (x, y) =>
          [
              [x, y - 1, 'N'],
              [x + 1, y - 1, 'NE'],
              [x + 1, y, 'E'],
              [x + 1, y + 1, 'SE'],
              [x, y + 1, 'S'],
              [x - 1, y + 1, 'SW'],
              [x - 1, y, 'W'],
              [x - 1, y - 1, 'NW'],
          ]

    const eruptionFrontier = (x, y, dir, mapW, mapH) =>
          directions[dir].map(
              ([dx, dy]) => {
                  const [nX, nY] = [x + dx, y + dy]
                  return [nX < 0 ? 0 : nX >= mapW ? mapW - 1 : nX,
                          nY < 0 ? 0 : nY >= mapH ? mapH - 1 : nY]
              }
          )

    island.width = width
    island.height = height
    let i = 0, j = 0
    while (i < width) {
        while (j < height) {
            island.tiles.set([i, j], tiles.DEEPWATER)
            j++
        }
        j = 0
        i++
    }

    const heightMap = emptyArray(width, height, -0.3)
    const [centerX, centerY] = [Math.floor(width / 2),
                                Math.floor(height / 2)]
    const volcanoes = []
    for (let n = 0; n < randRange(2, 4); n++) {
        const [rx, ry] = randPointWithinR(width / 4)
        volcanoes.push(Volcano([centerX + rx, centerY + ry],
                               randRange(32, 75)))
    }
    // simulate eruptions / lava!
    for (const {x, y, eruptions} of volcanoes) {
        heightMap[y][x] = 1.0
        for (let n = 0; n < eruptions; n++) {
            let power = Math.random(0.3, 0.6)
            ,   eruptionSite = choose(neighbours(x, y))
            ,   [eruptionX, eruptionY, dir] = eruptionSite

            while (power > 0) {
                heightMap[eruptionY][eruptionX] += power
                const frontier = eruptionFrontier(eruptionX, eruptionY, dir,
                                                  width, height)
                const newFrontier = choose(frontier)
                eruptionX = newFrontier[0]
                eruptionY = newFrontier[1]
                power -= 0.1
            }
        }
    }

    // convert heightmap to tiles
    for (let j = 0; j < heightMap.length; j++) {
        for (let i = 0; i < heightMap[0].length; i++) {
            const h = heightMap[j][i]
            switch (true) {
            case h > -0.3 && h <= 0:
                island.tiles.set([i, j], tiles.WATER)
                break;
            case h > 0 && h <= 0.3:
                island.tiles.set([i, j], tiles.SAND)
                break;
            case h > 0.3 && h <= 2:
                island.tiles.set([i, j], tiles.GRASS)
                break;
            case h > 2 && h <= 6:
                island.tiles.set([i, j], tiles.FOREST)
                break;
            case h > 6:
                island.tiles.set([i, j], tiles.MOUNTAIN)
                break;
            }
        }
    }
}

const renderIsland = (screenX, screenY) => {
    for (const [[x, y], tile] of island.tiles.entries()) {
        switch (tile) {
        case tiles.GRASS:
            stage.fillStyle = 'forestgreen'
            break;
        case tiles.WATER:
            stage.fillStyle = 'deepskyblue'
            break;
        case tiles.SAND:
            stage.fillStyle = 'Beige'
            break;
        case tiles.DEEPWATER:
            stage.fillStyle = 'dodgerblue'
            break;
        case tiles.FOREST:
            stage.fillStyle = 'green'
            break;
        case tiles.MOUNTAIN:
            stage.fillStyle = 'grey'
            break;
        }
        stage.fillRect((x * tileWidth) + screenX,
                       (y * tileHeight) + screenY,
                       tileWidth, tileHeight)
    }
}

// game
const initialize = () => {
    canvas = document.getElementById('stage')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    stage = canvas.getContext('2d')
    generateIsland(30, 30)
}

const update = () => {
}

const render = () => {
    stage.fillStyle = '#000'
    stage.fillRect(0, 0, window.innerWidth, window.innerHeight)
    renderIsland(75, 50)
}

// main
initialize()
let lastFrame = +new Date
const loop = now => {
    if (running) {
        window.requestAnimationFrame(loop, now)
        let dt = now - lastFrame
        if (dt < 160) {
            update()
        }
        render()
        lastFrame = now
    }
}
loop(lastFrame)
