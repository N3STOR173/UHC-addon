import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { windowController, controller } from "./main";
let phase = 1; // 1 = team selection, 2 = game settings
let seleccionMade = false;
let someoneChoosing = false;
let playerChoosing;
let lifes;
let time;
let playersConfirmed = new Set();
let playersNotConfirmed = new Set();
let proposer;
let firstTutorialSeen = new Set();
let secondTutorialSeen = new Set();
let ready = new Set();
let notReady = new Set();
let concurrentAux = 0;
function checkConcurrence(aux, player) {
    if (aux != concurrentAux) {
        player.runCommand("/title @s actionbar Alguien canceló y no se ha procesado tu selección");
        return true;
    }
    else {
        return false;
    }
}
function gameSettingsWindow(player) {
    if (seleccionMade) {
        const aux = concurrentAux;
        const confirm = new ActionFormData()
            .title("Configuración de la partida")
            .body("\nConfiguración de la partida propuesta por " + proposer + "\n\n"
            + "tiempo: " + time + " minutos\n"
            + "vidas: " + lifes + "\n"
            + buildBody());
        if (playersNotConfirmed.has(player.nameTag)) {
            confirm.button("confirmar");
        }
        confirm.button("cancelar");
        confirm.show(player).then((response) => {
            if (response.selection == 0) { //CONFIRMAR
                if (checkConcurrence(aux, player))
                    return;
                processConfirmSelection(player);
            }
            else if (response.selection == 1) { //CANCELAR
                if (checkConcurrence(aux, player))
                    return;
                concurrentAux++;
                seleccionMade = false;
                world.sendMessage("§4" + player.nameTag + " ha rechazado los ajustes propuestos");
            }
        });
    }
    else {
        if (!someoneChoosing) {
            someoneChoosing = true;
            playerChoosing = player.nameTag;
            const configurationWindow = new ModalFormData()
                .title("Configuración de la partida")
                .textField("\nDuración de la partida (en minutos)", "60", "60")
                .dropdown("\nNúmero de vidas", ["1", "2", "3", "4", "5"], 0);
            configurationWindow.show(player).then((response) => {
                var _a, _b;
                if (response.canceled) {
                    someoneChoosing = false;
                    return;
                }
                else {
                    time = Number((_b = (_a = response.formValues) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 0);
                    lifes = response.formValues && typeof response.formValues[1] === "number" ? response.formValues[1] + 1 : 1;
                    someoneChoosing = false;
                    if (!isNaN(time) && time > 0) {
                        seleccionMade = true;
                        proposer = player.nameTag;
                        world.getAllPlayers().forEach(p => {
                            playersNotConfirmed.add(p.nameTag);
                        });
                        playersConfirmed.clear();
                        world.getAllPlayers().forEach(p => {
                            gameSettingsWindow(p);
                        });
                        world.sendMessage(player.nameTag + " ha propuesto los ajustes de la partida, falta la confirmación por parte de los jugadores");
                    }
                    else {
                        player.sendMessage("Introduce un número válido para el tiempo de la partida");
                    }
                }
            });
        }
        else {
            const aviso = new ActionFormData()
                .title("Aviso")
                .body("\n" + playerChoosing + " está eligiendo una configuración de la partida, espera a que termine");
            aviso.show(player);
        }
    }
}
function processConfirmSelection(player) {
    playersConfirmed.add(player.nameTag);
    playersNotConfirmed.delete(player.nameTag);
    if (playersNotConfirmed.size == 0) {
        world.sendMessage("§2Todos los jugadores han confirmado la configuración de la partida");
        phase = 3;
        world.getAllPlayers().forEach(p => {
            notReady.add(p.nameTag);
        });
        world.getAllPlayers().forEach(p => {
            finalWindow(p);
        });
    }
}
function buildBody() {
    let body = "\n===============================\n";
    if (playersConfirmed.size > 0) {
        body += "\nJugadores confirmados:\n";
        playersConfirmed.forEach(p => {
            body += "- " + p + "\n";
        });
    }
    if (playersNotConfirmed.size > 0) {
        body += "\nJugadores no confirmados:\n";
        playersNotConfirmed.forEach(p => {
            body += "- " + p + "\n";
        });
    }
    body += "\n";
    return body;
}
function finalWindow(player) {
    const window = new ActionFormData()
        .title("UHC")
        .body(buildFinalBody());
    if (!ready.has(player.nameTag)) {
        window.button("LISTO");
    }
    window.show(player).then((response) => {
        if (response.selection == 0) {
            world.sendMessage(player.nameTag + " está listo para empezar la partida");
            ready.add(player.nameTag);
            notReady.delete(player.nameTag);
            if (notReady.size == 0) {
                controller("confirm", [lifes, time]);
            }
        }
    });
}
function buildFinalBody() {
    let body = "\nYa se han confirmado todos los ajustes de la partida, "
        + "cuando estés preparado pulsa listo\n\nReglas:\n"
        + "- El mapa tiene un tamaño de 3000 por 3000, y el centro al final de la partida de 300 por 300\n"
        + "- Si un jugador es eliminado por otro este no revivirá\n\n"
        + "Al final de la partida:\n"
        + "- Todos los jugadores deberán estar en el centro del mapa, "
        + "los que lleguen a tiempo recibirán una barra de vida extra\n"
        + "- Se te retirarán tus vidas adicionales pero a cambio se te dará una barra de vida por cada una restante\n"
        + "- Si no se llegara a tiempo se te teletransportará al centro del mapa, pero no se te dará la barra de vida\n";
    if (ready.size > 0) {
        body += "\n===============================\n\nJugadores preparados:\n";
    }
    for (let p of ready) {
        body += "- " + p + "\n";
    }
    body += "\n";
    return body;
}
export function mainMenu(player) {
    if (phase == 1) {
        if (firstTutorialSeen.has(player.nameTag)) {
            windowController("startWindow", [player]);
        }
        else {
            firstTutorialSeen.add(player.nameTag);
            const mainMenu = new ActionFormData()
                .title("UHC")
                .body("\nBienvenido a UHC:\n\nAntes de empezar la partida es necesario "
                + "que se elija en conjunto la configuración de la partida "
                + "y el formato de los equipos.\n\n"
                + "Primero alguien debe proponer una configuración y después el resto de jugadores "
                + "debe aceptar o rechazar la propuesta.\n\n")
                .button("comenzar con la selección de equipos");
            mainMenu.show(player).then((response) => {
                if (response.selection == 0) {
                    windowController("startWindow", [player]);
                }
            });
        }
    }
    else if (phase == 2) {
        if (secondTutorialSeen.has(player.nameTag)) {
            gameSettingsWindow(player);
        }
        else {
            secondTutorialSeen.add(player.nameTag);
            const mainMenu = new ActionFormData()
                .title("UHC")
                .body("\nYa formados los equipos ahora es necesario configurar "
                + "la duración de la partida y el número de vidas.\n\n")
                .button("comenzar con la configuración de la partida");
            mainMenu.show(player).then((response) => {
                if (response.selection == 0) {
                    gameSettingsWindow(player);
                }
            });
        }
    }
    else if (phase == 3) {
        finalWindow(player);
    }
}
export function teamsFormed() {
    phase = 2;
    world.getAllPlayers().forEach((player) => {
        mainMenu(player);
    });
}
//# sourceMappingURL=mainMenuWindows.js.map