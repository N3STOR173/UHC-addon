import { world, GameMode, ItemStack, system } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
let corner = { x: 0, z: 0 };
let middle = { x: 0, z: 0 };
let players;
export let teams = [];
//selecciona la esquina desde la que se va a empezar
function firstCorner(size) {
    let random = Math.random() * 10;
    if (random < 5) {
        corner.x = size - 50;
    }
    else
        corner.x = -size + 50;
    random = Math.random() * 10;
    if (random < 5)
        corner.z = size - 50;
    else
        corner.z = -size + 50;
}
//le da el siguiente valor a la esquina
function nextCorner() {
    if (corner.x == corner.z)
        corner.z *= -1;
    else
        corner.x *= -1;
}
//selecciona el centro desde el que se va a empezar
function firstMiddle(size) {
    middle.x = 0;
    middle.z = 0;
    let aux;
    let random = Math.random() * 10;
    if (random < 5)
        aux = size - 50;
    else
        aux = -size + 50;
    if (random < 5)
        middle.x = aux;
    else
        middle.z = aux;
}
//le da el siguiente valor al centro
function nextMiddle() {
    let aux = middle.x;
    middle.x = middle.z;
    middle.z = -aux;
}
//teletransporta al jugador a esas coordenas en la primera coordenada y que no sea aire
function teleportPlayer(player, x, z, playersSpawnPoint) {
    let effects = player.getEffects();
    for (let effect of effects) {
        player.removeEffect(effect.typeId);
    }
    player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.InstantHealth, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.Saturation, 160, { amplifier: 255, showParticles: false });
    player.runCommand("clear @s");
    player.teleport({ x: x, y: 320, z: z }, { dimension: world.getDimension("overworld") });
    player.setGameMode(GameMode.survival);
    playersSpawnPoint.set(player.nameTag, { x: x, z: z }); //guarda el spawn del jugador
    const id = system.runInterval(() => {
        var _a;
        if (((_a = world.getDimension("overworld").getBlock({ x, y: 62, z })) === null || _a === void 0 ? void 0 : _a.typeId) === "minecraft:water") {
            const inventoryComp = player.getComponent("inventory");
            inventoryComp.container.addItem(new ItemStack("minecraft:oak_boat", 1));
        }
        system.clearRun(id);
    }, 160);
}
//establece los equipos que han decidido los jugadores
function makeGroupsManual(teamsAux) {
    shuffleArray(teamsAux);
    teams = [];
    for (let set of teamsAux) {
        let aux = [];
        for (let p of set) {
            aux.push(p);
        }
        teams.push(aux);
    }
}
//mezcla el array de jugadores para que sea aleatorio el lugar de aparicion con respecto al resto
function shuffleArray(groups) {
    for (let i = groups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Índice aleatorio entre 0 y i
        // Intercambiar los elementos
        let aux = groups[i];
        groups[i] = groups[j];
        groups[j] = aux;
    }
}
//avisa si el formato de los grupos es correcto o no
function askFormat(groupSize) {
    if (players.length < groupSize || groupSize < 1) { //primera excepcion
        world.sendMessage("El número de jugadores por equipo no es correcto");
        world.sendMessage("El mínimo de jugadores por equipo es 0 y el máximo " + players.length);
        return false;
    }
    if (players.length / groupSize > 8) { //segunda excepcion
        world.sendMessage("El máximo numero de equipos es 8");
        world.sendMessage("Aumenta el numero de miembros por equipo");
        return false;
    }
    return true;
}
//forma los equipos aleatoriamente en base al numero de equipos
function makeGroupsRandomChooseTeams(nTeams, little, nLittle) {
    shuffleArray(players); //mezcla y por tanto randomiza los grupos
    let player = 0;
    teams = [];
    for (let i = 0; i < nLittle; i++) { //genera los grupos pequeños
        teams.push([]);
        for (let j = 0; j < little; j++) {
            teams[i].push(players[player]);
            player++;
        }
    }
    for (let i = nLittle; i < nTeams; i++) { //genera los grupos grandes
        teams.push([]);
        for (let j = 0; j < (little + 1); j++) {
            teams[i].push(players[player]);
            player++;
        }
    }
}
//forma los equipos aleatoriamente en base al numero de jugadores por equipo
function makeGroupsRandomChoosePlayers(groupSize) {
    //excepcion cuando hay que generar mas de 8 puntos de spawn
    if (askFormat(groupSize)) {
        shuffleArray(players); //mezcla y por tanto randomiza los grupos
        //relleno el array de grupos con un jugador en cada equipo
        let contador = 0;
        let i = 0;
        teams = [];
        teams.push([]);
        for (let p of players) {
            if (contador == groupSize) {
                teams.push([p]);
                contador = 1;
                i += 1;
            }
            else {
                teams[i].push(p);
                contador += 1;
            }
        }
    }
}
////////////////////////////////////////////////////////////////
export function spreadPlayers(size) {
    let playersSpawnPoint = new Map();
    firstCorner(size); //selecciona la primera esquina
    firstMiddle(size); //selecciona el primer centro
    world.setTimeOfDay(0);
    if (teams.length == 2) {
        for (let p of teams[0])
            teleportPlayer(p, corner.x, corner.z, playersSpawnPoint);
        nextCorner();
        nextCorner();
        for (let p of teams[1])
            teleportPlayer(p, corner.x, corner.z, playersSpawnPoint);
    }
    else {
        for (let i = 0; i < teams.length && i < 4; i++) {
            for (let p of teams[i])
                teleportPlayer(p, corner.x, corner.z, playersSpawnPoint);
            nextCorner();
        }
    }
    if (teams.length == 6) {
        for (let p of teams[4])
            teleportPlayer(p, middle.x, middle.z, playersSpawnPoint);
        nextMiddle();
        nextMiddle();
        for (let p of teams[5])
            teleportPlayer(p, middle.x, middle.z, playersSpawnPoint);
    }
    else if (teams.length > 4) {
        for (let i = 4; i < teams.length; i++) {
            for (let p of teams[i])
                teleportPlayer(p, middle.x, middle.z, playersSpawnPoint);
            nextMiddle();
        }
    }
    return playersSpawnPoint;
}
export function startRanDomChoosePlayers(params) {
    let miembrosEquipo = params[0];
    makeGroupsRandomChoosePlayers(miembrosEquipo);
}
export function startRandomChooseTeams(params) {
    let teams = params[0];
    let little = params[1];
    let nLittle = params[2];
    makeGroupsRandomChooseTeams(teams, little, nLittle);
}
export function startManual(params) {
    makeGroupsManual(params[0]);
}
;
////////////////////////////////////////////////////////////////
export function setPlayers() {
    players = world.getAllPlayers();
}
//# sourceMappingURL=teamsLogic.js.map