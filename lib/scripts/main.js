/*

cd C:\Users\nesto\OneDrive\Documentos\3 Libreria\minecraft\mods\UHC-addon
npm run local-deploy -- --watch

M0r1sh1ma4563w

*/
import { world, system } from "@minecraft/server";
import { processPlayer } from "./wallLogic";
import { startRanDomChoosePlayers, startRandomChooseTeams, setPlayers, createFakePlayers, spreadPlayers, startManual } from "./teamsLogic";
import { startWindow } from "./teamsWindows";
import { mainMenu, teamsFormed } from "./mainMenuWindows";
import { initialize, processPlayerDie, processPlayerSpawn, setExtraHealthBars } from "./extraLivesLogic";
import { timeMessage, setTime } from "./timeLogic";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
//Configuracion del muro:
//==========================================================================================================================
export let size = 1500; //distancia a la que se hace el muro
const FINALSIZE = 150; //distancia a la que se hace el muro al final de la partida
export const HEIGHT = 200; //altura del muro (hata la coordenada y que llega)
export const STARTHEIGHT = -63; //altura desde la que empieza a hacer el muro
export const DIST = 100; //distancia a la que tiene que estar el jugador para que se haga el muro
export const BUILDDIST = 50; //distancia desde la del jugador a la que se empieza a hacer el muro
export const BLOCKTYPE = "minecraft:barrier"; //material del muro
const FRECUENCY = 20; //frecuencia con la que se comprueba si hay que hacer el muro
//==========================================================================================================================
//Variables de control:
//==========================================================================================================================
let start = false; //marca si ha empezado la partida o no
let final = false; //marca si se ha llegado al final de la partida o no
let actionbarPlayers = new Map(); //los jugadores que se les quiere enviar otro mensaje por la actionbar
//==========================================================================================================================
//llamada inicial
system.run(startFunction);
system.run(gameTick);
//funcion para inicializar el mundo
function startFunction() {
    world.gameRules.keepInventory = true;
    world.gameRules.naturalRegeneration = false;
    world.getAllPlayers().forEach(player => {
        actionbarPlayers.set(player, 0);
    });
}
//bucle principal
function gameTick() {
    if (system.currentTick % FRECUENCY === 0) {
        let players = world.getAllPlayers();
        for (let p of players) {
            let x = Math.floor(p.getComponent("health").currentValue);
            p.runCommand("scoreboard players set @s vida " + x);
        }
        if (start) {
            //construccion del muro
            for (let p of players) {
                if (p.dimension == world.getDimension("overworld"))
                    processPlayer(p);
            }
            system.runInterval;
            //mensajes de tiempo
            if (!final) {
                //para mostrar solo el mensaje de tiempo a los que no se les esté mostrando otro mensaje
                let playersArray = new Set(world.getAllPlayers());
                let netherPlayers = new Set();
                actionbarPlayers.forEach((value, key) => {
                    if (value != 0)
                        playersArray.delete(key);
                    else if (key.dimension == world.getDimension("nether")) {
                        playersArray.delete(key);
                        netherPlayers.add(key);
                    }
                });
                final = timeMessage(size, FINALSIZE, playersArray, netherPlayers);
                //se llega al final de la partida
                if (final) {
                    size = FINALSIZE;
                    for (let p of players) {
                        setExtraHealthBars(FINALSIZE, p);
                        netherPlayers.forEach((player) => {
                            let x = Math.floor(player.location.x * 8);
                            let z = Math.floor(player.location.z * 8);
                            player.teleport({ x: x, y: 320, z: z }, { dimension: world.getDimension("overworld") });
                            player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
                        });
                        processPlayer(p);
                    }
                }
            }
        }
        //comprobacion de victoria
        /*let aux = 0;
        let ganador;
        for (let p of players) {
          if (p.getGameMode() == GameMode.survival) {
            aux++;
            ganador = p.nameTag;
          }
        }
        if (aux == 1) {
          players[0].runCommand("/title @a title ¡" + ganador + " ha ganado!");
          start = false;
        }
        else if (aux == 0) {
          players[0].runCommand("/title @a title ¡Empate!");
          start = false;
        }*/
    }
    system.run(gameTick);
}
//==========================================================================================================================
//actionListener de los eventos de muerte
world.afterEvents.entityDie.subscribe((event) => {
    //blockPvp(event.deadEntity as Player);
    if (event.deadEntity.typeId != "minecraft:player" || !start)
        return;
    processPlayerDie(event);
});
//actionListener de los eventos de spawn
world.afterEvents.playerSpawn.subscribe((event) => {
    if (!start)
        return;
    processPlayerSpawn(event);
});
//actionListener de los items usados
world.afterEvents.itemUse.subscribe((eventData) => {
    const player = eventData.source;
    const item = eventData.itemStack;
    if (item.typeId == "uhc:start") {
        mainMenu(player);
    }
});
//actionListener de los eventos de los scripts (desuso)
system.afterEvents.scriptEventReceive.subscribe((event) => {
    world.sendMessage("ha llegado el evento " + event.id);
    world.sendMessage(" ");
    let params = event.message.split(" ");
    switch (event.id) {
        case "uhc:start":
            startMessage();
            break;
    }
});
//comentada la anterior version
/*
world.afterEvents.itemUse.subscribe((eventData) => {
  const player = eventData.source;
  const item = eventData.itemStack;
  if (item.typeId == "uhc:start") {
    startWindow(player);
  }

  if (item.typeId == "uhc:debug") {
    debugSelectionWindow(player);
  }
})
*/
//==========================================================================================================================
//controlador de eventos llamados desde mainMenuWindows y uno desde teamsWindows
//conecta las ventanas con la ventana de de seleccion de equipos
export function windowController(event, params) {
    switch (event) {
        case "startWindow":
            startWindow(params[0]);
            break;
        //Avisa que se formaron los equipos (teamsWindows)
        case "teamsFormed":
            teamsFormed();
            break;
    }
}
//controlador de eventos llamados desde teamWindows y uno desde mainMenuWindows
//conecta las ventanas con la logica de seleccion de equipos
export function controller(event, params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let spawnPoints;
        switch (event) {
            //eventos que forman los equipos
            case "randomChooseTeams":
                startRandomChooseTeams(params);
                break;
            case "randomChoosePlayers":
                startRanDomChoosePlayers(params);
                break;
            case "manualChooseTeams":
                startManual(params);
                break;
            //jugadores o jugadores falsos para debug
            case "createFakePlayers":
                createFakePlayers(params);
                break;
            case "setPlayers":
                setPlayers();
                break;
            //evento para comenzar la partida (mainMenuWindows)
            case "confirm":
                yield startMessage();
                const startTime = system.currentTick - (system.currentTick % 20);
                const endTime = startTime + (params[1] * 60 * 20);
                start = true;
                startFunction();
                spawnPoints = spreadPlayers(size);
                initialize(params[0], spawnPoints, params[2]);
                setTime(startTime, endTime);
                break;
            //eventos para gestionar los mensajes de la actionbar
            case "actionBarActive":
                actionbarPlayers.set(params[0], ((_a = actionbarPlayers.get(params[0])) !== null && _a !== void 0 ? _a : 0) - 1);
                break;
            case "actionBarDisactive":
                actionbarPlayers.set(params[0], ((_b = actionbarPlayers.get(params[0])) !== null && _b !== void 0 ? _b : 0) + 1);
                break;
            //para comprobar errores
            default:
                console.log("No se ha encontrado el evento " + event);
                break;
        }
    });
}
function startMessage() {
    return new Promise(resolve => {
        let tiempoRestante = 10;
        let id = system.runInterval(() => {
            if (tiempoRestante <= 0) {
                world.getDimension("overworld").runCommand("/title @a title YA!");
                world.getDimension("overworld").runCommand("/execute as @a at @s run playsound random.orb @s ~ ~ ~ ");
                system.clearRun(id);
                resolve();
                return;
            }
            else {
                world.getDimension("overworld").runCommand("/execute as @a at @s run playsound note.bell @s ~ ~ ~ ");
                world.getDimension("overworld").runCommand("/title @a title " + tiempoRestante);
                tiempoRestante--;
            }
        }, 20);
    });
}
//# sourceMappingURL=main.js.map