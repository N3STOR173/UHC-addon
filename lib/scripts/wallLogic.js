import { world, BlockPermutation } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { size, HEIGHT, STARTHEIGHT, DIST, BUILDDIST, BLOCKTYPE } from "./main";
//Funcion para construir un muro en los dos ejes
//===============================================================================================================
/*
size: distancia a la que se hace el muro
high: altura del muro
startHight: altura desde la que empieza a hacer el muro
buildDist: distancia desde la del jugador a la que se empieza a hacer el muro
sign: signo del muro (1 o -1)
axis: eje en el que se hace el muro (X o Z)
block: material del muro
stableCord: coordenada que se mantiene constante (1000 o -1000)
variableCord: coordenada que va variando (entre -1000 y 1000)
*/
//===============================================================================================================
function buildWall(size, height, startHight, buildDist, axis, block, stableCord, variableCord) {
    var _a, _b, _c, _d;
    const dimension = world.getDimension("overworld");
    //distancia desde la del jugador a la que se empieza a hacer el muro
    let variableMin = variableCord - buildDist;
    let variableMax = variableCord + buildDist;
    if (variableMin < -size)
        variableMin = -size;
    if (variableMax > size)
        variableMax = size;
    /*
    Se mira si estamos construyendo un muro X o Z
    Se comprueba desde el rango que se calcula justo antes si faltan secciones verticales del muro
    Si faltan se rellenan
    */
    if (axis === "X") {
        for (let z = variableMin; z < variableMax + 1; z++) {
            if (((_a = dimension.getBlock({ x: stableCord, y: height - 1, z })) === null || _a === void 0 ? void 0 : _a.typeId) !== block) {
                for (let y = startHight; y < height; y++) {
                    (_b = dimension.getBlock({ x: stableCord, y, z })) === null || _b === void 0 ? void 0 : _b.setPermutation(BlockPermutation.resolve(block));
                }
            }
        }
    }
    else if (axis === "Z") {
        for (let x = variableMin; x < variableMax + 1; x++) {
            if (((_c = dimension.getBlock({ x, y: height - 1, z: stableCord })) === null || _c === void 0 ? void 0 : _c.typeId) !== block) {
                for (let y = startHight; y < height; y++) {
                    (_d = dimension.getBlock({ x, y, z: stableCord })) === null || _d === void 0 ? void 0 : _d.setPermutation(BlockPermutation.resolve(block));
                }
            }
        }
    }
}
function teleportPlayer(p, x, z, size) {
    let procede = false;
    //proceso la X
    if (x > size - 1) {
        x = size - 50;
        procede = true;
    }
    else if (x < -size + 1) {
        x = -size + 50;
        procede = true;
    }
    //proceso la Z
    if (z > size - 1) {
        z = size - 50;
        procede = true;
    }
    else if (z < -size + 1) {
        z = -size + 50;
        procede = true;
    }
    //si ha habido un cambio se teletransporta
    if (procede) {
        x = Math.floor(x);
        z = Math.floor(z);
        p.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
        p.teleport({ x: x, y: 320, z: z });
    }
}
export function processPlayer(p) {
    let location = p.location;
    let x = Math.floor(location.x);
    let z = Math.floor(location.z);
    //se empieza a hacer el muro positivo de x
    if (x > size - DIST) {
        buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "X", BLOCKTYPE, size, z);
    }
    //se empieza a hacer el muro negativo de x
    if (x < -size + DIST) {
        buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "X", BLOCKTYPE, -size, z);
    }
    //se empieza a hacer el muro positivo de z
    if (z > size - DIST) {
        buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "Z", BLOCKTYPE, size, x);
    }
    //se empieza a hacer el muro negativo de z
    if (z < -size + DIST) {
        buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "Z", BLOCKTYPE, -size, x);
    }
    //Se comprueba por si acaso si el jugador esta fuera del muro
    teleportPlayer(p, x, z, size);
}
//# sourceMappingURL=wallLogic.js.map