import { system, world } from "@minecraft/server";
const FRECUENCY = 3; //en minutos
const DURATION = 3; //en segundos
let locatorBar = false;
let locatorBarMinutos = FRECUENCY - 1;
let locatorBarSegundos = 59;
//separa los jugadores del overworld y del nether
//ademas de eliminar los jugadores que tienen la actionbar ocupada
export function initialMessageLogic(size, finalSize) {
    let playersArray = new Set(world.getAllPlayers());
    let netherPlayers = new Set();
    world.getAllPlayers().forEach(player => {
        let value = world.getDynamicProperty("actionbar:" + player.nameTag);
        if (value != 0)
            playersArray.delete(player);
        else if (player.dimension == world.getDimension("nether")) {
            playersArray.delete(player);
            netherPlayers.add(player);
        }
    });
    return actionBarMessages(size, finalSize, playersArray, netherPlayers);
}
function actionBarMessages(SIZE, finalSize, players, netherPlayers) {
    const currentTime = system.currentTick;
    /////////////////////////aviso 20 minutos//////////////////////////////////
    if (Math.floor((world.getDynamicProperty("end") - currentTime) / 20 + 1) == 20 * 60) {
        world.sendMessage("Quedan 20 minutos, recordad estar al final de la partida en el centro del mapa");
    }
    /////////////////////////fin de la partida/////////////////////////////////
    if (currentTime >= world.getDynamicProperty("end")) {
        for (let p of players) {
            world.sendMessage("Se ha acabado el tiempo");
        }
        for (let p of netherPlayers) {
            world.sendMessage("Se ha acabado el tiempo");
        }
        return true;
    }
    /////////////////////////aviso distancia al centro/////////////////////////
    else if (Math.floor((world.getDynamicProperty("end") - currentTime) / 20 / 60 + 1) < 21) {
        players.forEach(p => {
            p.runCommand("/title @s actionbar " + timeMessage() + " | " + distMessage(p, finalSize));
        });
        netherPlayers.forEach(p => {
            let aux = timeMessage() + " | " + distMessage(p, Math.floor(finalSize / 8));
            if (Math.abs(p.location.x) * 8 > SIZE || Math.abs(p.location.z) * 8 > SIZE)
                aux += " | Fuera del mapa";
            p.runCommand("/title @s actionbar " + aux);
        });
    }
    /////////////////////////aviso de tiempo restante//////////////////////////
    else {
        for (let p of players) {
            p.runCommand("/title @s actionbar " + timeMessage());
        }
        for (let p of netherPlayers) {
            if (Math.abs(p.location.x) * 8 > SIZE || Math.abs(p.location.z) * 8 > SIZE) {
                p.runCommand("/title @s actionbar " + timeMessage()
                    + " | Fuera del mapa");
            }
            else {
                p.runCommand("/title @s actionbar " + timeMessage());
            }
        }
    }
    return false;
}
//mensajes en la batalla final y logica de la locator bar
export function finalMessages() {
    let currentTime = Math.floor(system.currentTick - world.getDynamicProperty("end"));
    let minutos = Math.floor(currentTime / 20 / 60);
    let segundos = Math.floor((currentTime / 20) % 60);
    for (let p of world.getAllPlayers()) {
        if (locatorBar) {
            p.runCommand("/title @s actionbar Tiempo: " + adjustTimeFormat(minutos, segundos)
                + " | Locator Bar: " + adjustTimeFormat(locatorBarMinutos, locatorBarSegundos));
        }
        else {
            p.runCommand("/title @s actionbar Tiempo: " + adjustTimeFormat(minutos, segundos)
                + " | Locator Bar: " + adjustTimeFormat(locatorBarMinutos, locatorBarSegundos));
        }
    }
    locatorBarSegundos -= 1;
    if (locatorBar && locatorBarSegundos < 0) {
        world.sendMessage("Locator Bar desactivada");
        world.getDimension("overworld").runCommand("/gamerule locatorbar false");
        locatorBarMinutos = FRECUENCY;
        locatorBarSegundos = 0;
        locatorBar = false;
    }
    else if (locatorBarMinutos == 0 && locatorBarSegundos < 0) {
        world.sendMessage("Locator Bar activada");
        world.getDimension("overworld").runCommand("/gamerule locatorbar true");
        locatorBarSegundos = DURATION;
        locatorBar = true;
    }
    else if (locatorBarSegundos < 0) {
        locatorBarSegundos = 59;
        locatorBarMinutos -= 1;
    }
}
export function initializeTime(params) {
    const startTime = system.currentTick - (system.currentTick % 20);
    const endTime = startTime + (params[1] * 60 * 20);
    world.setDynamicProperty("end", endTime);
    locatorBarMinutos = FRECUENCY - 1;
    locatorBarSegundos = 59;
}
function distMessage(p, size) {
    let res = "";
    let auxX;
    let auxZ;
    if (p.location.x < 0)
        auxX = 2;
    else
        auxX = 1;
    if (p.location.z < 0)
        auxZ = 2;
    else
        auxZ = 1;
    let distx = Math.floor(Math.abs(p.location.x)) - size + auxX;
    let distz = Math.floor(Math.abs(p.location.z)) - size + auxZ;
    if (distx > 0 && distz > 0) { //calculo de la diagonal
        res = "Distancia: " + Math.floor(Math.sqrt(distx * distx + distz * distz)) + " b";
    }
    else if (distx > 0) { //calculo distancia x
        res = "Distancia : " + distx + " b";
    }
    else if (distz > 0) { //calculo distancia z
        res = "Distancia: " + distz + " b";
    }
    else {
        res = "Dentro de la zona";
    }
    return res;
}
function timeMessage() {
    let currentTime = system.currentTick;
    let minutos = Math.floor((world.getDynamicProperty("end") - currentTime) / 1200);
    let segundos = Math.floor((world.getDynamicProperty("end") - currentTime) / 20 % 60);
    return "Tiempo: " + adjustTimeFormat(minutos, segundos);
}
function adjustTimeFormat(minutos, segundos) {
    if (minutos < 1)
        return (segundos + " s");
    else
        return (minutos + " m " + segundos + " s");
}
//# sourceMappingURL=timeLogic.js.map