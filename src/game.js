let canvas, stage
const tileWidth = 10, tileHeight = 10
const tiles = {
    GRASS: 0,
    WATER: 1
}
let island = {tiles: new Map(), width: 0, height: 0}
let running = true

// utilities

const randRange = (min, max) =>
      Math.floor(Math.random() * max) + min

const choose = list =>
      list[randRange(0, list.length)]

// world gen

const emptyArray = (width, height) => {
    const arr = []
    for (let j = 0; j <= height; j++) {
        arr.push(Array(width).fill(0))
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
    island.width = width
    island.height = height
    let i = 0, j = 0
    while (i < width) {
        while (j < height) {
            island.tiles.set([i, j], tiles.WATER)
            j++
        }
        j = 0
        i++
    }

    const heightMap = emptyArray(width, height)
    const [centerX, centerY] = [Math.floor(width / 2),
                                Math.floor(height / 2)]
    for (let n = 0; n < randRange(1, 4); n++) {
        const [rx, ry] = randPointWithinR(width / 3)
        heightMap[centerX + rx][centerY + ry] = 1.0
    }

    // convert heightmap to tiles
    for (let j = 0; j < heightMap.length; j++) {
        for (let i = 0; i < heightMap[0].length; i++) {
            switch (true) {
            case heightMap[j][i] <= 0:
                island.tiles.set([i, j], tiles.WATER)
                break;
            case heightMap[j][i] > 0:
                island.tiles.set([i, j], tiles.GRASS)
                break;
            }
        }
    }
}

const renderIsland = (screenX, screenY) => {
    for (const [[x, y], tile] of island.tiles.entries()) {
        switch (tile) {
        case tiles.GRASS:
            stage.fillStyle = 'green'
            break;
        case tiles.WATER:
            stage.fillStyle = 'deepskyblue'
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
