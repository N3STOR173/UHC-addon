/*

cd C:\Users\nesto\OneDrive\Documentos\3 Libreria\minecraft\mods\UHC-addon
npm run local-deploy -- --watch

M0r1sh1ma4563w

Dynamic properties main.ts:
start: boolean
initialized: boolean
final: boolean

Dynamic properties timeLogic.ts:
end: number

Dynamic properties extraLivesLogic.ts:
lives:<nombre del jugador>: number

Dynamic properties timeLogic.ts:
actionbar:<nombre del jugador>: number
*/
import { world, system, GameMode } from "@minecraft/server";
import { processPlayer } from "./wallLogic";
import { startRanDomChoosePlayers, startRandomChooseTeams, setPlayers, spreadPlayers, startManual } from "./teamsLogic";
import { startWindow } from "./teamsWindows";
import { mainMenu, teamsFormed } from "./mainMenuWindows";
import { initialize, processPlayerDie, processPlayerSpawn, setExtraHealthBars } from "./extraLivesLogic";
import { finalMessages, initializeTime, initialMessageLogic } from "./timeLogic";
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
//llamada inicial
system.run(initializeWorld);
//funcion para inicializar el mundo
function initializeWorld() {
    if (!world.getDynamicProperty("initialized")) {
        world.setDynamicProperty("initialized", true);
        world.setDynamicProperty("final", false);
        world.gameRules.keepInventory = true;
        world.gameRules.naturalRegeneration = false;
        world.gameRules.showCoordinates = true;
        world.gameRules.doImmediateRespawn = true;
        world.getDimension("overworld").runCommand("/gamerule locatorbar false");
        world.getDimension("overworld").runCommand("/scoreboard objectives add vida dummy §c❤");
        world.getDimension("overworld").runCommand("/scoreboard objectives setdisplay list vida");
        world.getDimension("overworld").runCommand("/scoreboard objectives setdisplay belowname vida");
    }
}
//bucle principal
system.runInterval(() => {
    //siempre, se actualiza la vida de los jugadores
    let players = world.getAllPlayers();
    for (let p of players) {
        let x = Math.floor(p.getComponent("health").currentValue);
        p.runCommand("scoreboard players set @s vida " + x);
    }
    //si la partida ha empezado
    if (world.getDynamicProperty("start")) {
        //construccion del muro
        for (let p of players) {
            if (p.dimension == world.getDimension("overworld"))
                processPlayer(p);
        }
        if (!world.getDynamicProperty("final")) {
            //una sola llamada a timemessages dandoles el array de los jugadores con la actionbar ocupada
            world.setDynamicProperty("final", initialMessageLogic(size, FINALSIZE));
            //se llega al final de la partida
            if (world.getDynamicProperty("final")) {
                size = FINALSIZE;
                for (let p of players) {
                    setExtraHealthBars(FINALSIZE, p);
                    world.getAllPlayers().forEach(player => {
                        if (player.dimension == world.getDimension("nether")) {
                            let x = Math.floor(player.location.x * 8);
                            let z = Math.floor(player.location.z * 8);
                            player.teleport({ x: x, y: 320, z: z }, { dimension: world.getDimension("overworld") });
                            player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
                        }
                    });
                    processPlayer(p);
                }
            }
        }
        //al final de la partida
        else {
            finalMessages();
        }
    }
}, FRECUENCY);
//==========================================================================================================================
//actionListener de los eventos de muerte
world.afterEvents.entityDie.subscribe((event) => {
    //blockPvp(event.deadEntity as Player);
    if (event.deadEntity.typeId != "minecraft:player" || !world.getDynamicProperty("start"))
        return;
    processPlayerDie(event);
});
//actionListener de los eventos de spawn
world.afterEvents.playerSpawn.subscribe((event) => {
    if (!world.getDynamicProperty("start")) {
        if (event.initialSpawn) {
            event.player.runCommand("/give @s uhc:start");
            event.player.runCommand("/effect @s resistance infinite 255 true");
            event.player.setGameMode(GameMode.adventure);
        }
        return;
    }
    processPlayerSpawn(event);
});
//actionListener de los items usados
world.afterEvents.itemUse.subscribe((eventData) => {
    const player = eventData.source;
    const item = eventData.itemStack;
    if (item.typeId == "uhc:start") {
        if (!world.getDynamicProperty("start")) {
            mainMenu(player);
        }
        else {
            player.sendMessage("La partida ya ha comenzado");
        }
    }
});
//actionListener de los eventos de los scripts (debug)
system.afterEvents.scriptEventReceive.subscribe((event) => {
    world.sendMessage("ha llegado el evento " + event.id);
    world.sendMessage(" ");
    let params = event.message.split(" ");
    switch (event.id) {
        case "uhc:restart":
            world.setDynamicProperty("start", false);
            break;
        case "uhc:start":
            startMessage();
            break;
        case "uhc:ids":
            world.getDynamicPropertyIds().forEach(id => {
                world.sendMessage("Dynamic property: " + id + " = " + world.getDynamicProperty(id));
            });
            break;
    }
});
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
            //jugadores
            case "setPlayers":
                setPlayers();
                break;
            //evento para comenzar la partida (mainMenuWindows)
            case "confirm":
                yield startMessage();
                spawnPoints = spreadPlayers(size); //teamsLogic.ts
                initialize(params, spawnPoints); //extraLivesLogic.ts
                initializeTime(params); //timeLogic.ts
                world.getAllPlayers().forEach(player => {
                    world.setDynamicProperty("actionbar:" + player.nameTag, 0);
                });
                world.getDimension("overworld").runCommand("/execute as @a at @s run playsound random.orb @s ~ ~ ~ ");
                world.setDynamicProperty("start", true);
                size = 1500;
                world.setDynamicProperty("final", false);
                break;
            //eventos para gestionar los mensajes de la actionbar
            case "actionBarActive":
                world.setDynamicProperty("actionbar:" + params[0].nameTag, world.getDynamicProperty("actionbar:" + params[0].nameTag) - 1);
                break;
            case "actionBarDisactive":
                world.setDynamicProperty("actionbar:" + params[0].nameTag, world.getDynamicProperty("actionbar:" + params[0].nameTag) + 1);
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