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

const lerp = (v1, v2, alpha) => v1 * (1 - alpha) + alpha * v2

const genWhiteNoise = (width, height) => {
    let i = 0, j = 0
    const noise = emptyArray(width, height)
    while (i < width) {
        while (j < height) {
            noise[i][j] = Math.random()
            j++
        }
        j = 0
        i++
    }
    j = i = 0
    while (j < height) {
        while (i < width) {
            const s1 = noise[i][j]
            , s2 = noise[Math.pow(i, 2) % width][j]
            noise[i][j] = lerp(s1, s2, 0.4)
            i++
        }
        i = 0
        j++
    }
    return noise
}

const genSmoothNoise = (baseNoise, octave) => {
    const width = baseNoise[0].length - 1
    ,     height = baseNoise.length - 1
    ,     smoothNoise = emptyArray(width, height)
    ,     samplePeriod = 1 << octave
    ,     sampleFreq = 1 / samplePeriod

    for (let i = 0; i < width; i++) {
        let sample_i0 = (i / samplePeriod) * samplePeriod
        ,   sample_i1 = (sample_i0 + samplePeriod) % width
        ,   horiz_blend = (i - sample_i0) * sampleFreq

        for (let j = 0; j < height; j++) {
            let sample_j0 = (j / samplePeriod) * samplePeriod
            ,   sample_j1 = (sample_j0 + samplePeriod) % height
            ,   vert_blend = (j - sample_j0) * sampleFreq
            ,   top = lerp(baseNoise[sample_i0][sample_j0],
                           baseNoise[sample_i1][sample_j1], horiz_blend)
            ,   bottom = lerp(baseNoise[sample_i0][sample_j1],
                               baseNoise[sample_i1][sample_j1], horiz_blend)
            smoothNoise[i][j] = lerp(top, bottom, vert_blend)
        }
    }
    return smoothNoise
}

const generateIsland = (width, height) => {
    island.width = width
    island.height = height
    let i = 0, j = 0
    while (i < width) {
        while (j < height) {
            island.tiles.set([i, j], choose([tiles.WATER, tiles.GRASS]))
            j++
        }
        j = 0
        i++
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
