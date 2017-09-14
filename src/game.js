(function() {
let canvas
,   stage
,   player
,   screen
,   running = true
,   entities = []
const tileWidth = 20, tileHeight = 20
,     tiles = {
    GRASS: 0,
    WATER: 1,
    SAND: 2,
    DEEPWATER: 3,
    FOREST: 4,
    HILLS: 5,
    MOUNTAIN: 6,
    SNOW: 7
}
,     animalStates = {
    GRAZING: 0,
    WANDERING: 1,
    SLEEPING: 2,
    FLEEING: 3,
    AGRESSIVE: 4
}
,     island = {tiles: [], width: 0, height: 0}
,     camera = {x: 0, y: 0, w: 20, h: 20, b: 4} // in tiles

// utilities

const randRange = (min, max) =>
      Math.floor(Math.random() * max) + min

const choose = list =>
      list[randRange(0, list.length)]

const lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

const within = (x1, y1, w, h, x2, y2) =>
      (x1 <= x2 && x2 <= x1 + w) &&
      (y1 <= y2 && y2 <= y1 + h)

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

// world gen

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

    const eruptionFrontier = (x, y, dir, mapW, mapH) =>
          directions[dir].map(
              ([dx, dy]) => {
                  const [nX, nY] = [x + dx, y + dy]
                  return [nX < 0 ? 0 : nX >= mapW ? mapW - 1 : nX,
                          nY < 0 ? 0 : nY >= mapH ? mapH - 1 : nY]
              }
          )

    const smoothHeightMap = (map, octave) => {
        const width = map[0].length
        ,     height = map.length
        ,     smoothMap = emptyArray(width, height)
        ,     samplePeriod = 1 << octave
        ,     sampleFreq = 1 / samplePeriod

        for (let i = 0; i < width; i++) {
            let sample_i0 = (i / samplePeriod) * samplePeriod
            ,   sample_i1 = (sample_i0 + samplePeriod) % width
            ,   h_blend = (i - sample_i0) * sampleFreq

            for (let j = 0; j < height; j++) {
                let sample_j0 = (j / samplePeriod) * samplePeriod
                ,   sample_j1 = (sample_j0 + samplePeriod) % height
                ,   v_blend = (j - sample_j0) * sampleFreq
                ,   top = lerp(
                    map[sample_j0][sample_i0],
                    map[sample_j0][sample_i1],
                    h_blend
                )
                ,   bottom = lerp(
                    map[sample_j1][sample_i0],
                    map[sample_j1][sample_i1],
                    h_blend
                )
                smoothMap[j][i] = lerp(top, bottom, v_blend)
            }
        }
        return smoothMap
    }

    island.width = width
    island.height = height
    island.tiles = emptyArray(width, height, tiles.DEEPWATER)

    const heightMap = emptyArray(width, height, -0.3)
    const [centerX, centerY] = [Math.floor(width / 2),
                                Math.floor(height / 2)]
    const volcanoes = []
    for (let n = 0; n < randRange(6, 8); n++) {
        const [rx, ry] = randPointWithinR(width / 3.5)
        volcanoes.push(Volcano([centerX + rx, centerY + ry],
                               randRange(32, 64)))
    }
    // simulate eruptions / lava!
    for (const {x, y, eruptions} of volcanoes) {
        heightMap[y][x] = 100.0
        for (let n = 0; n < eruptions; n++) {
            let power = Math.random(0.6, 4.0)
            ,   eruptionSite = choose(neighbours(x, y))
            ,   [eruptionX, eruptionY, dir] = eruptionSite

            while (power > 0) {
                heightMap[eruptionY][eruptionX] += power
                const frontier = eruptionFrontier(eruptionX, eruptionY, dir,
                                                  width, height)
                frontier.forEach(([fX, fY]) => heightMap[fY][fX] += 0.2)
                const newFrontier = choose(frontier)
                eruptionX = newFrontier[0]
                eruptionY = newFrontier[1]
                power -= 0.1
            }
        }
    }
    const finalHeightMap = smoothHeightMap(heightMap, 64)

    // convert heightmap to tiles
    for (let j = 0; j < finalHeightMap.length; j++) {
        for (let i = 0; i < finalHeightMap[0].length; i++) {
            const h = finalHeightMap[j][i]
            switch (true) {
            case h > -0.3 && h <= 0:
                island.tiles[j][i] = tiles.WATER
                break;
            case h > 0 && h <= 0.3:
                island.tiles[j][i] = tiles.SAND
                break;
            case h > 0.3 && h <= 2:
                island.tiles[j][i] = tiles.GRASS
                break;
            case h > 2 && h <= 5:
                island.tiles[j][i] = tiles.FOREST
                break;
            case h > 5 && h <= 10:
                island.tiles[j][i] = tiles.HILLS
                break;
            case h > 10 && h <= 15:
                island.tiles[j][i] = tiles.MOUNTAIN
                break;
            case h > 15:
                island.tiles[j][i] = tiles.SNOW
                break;
            }
        }
    }
}

const initializePlayer = () => {
    const sandTiles = []
    for (let i = 0; i < island.width; i++) {
        for (let j = 0; j < island.height; j++) {
            if (island.tiles[j][i] === tiles.SAND)
                sandTiles.push({x: i, y: j})
        }
    }
    const p = choose(sandTiles)
    p.t = [tiles.SAND,
           tiles.GRASS,
           tiles.FOREST,
           tiles.HILLS,
           tiles.MOUNTAIN]
    p.hunger = 0.01
    return p
}

const centerCameraOn = (x, y) => {
    camera.x = Math.floor(x - (camera.w / 2))
    camera.y = Math.floor(y - (camera.h / 2))
    if (camera.x + camera.w > island.width)
        camera.x -= (camera.x + camera.w) - island.width
    if (camera.x < 0)
        camera.x = 0
    if (camera.y < 0)
        camera.y = 0
    if (camera.y + camera.h > island.height)
        camera.y -= (camera.y + camera.h) - island.height
}

const canEnterTile = entity => (x, y) => {
    const tile = island.tiles[y][x]
    return entity.t.includes(tile)
}


// entities

const Sheep = (x, y, state) => ({
    x, y,
    sprite: '\uD83D\uDC11',
    state,
    hunger: 0.1,
    t: [tiles.SAND, tiles.GRASS, tiles.FOREST, tiles.HILLS],
    update: prev => {
        let dx, dy
        const s = Sheep(x, y, prev.state)
        s.hunger = prev.hunger * 1.02
        if (s.hunger > 0.7 && s.state === animalStates.WANDERING) {
            s.state = animalStates.GRAZING
        } else if (s.hunger <= 0.1 && s.state === animalStates.GRAZING) {
            s.state = animalStates.WANDERING
        }
        if (s.state === animalStates.WANDERING) {
            dx = prev.x + choose([-1, 0, 1])
            dy = prev.y + choose([-1, 0, 1])
        } else if (s.state === animalStates.GRAZING) {
            const ns = neighbours(prev.x, prev.y)
                  .map(([x, y]) => [x, y, island.tiles[y][x]])
                  .filter(t => t[2] === tiles.GRASS)
            if (ns.length > 0) {
                const dir = choose(ns)
                dx = dir[0]
                dy = dir[1]
            } else {
                dx = prev.x + choose([-1, 0, 1])
                dy = prev.y + choose([-1, 0, 1])
            }
        }
        if (canEnterTile(s)(dx, dy)) {
            s.x = dx
            s.y = dy
            if (island.tiles[dy][dx] === tiles.GRASS &&
                s.state === animalStates.GRAZING)
                s.hunger -= 0.1
        }
        return s
    }
})

// event handling

document.addEventListener('keydown', ev => {
    const canPlayerEnterTile = canEnterTile(player)
    switch (ev.key) {
    case 'w':
        if (player.y > 0)
            if (canPlayerEnterTile(player.x, player.y - 1))
                player.y -= 1
        break;
    case 'q':
        if (player.y > 0 && player.x > 0)
            if (canPlayerEnterTile(player.x - 1, player.y - 1)) {
                player.x--;
                player.y--;
            }
        break;
    case 's':
        if (player.y < island.height - 1)
            if (canPlayerEnterTile(player.x, player.y + 1))
                player.y += 1
        break;
    case 'e':
        if (player.y > 0 && player.x < island.width)
            if (canPlayerEnterTile(player.x + 1, player.y - 1)) {
                player.x++;
                player.y--;
            }
        break;
    case 'a':
        if (player.x > 0)
            if (canPlayerEnterTile(player.x - 1, player.y))
                player.x -= 1
        break;
    case 'd':
        if (player.x < island.width - 1)
            if (canPlayerEnterTile(player.x + 1, player.y))
                player.x += 1
        break;
    case 'z':
        if (player.x > 0 && player.y < island.height - 1)
            if (canPlayerEnterTile(player.x - 1, player.y + 1)) {
                player.x--;
                player.y++;
            }
        break;
    case 'c':
        if (player.x < island.width - 1 && player.y < island.height - 1) {
            if (canPlayerEnterTile(player.x + 1, player.y + 1)) {
                player.x++;
                player.y++;
            }
        }
        break;
    }
    if (player.y < (camera.y + camera.b) && camera.y > 0)
        camera.y--;
    if (player.y > (camera.y + camera.h) - camera.b - 1 && camera.y + camera.h < island.height)
        camera.y++;
    if (player.x < (camera.x + camera.b) && camera.x > 0)
        camera.x--;
    if (player.x > (camera.x + camera.w) - camera.b - 1 && camera.x + camera.w < island.width)
        camera.x++;
    if (['w', 'q', 'e', 's', 'a', 'd', 'z', 'c'].includes(ev.key)) {
        entities = entities.map(e => e.update(e))
        ev.preventDefault()
    }
})

// rendering

const renderIsland = (screenX, screenY) => {
    for (let i = 0; i < camera.w; i++) {
        for (let j = 0; j < camera.h; j++) {
            const tile = island.tiles[j + camera.y][i + camera.x]
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
            case tiles.HILLS:
                stage.fillStyle = 'grey'
                break;
            case tiles.MOUNTAIN:
                stage.fillStyle = 'darkgrey'
                break;
            case tiles.SNOW:
                stage.fillStyle = 'Azure'
            }
            stage.fillRect((i * tileWidth) + screenX,
                           (j * tileHeight) + screenY,
                           tileWidth, tileHeight)
        }
    }
}

