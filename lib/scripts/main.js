/*

cd C:\Users\nesto\OneDrive\Documentos\3 Libreria\minecraft\mods\prueba_TypeScript
npm run local-deploy -- --watch

M0r1sh1ma4563w

*/
import { world, system } from "@minecraft/server";
import { processPlayer } from "./wallLogic";
import { startRanDomChoosePlayers, startRandomChooseTeams, setPlayers, createFakePlayers, spreadPlayers, startManual } from "./teamsLogic";
import { startWindow } from "./teamsWindows";
import { mainMenu, teamsFormed } from "./mainMenuWindows";
import { initialize, setLives, processPlayerDie, processPlayerSpawn } from "./extraLivesLogic";
//Configuracion del muro:
//==========================================================================================================================
export let SIZE = 150; //distancia a la que se hace el muro
export const HEIGHT = 200; //altura del muro (hata la coordenada y que llega)
export const STARTHEIGHT = -63; //altura desde la que empieza a hacer el muro
export const DIST = 100; //distancia a la que tiene que estar el jugador para que se haga el muro
export const BUILDDIST = 50; //distancia desde la del jugador a la que se empieza a hacer el muro
export const BLOCKTYPE = "minecraft:barrier"; //material del muro
const FRECUENCY = 20; //frecuencia con la que se comprueba si hay que hacer el muro
//==========================================================================================================================
//Configuracion del tiempo:
//==========================================================================================================================
let start;
let end;
//==========================================================================================================================
//llamada inicial al bucle principal
system.run(gameTick);
//bucle principal
function gameTick() {
    const currentTime = system.currentTick;
    if (currentTime % FRECUENCY === 0) {
        //construccion del muro
        let players = world.getAllPlayers();
        for (let p of players) {
            processPlayer(p);
        }
        //aviso mitad del tiempo
        if (currentTime - start == (end - start) / 2) {
            world.sendMessage("Quedan " + Math.floor((((end - start) / 20) / 2) / 60) + " minutos para el final de la partida");
            world.sendMessage("Solo recibirán 1 barra de vida extra la gente que llegue a tiempo al centro");
        }
        //aviso distancia al centro
        else if (currentTime - start >= (end - start) * 3 / 4 || true) {
            for (let p of players) {
                let distx = Math.floor(Math.abs(p.location.x) - 148);
                let distz = Math.floor(Math.abs(p.location.z) - 148);
                if (distx > 0 && distz > 0) { //calculo de la diagonal
                    p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime) / 20 / 60 + 1) + " m "
                        + "| Distancia: " + Math.floor(Math.sqrt(distx * distx + distz * distz)) + " b");
                }
                else if (distx > 0) { //calculo distancia x
                    p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime) / 20 / 60 + 1) + " m "
                        + "| Distancia : " + distx + " b");
                }
                else if (distz > 0) { //calculo distancia z
                    p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime) / 20 / 60 + 1) + " m "
                        + "| Distancia: " + distz + " b");
                }
            }
        }
        //fin de la partida
        else if (currentTime == end) {
            for (let p of players) {
                p.runCommand("/title @s actionbar §l§4 Se ha acabado el tiempo");
            }
        }
        else {
            for (let p of players) {
                p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime) / 20 / 60) + " m ");
            }
        }
    }
    system.run(gameTick);
}
//actionListener de los eventos de los scripts (desuso)
system.afterEvents.scriptEventReceive.subscribe((event) => {
    world.sendMessage("ha llegado el evento " + event.id);
    world.sendMessage(" ");
    let params = event.message.split(" ");
    switch (event.id) {
        case "uhc:initialize":
            setLives(world.getAllPlayers()[0], 2);
            break;
    }
});
//actionListener de los eventos de muerte
world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity.typeId != "minecraft:player")
        return;
    processPlayerDie(event);
});
//actionListener de los eventos de spawn
world.afterEvents.playerSpawn.subscribe((event) => {
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
            spawnPoints = spreadPlayers(SIZE);
            initialize(spawnPoints, params[0]);
            start = system.currentTick - (system.currentTick % 20);
            end = start + (params[1] * 60 * 20);
            break;
    }
}
//# sourceMappingURL=main.js.map