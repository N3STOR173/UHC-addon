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
import { initialize, setLives, processPlayerDie, processPlayerSpawn } from "./extraLivesLogic";
import { timeMessage, setTime } from "./timeLogic";
//Configuracion del muro:
//==========================================================================================================================
export let size = 1500; //distancia a la que se hace el muro
export const HEIGHT = 200; //altura del muro (hata la coordenada y que llega)
export const STARTHEIGHT = -63; //altura desde la que empieza a hacer el muro
export const DIST = 100; //distancia a la que tiene que estar el jugador para que se haga el muro
export const BUILDDIST = 50; //distancia desde la del jugador a la que se empieza a hacer el muro
export const BLOCKTYPE = "minecraft:barrier"; //material del muro
const FRECUENCY = 20; //frecuencia con la que se comprueba si hay que hacer el muro
//==========================================================================================================================
//Variables de control:
//==========================================================================================================================
let start = false;
let stopMessages = false; //para evitar spam de mensajes al iniciar el juego
//==========================================================================================================================
//llamada inicial al bucle principal
system.run(gameTick);
//bucle principal
function gameTick() {
    if (system.currentTick % FRECUENCY === 0 && start) {
        //construccion del muro
        let players = world.getAllPlayers();
        for (let p of players) {
            processPlayer(p);
        }
        //mensajes de tiempo
        if (!stopMessages) {
            stopMessages = timeMessage();
            if (stopMessages) {
                size = 150;
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
            spawnPoints = spreadPlayers(size);
            initialize(spawnPoints, params[0]);
            const startTime = system.currentTick - (system.currentTick % 20);
            const endTime = startTime + (params[1] * 60 * 20);
            setTime(startTime, endTime);
            start = true;
            break;
    }
}
//# sourceMappingURL=main.js.map