// widgets

const GameWindow = (x, y) => ({
    x,
    y,
    render: () => {
        renderIsland(x, y)
        stage.font = '16px serif'
        stage.fillText('\uD83E\uDD13',
                       (player.x - camera.x) * tileWidth + x,
                       ((player.y - camera.y) * tileHeight + y) + 17)
        for (const entity of entities) {
            if (within(camera.x, camera.y,
                       camera.w - 1, camera.h - 1,
                       entity.x, entity.y))
                stage.fillText(entity.sprite,
                               (entity.x - camera.x) * tileWidth + x,
                               ((entity.y - camera.y) * tileHeight + y) + 17)
        }
    }
})

const StatsFrame = (x, y, w, h) => ({
    x, y, w, h,
    render: () => {
        stage.font = '16px serif'
        stage.strokeStyle = '#fff'
        stage.fillStyle = '#fff'
        stage.strokeRect(x, y, w, h)
        stage.fillText(`X: ${player.x}, Y: ${player.y}`,
                       x + 10, y + 26)
    }
})

const MessageBox = (x, y, w, h, label, text,
                    borderColor = '#fff', bgColor = '#000') => ({
    x, y, w, h, label, text,
    render: () => {
        stage.font = '16px serif'
        stage.strokeStyle = borderColor
        stage.lineWidth = 2
        stage.strokeRect(x, y, w, h)
        stage.fillStyle = bgColor
        stage.fillRect(x, y, w, h)
        stage.fillStyle = '#fff'
        stage.fillText(label, x + 15, y + 16)
        stage.lineWidth = 1
    }
})

// screens

const Screen = (...widgets) => ({
    widgets
})

const GameScreen = Screen(
    GameWindow(20, 20),
    StatsFrame(40 + camera.w * tileWidth,
               20, 200, camera.h * tileHeight)
)

// game
const initialize = () => {
    canvas = document.getElementById('stage')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    stage = canvas.getContext('2d')
    generateIsland(80, 80)
    player = initializePlayer()
    centerCameraOn(player.x, player.y)
    const grassTiles = []
    for (let i = 0; i < island.tiles[0].length; i++) {
        for (let j = 0; j < island.tiles.length; j++) {
            if (island.tiles[j][i] === tiles.GRASS)
                grassTiles.push([i, j])
        }
    }
    let numSheep = 0
    switch (true) {
    case grassTiles.length < 10:
        numSheep = 3
        break;
    case grassTiles.length < 20:
        numSheep = 4
        break;
    case grassTiles.length < 25:
        numSheep = 5
        break;
    case grassTiles.length > 25:
        numSheep = 7
        break;
    }
    for (let i = 0; i < numSheep; i++) {
        const [x, y] = choose(grassTiles)
        entities.push(Sheep(x, y, animalStates.WANDERING))
    }
    screen = GameScreen
}

const update = dt => {
}

const render = () => {
    stage.fillStyle = '#000'
    stage.fillRect(0, 0, window.innerWidth, window.innerHeight)
    screen.widgets.forEach(w => w.render())
}

// main
initialize()
let lastFrame = +new Date
const loop = now => {
    if (running) {
        window.requestAnimationFrame(loop, now)
        let dt = now - lastFrame
        if (dt < 160) {
            update(dt)
        }
        render()
        lastFrame = now
    }
}
loop(lastFrame)
})()
